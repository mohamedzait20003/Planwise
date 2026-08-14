import "server-only";

import { db } from "../decorators/service";
import { provide } from "../decorators/provider";
import { Repository } from "../decorators/repository";
import { CategoryModel } from "../models/budgetModel";

@Repository({ name: "CategoryRepository" })
export class CategoryRepository {
  async list(userId: string): Promise<CategoryModel[]> {
    const rows = await db().category.findMany({
      where: { userId },
      orderBy: [{ archivedAt: "asc" }, { name: "asc" }],
    });

    return rows.map((row) => new CategoryModel(row));
  }

  async findById(userId: string, id: string): Promise<CategoryModel | null> {
    const row = await db().category.findFirst({ where: { id, userId } });
    return row && new CategoryModel(row);
  }

  async findByNames(userId: string, names: string[]): Promise<CategoryModel[]> {
    if (names.length === 0) return [];

    const rows = await db().category.findMany({
      where: {
        userId,
        archivedAt: null,
        OR: names.map((name) => ({ name: { equals: name, mode: "insensitive" as const } })),
      },
    });

    return rows.map((row) => new CategoryModel(row));
  }

  async create(userId: string, name: string): Promise<CategoryModel> {
    return new CategoryModel(await db().category.create({ data: { userId, name } }));
  }

  async update(
    userId: string,
    id: string,
    data: { name?: string; archivedAt?: Date | null }
  ): Promise<CategoryModel | null> {
    const { count } = await db().category.updateMany({
      where: { id, userId },
      data,
    });

    return count > 0 ? this.findById(userId, id) : null;
  }
}

export const CategoryRepositoryProvider = provide(
  "CategoryRepository",
  () => new CategoryRepository()
);
