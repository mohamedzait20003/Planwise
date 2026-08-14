import "server-only";

import { Service, Transactional } from "../decorators/service";
import { provide } from "../decorators/provider";
import { NotFoundError } from "../decorators/global";
import { PlanRepositoryProvider, PlanRepository } from "../repositories/planRepository";
import {
  ReportRepositoryProvider,
  ReportRepository,
} from "../repositories/reportRepository";
import { CategoryServiceProvider, CategoryService } from "./categoryService";
import { LockServiceProvider, LockService } from "./lockService";

/**
 * Monthly targets.
 *
 * Every write passes two gates before it touches a row: the month must be open,
 * and the category must be the caller's and not archived. Both are here rather
 * than in the route so a second caller — an import, a seed script — cannot skip
 * them by not knowing they exist.
 */
@Service({ name: "PlanService" })
export class PlanService {
  constructor(
    private readonly plans: PlanRepository = PlanRepositoryProvider.get(),
    private readonly categories: CategoryService = CategoryServiceProvider.get(),
    private readonly locks: LockService = LockServiceProvider.get(),
    private readonly reports: ReportRepository = ReportRepositoryProvider.get()
  ) {}

  async list(userId: string, month?: string) {
    return this.plans.list(userId, month);
  }

  @Transactional()
  async upsert(
    userId: string,
    input: { categoryId: string; month: string; amount: number }
  ) {
    await this.locks.assertOpen(userId, input.month);
    await this.categories.requireWritable(userId, input.categoryId);

    const plan = await this.plans.upsert({ userId, ...input });
    await this.reports.bumpDataVersion(userId);

    return plan;
  }

  /**
   * Removes a target.
   *
   * The month is read off the stored row rather than taken from the caller —
   * checking the lock against a month the client supplied would let a request
   * name an open month while deleting a row in a closed one.
   */
  @Transactional()
  async delete(userId: string, id: string): Promise<void> {
    const plan = await this.plans.findById(userId, id);
    if (!plan) throw new NotFoundError("Plan");

    await this.locks.assertOpen(userId, plan.month);

    await this.plans.delete(userId, id);
    await this.reports.bumpDataVersion(userId);
  }
}

export const PlanServiceProvider = provide("PlanService", () => new PlanService());
