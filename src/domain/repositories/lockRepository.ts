import "server-only";

import { db } from "../decorators/service";
import { provide } from "../decorators/provider";
import { Repository } from "../decorators/repository";
import { monthToDate } from "../helpers/period";
import { PeriodLockModel } from "../models/budgetModel";

/**
 * Period locks.
 *
 * A lock is a row's presence, not a flag — there is no `locked: false`. That
 * keeps "open" as the absence of a decision rather than a state something has
 * to be moved into, and makes unlocking a delete with nothing left behind.
 */
@Repository({ name: "LockRepository" })
export class LockRepository {
  async list(userId: string): Promise<PeriodLockModel[]> {
    const rows = await db().periodLock.findMany({
      where: { userId },
      orderBy: [{ periodMonth: "desc" }],
    });

    return rows.map((row) => new PeriodLockModel(row));
  }

  async listInRange(
    userId: string,
    from: string,
    to: string
  ): Promise<PeriodLockModel[]> {
    const rows = await db().periodLock.findMany({
      where: {
        userId,
        periodMonth: { gte: monthToDate(from), lte: monthToDate(to) },
      },
    });

    return rows.map((row) => new PeriodLockModel(row));
  }

  /**
   * The check every write goes through.
   *
   * One indexed lookup on the unique key, so putting it in front of every plan
   * and actual mutation costs a fraction of the write it guards.
   */
  async isLocked(userId: string, month: string): Promise<boolean> {
    const row = await db().periodLock.findUnique({
      where: {
        userId_periodMonth: { userId, periodMonth: monthToDate(month) },
      },
      select: { id: true },
    });

    return row !== null;
  }

  async lock(
    userId: string,
    month: string,
    note?: string | null
  ): Promise<PeriodLockModel> {
    const periodMonth = monthToDate(month);

    // Upsert rather than create: locking an already-locked month is a no-op the
    // user meant, not a 409 they have to interpret.
    const row = await db().periodLock.upsert({
      where: { userId_periodMonth: { userId, periodMonth } },
      create: { userId, periodMonth, note: note ?? null },
      update: { note: note ?? null },
    });

    return new PeriodLockModel(row);
  }

  async unlock(userId: string, month: string): Promise<boolean> {
    const { count } = await db().periodLock.deleteMany({
      where: { userId, periodMonth: monthToDate(month) },
    });

    return count > 0;
  }
}

export const LockRepositoryProvider = provide(
  "LockRepository",
  () => new LockRepository()
);
