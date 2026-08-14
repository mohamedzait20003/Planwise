import "server-only";

import { parse } from "csv-parse/sync";

import { Service, Transactional } from "../decorators/service";
import { provide } from "../decorators/provider";
import { NotFoundError, ValidationError } from "../decorators/global";
import {
  ActualRepositoryProvider,
  ActualRepository,
} from "../repositories/actualRepository";
import {
  CategoryRepositoryProvider,
  CategoryRepository,
} from "../repositories/categoryRepository";
import {
  ReportRepositoryProvider,
  ReportRepository,
} from "../repositories/reportRepository";
import { CategoryServiceProvider, CategoryService } from "./categoryService";
import { LockServiceProvider, LockService } from "./lockService";
import { isMonth } from "../helpers/period";


export type ImportRowError = {
  line: number;
  raw: string;
  reason: string;
};

export type ImportResult = {
  accepted: number;
  rejected: number;
  errors: ImportRowError[];
};

const MAX_IMPORT_ROWS = 5_000;

@Service({ name: "ActualService" })
export class ActualService {
  constructor(
    private readonly actuals: ActualRepository = ActualRepositoryProvider.get(),
    private readonly categoryRepo: CategoryRepository = CategoryRepositoryProvider.get(),
    private readonly categories: CategoryService = CategoryServiceProvider.get(),
    private readonly locks: LockService = LockServiceProvider.get(),
    private readonly reports: ReportRepository = ReportRepositoryProvider.get()
  ) { }

  async list(userId: string, month?: string, categoryId?: string) {
    return this.actuals.list(userId, month, categoryId);
  }

  @Transactional()
  async create(
    userId: string,
    input: { categoryId: string; month: string; amount: number; note?: string | null }
  ) {
    await this.locks.assertOpen(userId, input.month);
    await this.categories.requireWritable(userId, input.categoryId);

    const created = await this.actuals.create({ userId, ...input });
    await this.reports.bumpDataVersion(userId);

    return created;
  }

  @Transactional()
  async update(
    userId: string,
    id: string,
    input: {
      categoryId?: string;
      month?: string;
      amount?: number;
      note?: string | null;
    }
  ) {
    const existing = await this.actuals.findById(userId, id);
    if (!existing) throw new NotFoundError("Actual");

    await this.locks.assertOpen(userId, existing.month);
    if (input.month !== undefined) {
      await this.locks.assertOpen(userId, input.month);
    }
    if (input.categoryId !== undefined) {
      await this.categories.requireWritable(userId, input.categoryId);
    }

    const updated = await this.actuals.update(userId, id, input);
    if (!updated) throw new NotFoundError("Actual");

    await this.reports.bumpDataVersion(userId);
    return updated;
  }

  @Transactional()
  async delete(userId: string, id: string): Promise<void> {
    const existing = await this.actuals.findById(userId, id);
    if (!existing) throw new NotFoundError("Actual");

    await this.locks.assertOpen(userId, existing.month);

    await this.actuals.delete(userId, id);
    await this.reports.bumpDataVersion(userId);
  }

  @Transactional()
  async importCsv(userId: string, csv: string): Promise<ImportResult> {
    const rows = readCsv(csv);
    if (rows.length === 0) {
      throw new ValidationError("The file is empty");
    }

    const columns = readHeader(rows[0].cells);
    const body = rows.slice(1);

    if (body.length === 0) {
      throw new ValidationError("The file has a header but no rows");
    }

    if (body.length > MAX_IMPORT_ROWS) {
      throw new ValidationError(
        `The file has ${body.length} rows; the limit is ${MAX_IMPORT_ROWS}`
      );
    }

    // One lookup for every name in the file rather than one per row.
    const names = [
      ...new Set(
        body.map((row) => row.cells[columns.category]?.trim()).filter(Boolean)
      ),
    ] as string[];

    const found = await this.categoryRepo.findByNames(userId, names);
    const byName = new Map(found.map((c) => [c.name.toLowerCase(), c.id]));

    const lockedMonths = new Map<string, boolean>();

    const errors: ImportRowError[] = [];
    const accepted: Array<{
      userId: string;
      categoryId: string;
      month: string;
      amount: number;
    }> = [];

    for (const { cells, line, raw } of body) {
      const row = parseImportRow(cells, columns, byName);
      if (!row.ok) {
        errors.push({ line, raw, reason: row.reason });
        continue;
      }

      if (!lockedMonths.has(row.month)) {
        lockedMonths.set(row.month, await this.isLocked(userId, row.month));
      }

      if (lockedMonths.get(row.month)) {
        errors.push({ line, raw, reason: `${row.month} is locked` });
        continue;
      }

      accepted.push({
        userId,
        categoryId: row.categoryId,
        month: row.month,
        amount: row.amount,
      });
    }

    const inserted = await this.actuals.createMany(accepted);
    if (inserted > 0) await this.reports.bumpDataVersion(userId);

    return { accepted: inserted, rejected: errors.length, errors };
  }

  private async isLocked(userId: string, month: string): Promise<boolean> {
    try {
      await this.locks.assertOpen(userId, month);
      return false;
    } catch {
      return true;
    }
  }
}

type RawRow = {
  cells: string[];
  line: number;
  raw: string;
};

export function readCsv(csv: string): RawRow[] {
  try {
    const parsed = parse(csv, {
      bom: true,
      skip_empty_lines: true,
      relax_column_count: true,
      trim: true,
      raw: true,
      info: true,
    }) as unknown as Array<{
      record: string[];
      raw?: string;
      info: { lines: number };
    }>;

    return parsed.map((entry) => ({
      cells: entry.record,
      line: entry.info.lines,
      raw: entry.raw ?? entry.record.join(","),
    }));
  } catch (cause) {
    throw new ValidationError(
      "The file could not be read as CSV. Check for an unclosed quote.",
      cause
    );
  }
}

const COLUMNS = ["month", "category", "amount"] as const;
type Column = (typeof COLUMNS)[number];
type ColumnIndex = Record<Column, number>;

export function readHeader(cells: string[]): ColumnIndex {
  const labels = cells.map((cell) => cell.trim().toLowerCase()).filter((label) => label !== "");

  const known = new Set<string>(COLUMNS);
  const missing = COLUMNS.filter((column) => !labels.includes(column));
  const unexpected = labels.filter((label) => !known.has(label));
  const duplicated = labels.filter(
    (label, index) => labels.indexOf(label) !== index
  );

  const faults: string[] = [];
  if (missing.length > 0) faults.push(`missing ${missing.join(", ")}`);
  if (unexpected.length > 0) faults.push(`unexpected ${unexpected.join(", ")}`);
  if (duplicated.length > 0) faults.push(`repeated ${duplicated.join(", ")}`);

  if (faults.length > 0) {
    throw new ValidationError(
      `The first row must be a header naming exactly month, category and amount ` +
        `(in any order) — ${faults.join("; ")}`
    );
  }

  return {
    month: labels.indexOf("month"),
    category: labels.indexOf("category"),
    amount: labels.indexOf("amount"),
  };
}

type ParsedImportRow = { ok: true; categoryId: string; month: string; amount: number } | { ok: false; reason: string };

export function parseImportRow(
  cells: string[],
  columns: ColumnIndex,
  byName: Map<string, string>
): ParsedImportRow {
  const month = cells[columns.month]?.trim() ?? "";
  if (!isMonth(month)) {
    return { ok: false, reason: `"${month}" is not a month like 2026-01` };
  }

  const name = cells[columns.category]?.trim() ?? "";
  const categoryId = byName.get(name.toLowerCase());
  if (!categoryId) {
    return { ok: false, reason: `no active category named "${name}"` };
  }

  const rawAmount = cells[columns.amount]?.trim() ?? "";
  const amount = Number(rawAmount);
  if (rawAmount === "" || !Number.isFinite(amount) || amount < 0) {
    return { ok: false, reason: `"${rawAmount}" is not an amount` };
  }

  return {
    ok: true,
    categoryId,
    month,
    amount: Math.round(amount * 100) / 100,
  };
}

export const ActualServiceProvider = provide(
  "ActualService",
  () => new ActualService()
);
