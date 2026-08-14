import "server-only";

import { db } from "../decorators/service";
import { provide } from "../decorators/provider";
import { Repository } from "../decorators/repository";
import { monthToDate } from "../helpers/period";
import { PlanModel, PlanWithCategoryModel } from "../models/budgetModel";

/**
 * Plans — one target per category per month.
 *
 * The uniqueness is in the schema, so writes go through `upsert` rather than a
 * read-then-branch: two saves racing on the same cell would both see "no row"
 * and the second would fail on the constraint.
 */
@Repository({ name: "PlanRepository" })
export class PlanRepository {
  async list(userId: string, month?: string): Promise<PlanModel[]> {
    const rows = await db().plan.findMany({
      where: {
        userId,
        ...(month ? { periodMonth: monthToDate(month) } : {}),
      },
      orderBy: [{ periodMonth: "asc" }],
    });

    return rows.map((row) => new PlanModel(row));
  }

  /**
   * Everything in an inclusive month range — what the report reads.
   *
   * Selects the category name alongside, because the report puts it on every
   * planned row and joining per row would be one query per cell.
   */
  async listInRange(
    userId: string,
    from: string,
    to: string,
    categoryId?: string
  ): Promise<PlanWithCategoryModel[]> {
    const rows = await db().plan.findMany({
      where: {
        userId,
        ...(categoryId ? { categoryId } : {}),
        periodMonth: { gte: monthToDate(from), lte: monthToDate(to) },
      },
      include: { category: { select: { name: true } } },
      orderBy: [{ periodMonth: "asc" }],
    });

    return rows.map((row) => new PlanWithCategoryModel(row));
  }

  async findById(userId: string, id: string): Promise<PlanModel | null> {
    const row = await db().plan.findFirst({ where: { id, userId } });
    return row && new PlanModel(row);
  }

  async upsert(input: {
    userId: string;
    categoryId: string;
    month: string;
    amount: number;
  }): Promise<PlanModel> {
    const periodMonth = monthToDate(input.month);

    const row = await db().plan.upsert({
      where: {
        userId_categoryId_periodMonth: {
          userId: input.userId,
          categoryId: input.categoryId,
          periodMonth,
        },
      },
      create: {
        userId: input.userId,
        categoryId: input.categoryId,
        periodMonth,
        amount: input.amount,
      },
      update: { amount: input.amount },
    });

    return new PlanModel(row);
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const { count } = await db().plan.deleteMany({ where: { id, userId } });
    return count > 0;
  }
}

export const PlanRepositoryProvider = provide(
  "PlanRepository",
  () => new PlanRepository()
);
