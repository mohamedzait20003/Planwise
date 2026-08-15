import "server-only";

import { db } from "../decorators/service";
import { provide } from "../decorators/provider";
import { Repository } from "../decorators/repository";
import { dateToMonth } from "../helpers/period";
import type { FailedRun, QueueTotals, WorkspaceTotals } from "../models/adminModel";
import { ReportStatus } from "../../../generated/prisma/client";

/**
 * Platform-wide aggregates, across every workspace.
 *
 * This is the one repository whose queries are **not** scoped by `userId`, and
 * that is the entire reason it exists as a separate class rather than as more
 * methods on `CategoryRepository` and friends. Those take `userId` as their
 * first argument on purpose — it is what makes ownership a property of the
 * query rather than of the caller's good intentions. Adding an unscoped
 * `countAll()` beside them would put a method that ignores ownership one
 * autocomplete away from every method that enforces it.
 *
 * Keeping them here means the unscoped reads are a single file to audit, and
 * they are reachable only through `AdminService`, which is only reachable
 * through `Auth("ADMIN")`.
 *
 * Every method returns a count, a status or a timestamp. None returns an
 * amount — see `UserFootprint` for why that line is drawn where it is.
 */
@Repository({ name: "AdminRepository" })
export class AdminRepository {
  /**
   * What exists across every workspace.
   *
   * One `$transaction` so the four figures describe the same instant. They are
   * shown side by side, and a plan counted before an import with the categories
   * counted after it would put the dashboard's own numbers at odds.
   */
  async workspaceTotals(): Promise<WorkspaceTotals> {
    const [categories, plans, actuals, lockedMonths] = await db().$transaction([
      db().category.count(),
      db().plan.count(),
      // Live rows only, matching what every user-facing read filters to.
      db().actual.count({ where: { deletedAt: null } }),
      db().periodLock.count(),
    ]);

    return { categories, plans, actuals, lockedMonths };
  }

  /**
   * Report runs by status.
   *
   * A `groupBy` rather than four counts: the queue's whole state is one indexed
   * read, and a status carrying no runs is simply absent from the result, which
   * is why the caller starts from a zeroed record rather than trusting the
   * shape of what comes back.
   */
  async queueTotals(): Promise<QueueTotals> {
    const groups = await db().reportRun.groupBy({
      by: ["status"],
      _count: { _all: true },
    });

    const totals: QueueTotals = {
      pending: 0,
      processing: 0,
      ready: 0,
      failed: 0,
    };

    for (const group of groups) {
      totals[group.status.toLowerCase() as Lowercase<ReportStatus>] =
        group._count._all;
    }

    return totals;
  }

  /**
   * The most recent failed runs, newest first.
   *
   * The range comes along because it is what makes a failure reproducible, and
   * the owner's email because they are who has to be told. The run's stored
   * totals do not: on a failed run they are zeroes, and on any run they are the
   * user's business rather than an operator's.
   */
  async recentFailures(limit: number): Promise<FailedRun[]> {
    const rows = await db().reportRun.findMany({
      where: { status: ReportStatus.FAILED },
      orderBy: { requestedAt: "desc" },
      take: limit,
      select: {
        id: true,
        fromMonth: true,
        toMonth: true,
        error: true,
        requestedAt: true,
        user: { select: { Email: true } },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      userEmail: row.user.Email,
      // Read in UTC through the shared helper, for the same reason every other
      // month conversion goes through it.
      from: dateToMonth(row.fromMonth),
      to: dateToMonth(row.toMonth),
      error: row.error,
      requestedAt: row.requestedAt,
    }));
  }

  /**
   * How many distinct users have logged an entry since `since`.
   *
   * `distinct` on a `findMany` selecting one column rather than a `groupBy`:
   * the question is how many users appear, not what each of them did, and the
   * rows are discarded either way.
   */
  async activeUsersSince(since: Date): Promise<number> {
    const rows = await db().actual.findMany({
      where: { deletedAt: null, createdAt: { gte: since } },
      distinct: ["userId"],
      select: { userId: true },
    });

    return rows.length;
  }
}

export const AdminRepositoryProvider = provide(
  "AdminRepository",
  () => new AdminRepository()
);
