import "server-only";

import type {
  ActualModel,
  CategoryModel,
  PeriodLockModel,
  PlanModel,
} from "../models/budgetModel";
import type { ReportRunModel } from "../models/reportModel";
import type { UserWithFootprintModel } from "../models/userModel";
import type { PlatformOverview } from "../models/adminModel";
import type {
  Actual,
  AdminOverview,
  AdminUser,
  Category,
  PeriodLock,
  Plan,
  ReportResponse,
  ReportRunSummary,
  Role,
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
 * These take models, not Prisma rows. `Decimal` to `number` and `@db.Date` to
 * `"YYYY-MM"` both happen once, in the model layer, so what is left here is
 * only the reshaping: picking the fields the client is allowed to see and
 * rendering timestamps as ISO strings.
 *
 * That split is the point. A model is the row as the server understands it; a
 * wire type is the subset the client is promised. Keeping both means adding a
 * column does not silently widen the API.
 */

export function toCategory(model: CategoryModel): Category {
  return {
    id: model.id,
    name: model.name,
    archivedAt: model.archivedAt?.toISOString() ?? null,
    createdAt: model.createdAt.toISOString(),
  };
}

export function toPlan(model: PlanModel): Plan {
  return {
    id: model.id,
    categoryId: model.categoryId,
    month: model.month,
    amount: model.amount,
  };
}

export function toActual(model: ActualModel): Actual {
  return {
    id: model.id,
    categoryId: model.categoryId,
    month: model.month,
    amount: model.amount,
    note: model.note,
    createdAt: model.createdAt.toISOString(),
  };
}

export function toLock(model: PeriodLockModel): PeriodLock {
  return {
    id: model.id,
    month: model.month,
    lockedAt: model.lockedAt.toISOString(),
    note: model.note,
  };
}

/**
 * A stored run, with its rows, as the report response the client renders.
 *
 * `rows` and `months` are optional on the model because the history list reads
 * runs without them. Defaulting to empty here rather than demanding they be
 * present is also correct on its own terms: a finished run over a range with no
 * plans and no actuals genuinely has no rows.
 */
export function toReport(run: ReportRunModel): ReportResponse {
  return {
    from: run.from,
    to: run.to,
    rows: (run.rows ?? []).map((row) => ({
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      month: row.month,
      plan: row.plan,
      actual: row.actual,
      variance: row.variance,
      // Null survives the round trip: it means the plan was 0 and the ratio is
      // undefined, which the UI renders "N/A".
      variancePct: row.variancePct,
      hasActual: row.hasActual,
      locked: row.locked,
    })),
    byMonth: (run.months ?? []).map((entry) => ({
      month: entry.month,
      plan: entry.plan,
      actual: entry.actual,
      variance: entry.variance,
    })),
    totals: {
      plan: run.totalPlan,
      actual: run.totalActual,
      variance: run.totalVariance,
      variancePct: run.totalVariancePct,
    },
  };
}

/**
 * A stored run as a history entry — what was asked for, not the answer.
 *
 * `stale` is resolved here rather than left to the client because staleness is
 * a comparison against `User.dataVersion`, which is server state the client
 * has no other reason to know.
 */
export function toReportRunSummary(
  run: ReportRunModel,
  currentDataVersion: number
): ReportRunSummary {
  return {
    id: run.id,
    from: run.from,
    to: run.to,
    categoryId: run.filterCategoryId,
    status: run.status.toLowerCase() as Lowercase<ReportStatus>,
    stale: !run.isCurrent(currentDataVersion),
    totals: {
      plan: run.totalPlan,
      actual: run.totalActual,
      variance: run.totalVariance,
      variancePct: run.totalVariancePct,
    },
    requestedAt: run.requestedAt.toISOString(),
    computedAt: run.computedAt?.toISOString() ?? null,
  };
}

/** What the client polls on while a run is still being computed. */
export type ReportPending = {
  status: Lowercase<ReportStatus>;
  runId: string;
  error?: string | null;
};

/* ------------------------------------------------------------------- admin */

/**
 * A user as the admin console is allowed to see them.
 *
 * The narrowing this function performs is the security boundary, not a
 * convenience: `UserWithFootprintModel` still carries `passwordHash`, because a
 * model is the row as the server understands it. Listing the fields out by hand
 * is what stops a column added to `User` next month from arriving on an admin
 * screen because nobody remembered to exclude it.
 */
export function toAdminUser(model: UserWithFootprintModel): AdminUser {
  return {
    id: model.Id,
    firstName: model.FName,
    lastName: model.LName,
    email: model.Email,
    avatarUrl: model.AvatarUrl,
    role: model.Role as Role,
    // The stamp itself is not published — whether it is set is the whole of
    // what the console asks.
    verified: model.isVerified,
    providers: model.providers,
    hasPassword: model.hasPassword,
    createdAt: model.createdAt.toISOString(),
    lastEntryAt: model.lastEntryAt?.toISOString() ?? null,
    footprint: model.footprint,
  };
}

export function toAdminOverview(
  overview: PlatformOverview & { activeUsers: number }
): AdminOverview {
  return {
    users: overview.users,
    activeUsers: overview.activeUsers,
    signups: overview.signups,
    workspace: overview.workspace,
    queue: overview.queue,
    failures: overview.failures.map((failure) => ({
      id: failure.id,
      userEmail: failure.userEmail,
      from: failure.from,
      to: failure.to,
      error: failure.error,
      requestedAt: failure.requestedAt.toISOString(),
    })),
  };
}
