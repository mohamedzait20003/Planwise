import "server-only";

import { Service, Transactional } from "../decorators/service";
import { provide } from "../decorators/provider";
import { NotFoundError, PeriodLockedError } from "../decorators/global";
import { LockRepositoryProvider, LockRepository } from "../repositories/lockRepository";
import {
  ReportRepositoryProvider,
  ReportRepository,
} from "../repositories/reportRepository";

/**
 * Period locks.
 *
 * `assertOpen` is the important export. Every write to a plan or an actual
 * calls it, which is what makes the rule real — the UI disabling an input is a
 * courtesy, and a request built by hand ignores it entirely.
 */
@Service({ name: "LockService" })
export class LockService {
  constructor(
    private readonly locks: LockRepository = LockRepositoryProvider.get(),
    private readonly reports: ReportRepository = ReportRepositoryProvider.get()
  ) {}

  async list(userId: string) {
    return this.locks.list(userId);
  }

  /** Refuses the write if the month is closed. Answers 423 through the mapper. */
  async assertOpen(userId: string, month: string): Promise<void> {
    if (await this.locks.isLocked(userId, month)) {
      throw new PeriodLockedError(month);
    }
  }

  @Transactional()
  async lock(userId: string, month: string, note?: string | null) {
    const created = await this.locks.lock(userId, month, note);

    // Locking changes no number, but it changes every row's `locked` flag —
    // which the report carries, so a stored run is now out of date.
    await this.reports.bumpDataVersion(userId);

    return created;
  }

  @Transactional()
  async unlock(userId: string, month: string): Promise<void> {
    const removed = await this.locks.unlock(userId, month);
    if (!removed) throw new NotFoundError("Lock");

    await this.reports.bumpDataVersion(userId);
  }
}

export const LockServiceProvider = provide("LockService", () => new LockService());
