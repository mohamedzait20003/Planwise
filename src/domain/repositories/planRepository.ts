import "server-only";

import { db } from "../decorators/service";
import { provide } from "../decorators/provider";
import { Repository } from "../decorators/repository";
import { monthToDate } from "../helpers/period";

/**
 * Plans — one target per category per month.
 *
 * The uniqueness is in the schema, so writes go through `upsert` rather than a
 * read-then-branch: two saves racing on the same cell would both see "no row"
 * and the second would fail on the constraint.
 */
@Repository({ name: "PlanRepository" })
export class PlanRepository {
  async list(userId: string, month?: string) {
    return db().plan.findMany({
      where: {
        userId,
        ...(month ? { periodMonth: monthToDate(month) } : {}),
      },
      orderBy: [{ periodMonth: "asc" }],
    });
  }

  /** Everything in an inclusive month range — what the report reads. */
  async listInRange(
    userId: string,
    from: string,
    to: string,
    categoryId?: string
  ) {
    return db().plan.findMany({
      where: {
        userId,
        ...(categoryId ? { categoryId } : {}),
        periodMonth: { gte: monthToDate(from), lte: monthToDate(to) },
      },
      include: { category: { select: { name: true } } },
      orderBy: [{ periodMonth: "asc" }],
    });
  }

  async findById(userId: string, id: string) {
    return db().plan.findFirst({ where: { id, userId } });
  }

  async upsert(input: {
    userId: string;
    categoryId: string;
    month: string;
    amount: number;
  }) {
    const periodMonth = monthToDate(input.month);

    return db().plan.upsert({
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
