import "server-only";

import { db } from "../decorators/service";
import { provide } from "../decorators/provider";
import { Repository } from "../decorators/repository";
import { monthToDate } from "../helpers/period";
import { ReportRunModel } from "../models/reportModel";
import { ReportStatus } from "../../../generated/prisma/client";

/**
 * Stored reports.
 *
 * A report is computed off the queue, so this is where the answer lives between
 * runs. The identity of a run is its query — `[userId, fromMonth, toMonth,
 * categoryId]` — which is what makes asking twice cheap: the second ask finds
 * the first run rather than starting another job for the same numbers.
 */
@Repository({ name: "ReportRepository" })
export class ReportRepository {
  async findRun(
    userId: string,
    from: string,
    to: string,
    categoryId?: string
  ): Promise<ReportRunModel | null> {
    const row = await db().reportRun.findUnique({
      where: {
        userId_fromMonth_toMonth_categoryId: {
          userId,
          fromMonth: monthToDate(from),
          toMonth: monthToDate(to),
          categoryId: categoryId ?? "",
        },
      },
      include: {
        rows: { orderBy: [{ periodMonth: "asc" }, { categoryName: "asc" }] },
        months: { orderBy: { periodMonth: "asc" } },
      },
    });

    return row && new ReportRunModel(row);
  }

  /**
   * Every range this user has asked for, most recently requested first.
   *
   * Deliberately without `rows` or `months`: this answers "what have I run",
   * and including the rows would pull a full report per entry to render a list
   * that shows none of them.
   *
   * Ordered by `requestedAt` rather than `computedAt` — the latter is null
   * until a run finishes, so ordering on it would either hide a pending run or
   * sort it to an arbitrary end.
   */
  async listRuns(userId: string, limit: number): Promise<ReportRunModel[]> {
    const rows = await db().reportRun.findMany({
      where: { userId },
      orderBy: { requestedAt: "desc" },
      take: limit,
    });

    return rows.map((row) => new ReportRunModel(row));
  }

  async findRunById(
    userId: string,
    runId: string
  ): Promise<ReportRunModel | null> {
    const row = await db().reportRun.findFirst({
      where: { id: runId, userId },
      include: {
        rows: { orderBy: [{ periodMonth: "asc" }, { categoryName: "asc" }] },
        months: { orderBy: { periodMonth: "asc" } },
      },
    });

    return row && new ReportRunModel(row);
  }

  /**
   * Claims a run for this query, resetting it to PENDING.
   *
   * Upsert, because the caller has just decided the stored answer is missing or
   * stale and either way wants one job for this key — not a second row beside
   * the first.
   */
  async claim(input: {
    userId: string;
    from: string;
    to: string;
    categoryId?: string;
    dataVersion: number;
  }): Promise<ReportRunModel> {
    const key = {
      userId: input.userId,
      fromMonth: monthToDate(input.from),
      toMonth: monthToDate(input.to),
      categoryId: input.categoryId ?? "",
    };

    const row = await db().reportRun.upsert({
      where: { userId_fromMonth_toMonth_categoryId: key },
      create: { ...key, status: ReportStatus.PENDING, dataVersion: input.dataVersion },
      update: {
        status: ReportStatus.PENDING,
        error: null,
        dataVersion: input.dataVersion,
        requestedAt: new Date(),
      },
    });

    return new ReportRunModel(row);
  }

  async markProcessing(runId: string): Promise<void> {
    await db().reportRun.update({
      where: { id: runId },
      data: { status: ReportStatus.PROCESSING, error: null },
    });
  }

  async markFailed(runId: string, reason: string): Promise<void> {
    await db().reportRun.update({
      where: { id: runId },
      data: { status: ReportStatus.FAILED, error: reason },
    });
  }

  /**
   * Writes a finished report.
   *
   * Rows and months are replaced wholesale rather than diffed — a recompute is
   * a new answer, and reconciling it line by line would be more code guarding
   * against a state (partly-old, partly-new rows) that must never be readable
   * anyway. Callers run this inside `@Transactional()`, so the delete and the
   * insert land together or not at all.
   */
  async saveResult(input: {
    runId: string;
    dataVersion: number;
    totals: { plan: number; actual: number; variance: number };
    rows: Array<{
      categoryId: string;
      categoryName: string;
      month: string;
      plan: number;
      actual: number;
      variance: number;
      variancePct: number | null;
      hasActual: boolean;
      locked: boolean;
    }>;
    months: Array<{
      month: string;
      plan: number;
      actual: number;
      variance: number;
    }>;
  }): Promise<void> {
    await db().reportRow.deleteMany({ where: { runId: input.runId } });
    await db().reportMonth.deleteMany({ where: { runId: input.runId } });

    if (input.rows.length > 0) {
      await db().reportRow.createMany({
        data: input.rows.map((row) => ({
          runId: input.runId,
          categoryId: row.categoryId,
          categoryName: row.categoryName,
          periodMonth: monthToDate(row.month),
          plan: row.plan,
          actual: row.actual,
          variance: row.variance,
          variancePct: row.variancePct,
          hasActual: row.hasActual,
          locked: row.locked,
        })),
      });
    }

    if (input.months.length > 0) {
      await db().reportMonth.createMany({
        data: input.months.map((entry) => ({
          runId: input.runId,
          periodMonth: monthToDate(entry.month),
          plan: entry.plan,
          actual: entry.actual,
          variance: entry.variance,
        })),
      });
    }

    await db().reportRun.update({
      where: { id: input.runId },
      data: {
        status: ReportStatus.READY,
        error: null,
        dataVersion: input.dataVersion,
        totalPlan: input.totals.plan,
        totalActual: input.totals.actual,
        totalVariance: input.totals.variance,
        computedAt: new Date(),
      },
    });
  }

  async currentDataVersion(userId: string): Promise<number> {
    const row = await db().user.findUnique({
      where: { Id: userId },
      select: { dataVersion: true },
    });

    return row?.dataVersion ?? 0;
  }

  /**
   * Marks every stored report for this user as out of date.
   *
   * One counter for the whole user rather than per-range invalidation. Coarse
   * on purpose: working out which ranges a January actual touches means
   * scanning every run, and at this app's scale recomputing a report nobody
   * asked for again is cheaper than the bookkeeping to avoid it.
   */
  async bumpDataVersion(userId: string): Promise<number> {
    const row = await db().user.update({
      where: { Id: userId },
      data: { dataVersion: { increment: 1 } },
      select: { dataVersion: true },
    });

    return row.dataVersion;
  }
}

export const ReportRepositoryProvider = provide(
  "ReportRepository",
  () => new ReportRepository()
);
