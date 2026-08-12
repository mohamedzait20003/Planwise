import "server-only";

import { db } from "../decorators/service";
import { provide } from "../decorators/provider";
import { Repository } from "../decorators/repository";
import { monthToDate } from "../helpers/period";

/**
 * Actuals.
 *
 * Many rows may share a category and month — three invoices against Marketing
 * in January are three entries, and only the sum matters to the report. That is
 * why there is no unique constraint here and no upsert.
 */
@Repository({ name: "ActualRepository" })
export class ActualRepository {
  async list(userId: string, month?: string, categoryId?: string) {
    return db().actual.findMany({
      where: {
        userId,
        ...(month ? { periodMonth: monthToDate(month) } : {}),
        ...(categoryId ? { categoryId } : {}),
      },
      orderBy: [{ periodMonth: "asc" }, { createdAt: "desc" }],
    });
  }

  /**
   * Summed per category and month across a range.
   *
   * `groupBy` rather than fetching the rows and reducing in JS: a year of daily
   * entries is thousands of rows the report never needs individually, and the
   * database is where that collapse belongs.
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
        ...(categoryId ? { categoryId } : {}),
        periodMonth: { gte: monthToDate(from), lte: monthToDate(to) },
      },
      _sum: { amount: true },
    });
  }

  async findById(userId: string, id: string) {
    return db().actual.findFirst({ where: { id, userId } });
  }

  async create(input: {
    userId: string;
    categoryId: string;
    month: string;
    amount: number;
    note?: string | null;
  }) {
    return db().actual.create({
      data: {
        userId: input.userId,
        categoryId: input.categoryId,
        periodMonth: monthToDate(input.month),
        amount: input.amount,
        note: input.note ?? null,
      },
    });
  }

  /** Bulk insert for the CSV import. Rejected rows are filtered out upstream. */
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
  ) {
    const { count } = await db().actual.updateMany({
      where: { id, userId },
      data: {
        ...(data.categoryId !== undefined ? { categoryId: data.categoryId } : {}),
        ...(data.month !== undefined ? { periodMonth: monthToDate(data.month) } : {}),
        ...(data.amount !== undefined ? { amount: data.amount } : {}),
        ...(data.note !== undefined ? { note: data.note } : {}),
      },
    });

    return count > 0 ? this.findById(userId, id) : null;
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const { count } = await db().actual.deleteMany({ where: { id, userId } });
    return count > 0;
  }
}

export const ActualRepositoryProvider = provide(
  "ActualRepository",
  () => new ActualRepository()
);
