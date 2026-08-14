import "server-only";

import { Enum } from "../decorators/enum";
import { Model, toDTO, toMonthString } from "../decorators/model";
import { ReportStatus } from "../../../generated/prisma/client";
import type {
  Prisma,
  ReportRun as PrismaReportRun,
  ReportRow as PrismaReportRow,
  ReportMonth as PrismaReportMonth,
} from "../../../generated/prisma/client";

/**
 * The materialised report.
 *
 * A run is the answer to one query — `[user, from, to, category]` — computed off
 * the queue and stored, so the same two conversions the rest of the model layer
 * makes apply here too: `Decimal` to `number`, and `@db.Date` to `"YYYY-MM"`
 * read in UTC.
 *
 * `variancePct` is the one nullable amount in the schema, and it stays nullable
 * all the way out. Null means the plan was zero and the ratio is undefined —
 * collapsing it to 0 here would turn "there was no target" into "exactly on
 * target" at the layer furthest from anyone who could notice.
 */

function toNumber(value: Prisma.Decimal): number {
  return value.toNumber();
}

/** One category × month cell of a stored run. */
@Model<ReportRowModel>({ name: "ReportRow", months: ["periodMonth"] })
export class ReportRowModel {
  readonly id: string;
  readonly runId: string;
  readonly categoryId: string;
  readonly categoryName: string;
  readonly periodMonth: Date;
  readonly plan: number;
  readonly actual: number;
  readonly variance: number;
  readonly variancePct: number | null;
  readonly hasActual: boolean;
  readonly locked: boolean;

  constructor(row: PrismaReportRow) {
    this.id = row.id;
    this.runId = row.runId;
    this.categoryId = row.categoryId;
    this.categoryName = row.categoryName;
    this.periodMonth = row.periodMonth;
    this.plan = toNumber(row.plan);
    this.actual = toNumber(row.actual);
    this.variance = toNumber(row.variance);
    this.variancePct = row.variancePct === null ? null : toNumber(row.variancePct);
    this.hasActual = row.hasActual;
    this.locked = row.locked;
  }

  get month(): string {
    return toMonthString(this.periodMonth);
  }

  toJSON() {
    return toDTO(this);
  }
}

/** A month's totals across every category in the run. */
@Model<ReportMonthModel>({ name: "ReportMonth", months: ["periodMonth"] })
export class ReportMonthModel {
  readonly id: string;
  readonly runId: string;
  readonly periodMonth: Date;
  readonly plan: number;
  readonly actual: number;
  readonly variance: number;

  constructor(row: PrismaReportMonth) {
    this.id = row.id;
    this.runId = row.runId;
    this.periodMonth = row.periodMonth;
    this.plan = toNumber(row.plan);
    this.actual = toNumber(row.actual);
    this.variance = toNumber(row.variance);
  }

  get month(): string {
    return toMonthString(this.periodMonth);
  }

  toJSON() {
    return toDTO(this);
  }
}

/**
 * A stored run, with its rows and months when they were loaded.
 *
 * The relations are optional because both shapes are legitimate reads: the
 * report screen wants a run *with* its rows, and the history list wants forty
 * runs *without* them. Making them required would force the list to fetch a
 * full report per entry to render a summary that shows none of it.
 */
@Model<ReportRunModel>({
  name: "ReportRun",
  months: ["fromMonth", "toMonth"],
})
export class ReportRunModel {
  readonly id: string;
  readonly userId: string;
  readonly fromMonth: Date;
  readonly toMonth: Date;
  readonly categoryId: string;

  @Enum(ReportStatus)
  readonly status: ReportStatus;

  readonly error: string | null;
  readonly totalPlan: number;
  readonly totalActual: number;
  readonly totalVariance: number;
  readonly dataVersion: number;
  readonly requestedAt: Date;
  readonly computedAt: Date | null;

  readonly rows?: ReportRowModel[];
  readonly months?: ReportMonthModel[];

  constructor(
    row: PrismaReportRun & {
      rows?: PrismaReportRow[];
      months?: PrismaReportMonth[];
    }
  ) {
    this.id = row.id;
    this.userId = row.userId;
    this.fromMonth = row.fromMonth;
    this.toMonth = row.toMonth;
    this.categoryId = row.categoryId;
    this.status = row.status;
    this.error = row.error;
    this.totalPlan = toNumber(row.totalPlan);
    this.totalActual = toNumber(row.totalActual);
    this.totalVariance = toNumber(row.totalVariance);
    this.dataVersion = row.dataVersion;
    this.requestedAt = row.requestedAt;
    this.computedAt = row.computedAt;

    if (row.rows) this.rows = row.rows.map((r) => new ReportRowModel(r));
    if (row.months) this.months = row.months.map((m) => new ReportMonthModel(m));
  }

  get from(): string {
    return toMonthString(this.fromMonth);
  }

  get to(): string {
    return toMonthString(this.toMonth);
  }

  /** null out here, not "", because null is what the client's filter means. */
  get filterCategoryId(): string | null {
    return this.categoryId === "" ? null : this.categoryId;
  }

  get isReady(): boolean {
    return this.status === ReportStatus.READY;
  }

  /** Queued or running — the two states the client polls through. */
  get isInFlight(): boolean {
    return (
      this.status === ReportStatus.PENDING ||
      this.status === ReportStatus.PROCESSING
    );
  }

  /**
   * Whether this run still reflects the data. Takes the current version rather
   * than reading it, so the caller can compare a page of runs against one read.
   */
  isCurrent(dataVersion: number): boolean {
    return this.dataVersion === dataVersion;
  }

  /** Total variance as a percentage of plan, or null when nothing was planned. */
  get totalVariancePct(): number | null {
    return this.totalPlan === 0
      ? null
      : (this.totalVariance / this.totalPlan) * 100;
  }

  toJSON() {
    return toDTO(this);
  }
}
