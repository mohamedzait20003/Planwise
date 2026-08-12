import "server-only";

import { db } from "../decorators/service";
import { provide } from "../decorators/provider";
import { Repository } from "../decorators/repository";
import { monthToDate } from "../helpers/period";

/**
 * Period locks.
 *
 * A lock is a row's presence, not a flag — there is no `locked: false`. That
 * keeps "open" as the absence of a decision rather than a state something has
 * to be moved into, and makes unlocking a delete with nothing left behind.
 */
@Repository({ name: "LockRepository" })
export class LockRepository {
  async list(userId: string) {
    return db().periodLock.findMany({
      where: { userId },
      orderBy: [{ periodMonth: "desc" }],
    });
  }

  async listInRange(userId: string, from: string, to: string) {
    return db().periodLock.findMany({
      where: {
        userId,
        periodMonth: { gte: monthToDate(from), lte: monthToDate(to) },
      },
    });
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

  async lock(userId: string, month: string, note?: string | null) {
    const periodMonth = monthToDate(month);

    // Upsert rather than create: locking an already-locked month is a no-op the
    // user meant, not a 409 they have to interpret.
    return db().periodLock.upsert({
      where: { userId_periodMonth: { userId, periodMonth } },
      create: { userId, periodMonth, note: note ?? null },
      update: { note: note ?? null },
    });
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
