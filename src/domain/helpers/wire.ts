import "server-only";

import { dateToMonth, toNumber } from "./period";
import type {
  Actual,
  Category,
  PeriodLock,
  Plan,
  ReportResponse,
} from "@/lib/api/types";
import type { ReportStatus } from "../../../generated/prisma/client";

/**
 * Prisma rows → the shapes the client already expects.
 *
 * The wire types are imported from `@/lib/api/types` rather than redeclared, so
 * there is exactly one definition of what an endpoint returns and the compiler
 * catches a drift between the two sides instead of the UI rendering
 * `undefined`.
 *
 * Two conversions happen here and nowhere else. `Decimal` becomes a number,
 * because Decimal is not JSON-serializable and would arrive as an object the
 * client cannot add up. `@db.Date` becomes "YYYY-MM", because a Date crossing
 * the boundary as an ISO string invites the client to parse it in local time
 * and land in the previous month.
 */

type Row = { toString(): string };

export function toCategory(row: {
  id: string;
  name: string;
  archivedAt: Date | null;
  createdAt: Date;
}): Category {
  return {
    id: row.id,
    name: row.name,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toPlan(row: {
  id: string;
  categoryId: string;
  periodMonth: Date;
  amount: Row;
}): Plan {
  return {
    id: row.id,
    categoryId: row.categoryId,
    month: dateToMonth(row.periodMonth),
    amount: toNumber(row.amount),
  };
}

export function toActual(row: {
  id: string;
  categoryId: string;
  periodMonth: Date;
  amount: Row;
  note: string | null;
  createdAt: Date;
}): Actual {
  return {
    id: row.id,
    categoryId: row.categoryId,
    month: dateToMonth(row.periodMonth),
    amount: toNumber(row.amount),
    note: row.note,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toLock(row: {
  id: string;
  periodMonth: Date;
  lockedAt: Date;
  note: string | null;
}): PeriodLock {
  return {
    id: row.id,
    month: dateToMonth(row.periodMonth),
    lockedAt: row.lockedAt.toISOString(),
    note: row.note,
  };
}

/** A stored run, with its rows, as the report response the client renders. */
export function toReport(run: {
  fromMonth: Date;
  toMonth: Date;
  totalPlan: Row;
  totalActual: Row;
  totalVariance: Row;
  rows: Array<{
    categoryId: string;
    categoryName: string;
    periodMonth: Date;
    plan: Row;
    actual: Row;
    variance: Row;
    variancePct: Row | null;
    hasActual: boolean;
    locked: boolean;
  }>;
  months: Array<{
    periodMonth: Date;
    plan: Row;
    actual: Row;
    variance: Row;
  }>;
}): ReportResponse {
  const plan = toNumber(run.totalPlan);
  const variance = toNumber(run.totalVariance);

  return {
    from: dateToMonth(run.fromMonth),
    to: dateToMonth(run.toMonth),
    rows: run.rows.map((row) => ({
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      month: dateToMonth(row.periodMonth),
      plan: toNumber(row.plan),
      actual: toNumber(row.actual),
      variance: toNumber(row.variance),
      // Null survives the round trip: it means the plan was 0 and the ratio is
      // undefined, which the UI renders "N/A".
      variancePct: row.variancePct === null ? null : toNumber(row.variancePct),
      hasActual: row.hasActual,
      locked: row.locked,
    })),
    byMonth: run.months.map((entry) => ({
      month: dateToMonth(entry.periodMonth),
      plan: toNumber(entry.plan),
      actual: toNumber(entry.actual),
      variance: toNumber(entry.variance),
    })),
    totals: {
      plan,
      actual: toNumber(run.totalActual),
      variance,
      variancePct: plan === 0 ? null : (variance / plan) * 100,
    },
  };
}

/** What the client polls on while a run is still being computed. */
export type ReportPending = {
  status: Lowercase<ReportStatus>;
  runId: string;
  error?: string | null;
};
