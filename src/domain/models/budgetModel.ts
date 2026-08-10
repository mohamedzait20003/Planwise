import "server-only";

import { Model, toDTO, toMonthString } from "../decorators/model";
import type {
  Category as PrismaCategory,
  Plan as PrismaPlan,
  Actual as PrismaActual,
  PeriodLock as PrismaPeriodLock,
  ImportBatch as PrismaImportBatch,
  Prisma,
} from "../../../generated/prisma/client";

/**
 * Models for the plan-vs-actual core.
 *
 * Two conversions happen here and nowhere else:
 *
 *  - `Prisma.Decimal` -> `number`. Decimal is not JSON-serializable, so an
 *    amount handed straight to a Client Component arrives as `{}`. Money is
 *    stored as Decimal(14,2) precisely so arithmetic is exact; it is converted
 *    only at the boundary, after the database has done the summing.
 *
 *  - `@db.Date` -> `"YYYY-MM"`. The column is a bare date pinned to the 1st.
 *    Formatting it with local getters would render 2026-01-01 as "2025-12" west
 *    of UTC, so `toMonthString` reads UTC parts.
 */

function decimalToNumber(value: Prisma.Decimal): number {
  return value.toNumber();
}

@Model<CategoryModel>({ name: "Category" })
export class CategoryModel {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly archivedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(row: PrismaCategory) {
    this.id = row.id;
    this.userId = row.userId;
    this.name = row.name;
    this.archivedAt = row.archivedAt;
    this.createdAt = row.createdAt;
    this.updatedAt = row.updatedAt;
  }

  /** Archived categories stay in historical reports but leave the pickers. */
  get isArchived(): boolean {
    return this.archivedAt !== null;
  }

  toJSON() {
    return toDTO(this);
  }
}

/** A monthly target. One per category per month — enforced by a unique index. */
@Model<PlanModel>({ name: "Plan", months: ["periodMonth"] })
export class PlanModel {
  readonly id: string;
  readonly userId: string;
  readonly categoryId: string;
  readonly periodMonth: Date;
  readonly amount: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(row: PrismaPlan) {
    this.id = row.id;
    this.userId = row.userId;
    this.categoryId = row.categoryId;
    this.periodMonth = row.periodMonth;
    this.amount = decimalToNumber(row.amount);
    this.createdAt = row.createdAt;
    this.updatedAt = row.updatedAt;
  }

  get month(): string {
    return toMonthString(this.periodMonth);
  }

  toJSON() {
    return toDTO(this);
  }
}

/**
 * A single logged spend. Unlike a plan there may be many per category-month —
 * actuals are a ledger, summed at report time, which is what makes the
 * drill-down view possible.
 */
@Model<ActualModel>({ name: "Actual", months: ["periodMonth"] })
export class ActualModel {
  readonly id: string;
  readonly userId: string;
  readonly categoryId: string;
  readonly periodMonth: Date;
  readonly amount: number;
  readonly note: string | null;
  readonly importBatchId: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(row: PrismaActual) {
    this.id = row.id;
    this.userId = row.userId;
    this.categoryId = row.categoryId;
    this.periodMonth = row.periodMonth;
    this.amount = decimalToNumber(row.amount);
    this.note = row.note;
    this.importBatchId = row.importBatchId;
    this.createdAt = row.createdAt;
    this.updatedAt = row.updatedAt;
  }

  get month(): string {
    return toMonthString(this.periodMonth);
  }

  /** Provenance is derived, never stored — see the schema notes. */
  get wasImported(): boolean {
    return this.importBatchId !== null;
  }

  toJSON() {
    return toDTO(this);
  }
}

/** A closed month. The row existing is the lock; absence means open. */
@Model<PeriodLockModel>({ name: "PeriodLock", months: ["periodMonth"] })
export class PeriodLockModel {
  readonly id: string;
  readonly userId: string;
  readonly periodMonth: Date;
  readonly lockedAt: Date;
  readonly note: string | null;

  constructor(row: PrismaPeriodLock) {
    this.id = row.id;
    this.userId = row.userId;
    this.periodMonth = row.periodMonth;
    this.lockedAt = row.lockedAt;
    this.note = row.note;
  }

  get month(): string {
    return toMonthString(this.periodMonth);
  }

  toJSON() {
    return toDTO(this);
  }
}

@Model<ImportBatchModel>({ name: "ImportBatch" })
export class ImportBatchModel {
  readonly id: string;
  readonly userId: string;
  readonly filename: string;
  readonly rowsAccepted: number;
  readonly rowsRejected: number;
  readonly createdAt: Date;

  constructor(row: PrismaImportBatch) {
    this.id = row.id;
    this.userId = row.userId;
    this.filename = row.filename;
    this.rowsAccepted = row.rowsAccepted;
    this.rowsRejected = row.rowsRejected;
    this.createdAt = row.createdAt;
  }

  get totalRows(): number {
    return this.rowsAccepted + this.rowsRejected;
  }

  toJSON() {
    return toDTO(this);
  }
}
