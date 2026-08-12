import "server-only";

import { Service, Transactional } from "../decorators/service";
import { provide } from "../decorators/provider";
import { NotFoundError } from "../decorators/global";
import { PlanRepositoryProvider, PlanRepository } from "../repositories/planRepository";
import {
  ActualRepositoryProvider,
  ActualRepository,
} from "../repositories/actualRepository";
import { LockRepositoryProvider, LockRepository } from "../repositories/lockRepository";
import {
  CategoryRepositoryProvider,
  CategoryRepository,
} from "../repositories/categoryRepository";
import {
  ReportRepositoryProvider,
  ReportRepository,
} from "../repositories/reportRepository";
import { dateToMonth, monthsBetween, toNumber } from "../helpers/period";

/**
 * Plan vs actual.
 *
 * Two documented rules live here, and nowhere else:
 *
 *   Missing actual is 0. A $5,000 plan with nothing logged reads −5,000 and
 *   −100%, not a blank. `hasActual` carries the distinction so the UI can show
 *   "—" without the arithmetic changing — totals and the chart stay additive.
 *
 *   Plan of 0 gives a null percentage. There is no denominator, so the ratio is
 *   undefined rather than zero or Infinity. Storing 0 would make "no plan" and
 *   "exactly on plan" the same number.
 *
 * Sign convention: variance = actual − plan. Negative is UNDER plan.
 */

export type ReportRow = {
  categoryId: string;
  categoryName: string;
  month: string;
  plan: number;
  actual: number;
  variance: number;
  variancePct: number | null;
  hasActual: boolean;
  locked: boolean;
};

export type ReportMonthTotal = {
  month: string;
  plan: number;
  actual: number;
  variance: number;
};

export type ReportResult = {
  rows: ReportRow[];
  months: ReportMonthTotal[];
  totals: { plan: number; actual: number; variance: number };
};

function pct(plan: number, variance: number): number | null {
  return plan === 0 ? null : (variance / plan) * 100;
}

/** Cents, so summing two-decimal amounts cannot drift into 0.30000000000000004. */
function round(value: number): number {
  return Math.round(value * 100) / 100;
}

@Service({ name: "ReportService" })
export class ReportService {
  constructor(
    private readonly plans: PlanRepository = PlanRepositoryProvider.get(),
    private readonly actuals: ActualRepository = ActualRepositoryProvider.get(),
    private readonly locks: LockRepository = LockRepositoryProvider.get(),
    private readonly categories: CategoryRepository = CategoryRepositoryProvider.get(),
    private readonly reports: ReportRepository = ReportRepositoryProvider.get()
  ) {}

  /**
   * Whether a run reflects the data as it stands now.
   *
   * A version compare rather than a scan: every write bumps
   * `User.dataVersion`, so a run computed against an older value is known to be
   * behind without reading a single plan. Applies to every status, not just
   * READY — a failed run against stale data is worth retrying, and a failed run
   * against unchanged data is not.
   */
  async isCurrent(
    userId: string,
    run: { dataVersion: number }
  ): Promise<boolean> {
    return run.dataVersion === (await this.reports.currentDataVersion(userId));
  }

  async findRun(
    userId: string,
    query: { from: string; to: string; categoryId?: string }
  ) {
    return this.reports.findRun(userId, query.from, query.to, query.categoryId);
  }

  /** Resets the run for this query to PENDING and hands back its id to queue. */
  @Transactional()
  async claim(
    userId: string,
    query: { from: string; to: string; categoryId?: string }
  ) {
    const dataVersion = await this.reports.currentDataVersion(userId);

    return this.reports.claim({
      userId,
      from: query.from,
      to: query.to,
      categoryId: query.categoryId,
      dataVersion,
    });
  }

  /**
   * Computes a report from the underlying rows.
   *
   * Public because the worker calls it, and because it is the piece worth
   * testing on its own — the aggregation and the two edge cases are the whole
   * of the product rule, and they should be assertable without a queue.
   */
  async compute(
    userId: string,
    query: { from: string; to: string; categoryId?: string }
  ): Promise<ReportResult> {
    const [plans, actualSums, locks, categories] = await Promise.all([
      this.plans.listInRange(userId, query.from, query.to, query.categoryId),
      this.actuals.sumInRange(userId, query.from, query.to, query.categoryId),
      this.locks.listInRange(userId, query.from, query.to),
      // Fetched whole rather than per missing id: one small indexed read, and
      // spend against an archived category still needs its name.
      this.categories.list(userId),
    ]);

    const names = new Map(categories.map((category) => [category.id, category.name]));
    const lockedMonths = new Set(locks.map((lock) => dateToMonth(lock.periodMonth)));

    // Nested rather than a composite string key: a separator is one more thing
    // that has to be a character neither a cuid nor a month can contain.
    const actualByCategory = new Map<string, Map<string, number>>();
    for (const group of actualSums) {
      const month = dateToMonth(group.periodMonth);
      const forCategory = actualByCategory.get(group.categoryId) ?? new Map();

      forCategory.set(month, group._sum.amount ? toNumber(group._sum.amount) : 0);
      actualByCategory.set(group.categoryId, forCategory);
    }

    const rows: ReportRow[] = [];

    // A planned cell always produces a row, logged or not — that is what makes
    // a forgotten entry loud instead of invisible.
    for (const plan of plans) {
      const month = dateToMonth(plan.periodMonth);
      const forCategory = actualByCategory.get(plan.categoryId);

      const planAmount = toNumber(plan.amount);
      const hasActual = forCategory?.has(month) ?? false;
      const actual = forCategory?.get(month) ?? 0;
      const variance = round(actual - planAmount);

      // Consumed, so whatever survives this loop is spend with no target.
      forCategory?.delete(month);

      rows.push({
        categoryId: plan.categoryId,
        categoryName: plan.category.name,
        month,
        plan: planAmount,
        actual,
        variance,
        variancePct: pct(planAmount, variance),
        hasActual,
        locked: lockedMonths.has(month),
      });
    }

    // Spend against a category with no target is still spend. It lands with a
    // plan of 0, which is exactly the case that makes the percentage null.
    for (const [categoryId, byMonth] of actualByCategory) {
      for (const [month, actual] of byMonth) {
        rows.push({
          categoryId,
          categoryName: names.get(categoryId) ?? "Uncategorised",
          month,
          plan: 0,
          actual,
          variance: round(actual),
          variancePct: null,
          hasActual: true,
          locked: lockedMonths.has(month),
        });
      }
    }

    rows.sort(
      (a, b) =>
        a.month.localeCompare(b.month) || a.categoryName.localeCompare(b.categoryName)
    );

    // Every month in the range, including ones with no rows at all — the chart
    // needs a continuous axis, or a quiet month silently narrows it.
    const months: ReportMonthTotal[] = monthsBetween(query.from, query.to).map(
      (month) => {
        const inMonth = rows.filter((row) => row.month === month);
        const plan = round(inMonth.reduce((sum, row) => sum + row.plan, 0));
        const actual = round(inMonth.reduce((sum, row) => sum + row.actual, 0));

        return { month, plan, actual, variance: round(actual - plan) };
      }
    );

    const plan = round(months.reduce((sum, entry) => sum + entry.plan, 0));
    const actual = round(months.reduce((sum, entry) => sum + entry.actual, 0));

    return {
      rows,
      months,
      totals: { plan, actual, variance: round(actual - plan) },
    };
  }

  /**
   * Runs a claimed job and stores the answer.
   *
   * The version is read again after computing rather than reused from the
   * claim: a write that landed while this was running means the result is
   * already behind, and recording the older version would mark a stale answer
   * fresh.
   */
  @Transactional()
  async fulfil(userId: string, runId: string): Promise<void> {
    const run = await this.reports.findRunById(userId, runId);
    if (!run) throw new NotFoundError("Report run");

    await this.reports.markProcessing(runId);

    const result = await this.compute(userId, {
      from: dateToMonth(run.fromMonth),
      to: dateToMonth(run.toMonth),
      // "" is "every category"; the compute path wants undefined for that.
      categoryId: run.categoryId || undefined,
    });

    await this.reports.saveResult({
      runId,
      dataVersion: await this.reports.currentDataVersion(userId),
      totals: result.totals,
      rows: result.rows,
      months: result.months,
    });
  }

  async fail(runId: string, reason: string): Promise<void> {
    await this.reports.markFailed(runId, reason);
  }
}

export const ReportServiceProvider = provide(
  "ReportService",
  () => new ReportService()
);
