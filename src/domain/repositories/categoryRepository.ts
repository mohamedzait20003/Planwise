import "server-only";

import { db } from "../decorators/service";
import { provide } from "../decorators/provider";
import { Repository } from "../decorators/repository";

@Repository({ name: "CategoryRepository" })
export class CategoryRepository {
  async list(userId: string) {
    return db().category.findMany({
      where: { userId },
      orderBy: [{ archivedAt: "asc" }, { name: "asc" }],
    });
  }

  async findById(userId: string, id: string) {
    return db().category.findFirst({ where: { id, userId } });
  }

  async findByNames(userId: string, names: string[]) {
    if (names.length === 0) return [];

    return db().category.findMany({
      where: {
        userId,
        archivedAt: null,
        OR: names.map((name) => ({ name: { equals: name, mode: "insensitive" as const } })),
      },
    });
  }

  async create(userId: string, name: string) {
    return db().category.create({ data: { userId, name } });
  }

  async update(
    userId: string,
    id: string,
    data: { name?: string; archivedAt?: Date | null }
  ) {
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
