import "server-only";

import { db } from "../decorators/service";
import { provide } from "../decorators/provider";
import { Repository } from "../decorators/repository";
import { monthToDate } from "../helpers/period";
import { ActualModel } from "../models/budgetModel";


@Repository({ name: "ActualRepository" })
export class ActualRepository {
  async list(
    userId: string,
    month?: string,
    categoryId?: string
  ): Promise<ActualModel[]> {
    const rows = await db().actual.findMany({
      where: {
        userId,
        deletedAt: null,
        ...(month ? { periodMonth: monthToDate(month) } : {}),
        ...(categoryId ? { categoryId } : {}),
      },
      orderBy: [{ periodMonth: "asc" }, { createdAt: "desc" }],
    });

    return rows.map((row) => new ActualModel(row));
  }

  /**
   * Totals per category-month, aggregated in Postgres.
   *
   * Returns the raw `groupBy` shape rather than a model on purpose: this is not
   * an entity. There is no actual with this identity — it is the sum of many,
   * and wrapping it in an `ActualModel` would invent an id and a note for a row
   * that has neither.
   */
  async sumInRange(
    userId: string,
    from: string,
    to: string,
    categoryId?: string
  ) {
    return db().actual.groupBy({
      by: ["categoryId", "periodMonth"],
      where: {
        userId,
        // Without this a deleted entry keeps contributing to every report,
        // which is the whole failure mode soft delete invites.
        deletedAt: null,
        ...(categoryId ? { categoryId } : {}),
        periodMonth: { gte: monthToDate(from), lte: monthToDate(to) },
      },
      _sum: { amount: true },
    });
  }

  /**
   * Finds an entry whether or not it is deleted.
   *
   * Restore needs the deleted row, and so does the lock check in front of it —
   * the month a removal has to be judged against is the one stored on the row,
   * and filtering it out here would make a deleted entry unrestorable and
   * unguarded at once.
   */
  async findById(userId: string, id: string): Promise<ActualModel | null> {
    const row = await db().actual.findFirst({ where: { id, userId } });
    return row && new ActualModel(row);
  }

  /** Live entries only — what a caller means by "does this still exist". */
  async findLiveById(userId: string, id: string): Promise<ActualModel | null> {
    const row = await db().actual.findFirst({
      where: { id, userId, deletedAt: null },
    });
    return row && new ActualModel(row);
  }

  async create(input: {
    userId: string;
    categoryId: string;
    month: string;
    amount: number;
    note?: string | null;
  }): Promise<ActualModel> {
    const row = await db().actual.create({
      data: {
        userId: input.userId,
        categoryId: input.categoryId,
        periodMonth: monthToDate(input.month),
        amount: input.amount,
        note: input.note ?? null,
      },
    });

    return new ActualModel(row);
  }

  async createMany(
    rows: Array<{
      userId: string;
      categoryId: string;
      month: string;
      amount: number;
      note?: string | null;
    }>
  ): Promise<number> {
    if (rows.length === 0) return 0;

    const { count } = await db().actual.createMany({
      data: rows.map((row) => ({
        userId: row.userId,
        categoryId: row.categoryId,
        periodMonth: monthToDate(row.month),
        amount: row.amount,
        note: row.note ?? null,
      })),
    });

    return count;
  }

  async update(
    userId: string,
    id: string,
    data: {
      categoryId?: string;
      month?: string;
      amount?: number;
      note?: string | null;
    }
  ): Promise<ActualModel | null> {
    const { count } = await db().actual.updateMany({
      // A deleted entry is not editable — restore it first. Without the guard
      // an edit would silently write to a row nothing else can see.
      where: { id, userId, deletedAt: null },
      data: {
        ...(data.categoryId !== undefined ? { categoryId: data.categoryId } : {}),
        ...(data.month !== undefined ? { periodMonth: monthToDate(data.month) } : {}),
        ...(data.amount !== undefined ? { amount: data.amount } : {}),
        ...(data.note !== undefined ? { note: data.note } : {}),
      },
    });

    return count > 0 ? this.findById(userId, id) : null;
  }

  /**
   * Marks an entry deleted. Idempotent: deleting an already-deleted entry is
   * not an error, and must not move the timestamp that recorded the first one.
   */
  async softDelete(userId: string, id: string): Promise<boolean> {
    const { count } = await db().actual.updateMany({
      where: { id, userId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return count > 0;
  }

  async restore(userId: string, id: string): Promise<boolean> {
    const { count } = await db().actual.updateMany({
      where: { id, userId, deletedAt: { not: null } },
      data: { deletedAt: null },
    });
    return count > 0;
  }
}

export const ActualRepositoryProvider = provide(
  "ActualRepository",
  () => new ActualRepository()
);
