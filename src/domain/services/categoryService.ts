import "server-only";

import { Service, Transactional } from "../decorators/service";
import { provide } from "../decorators/provider";
import { NotFoundError, ValidationError } from "../decorators/global";
import {
  CategoryRepositoryProvider,
  CategoryRepository,
} from "../repositories/categoryRepository";
import {
  ReportRepositoryProvider,
  ReportRepository,
} from "../repositories/reportRepository";

@Service({ name: "CategoryService" })
export class CategoryService {
  constructor(
    private readonly categories: CategoryRepository = CategoryRepositoryProvider.get(),
    private readonly reports: ReportRepository = ReportRepositoryProvider.get()
  ) {}

  async list(userId: string) {
    return this.categories.list(userId);
  }

  @Transactional()
  async create(userId: string, name: string) {
    const existing = await this.categories.list(userId);

    if (existing.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      throw new ValidationError(`A category named "${name}" already exists`);
    }

    const created = await this.categories.create(userId, name);
    await this.reports.bumpDataVersion(userId);

    return created;
  }

  @Transactional()
  async update(
    userId: string,
    id: string,
    input: { name?: string; archived?: boolean }
  ) {
    const current = await this.categories.findById(userId, id);
    if (!current) throw new NotFoundError("Category");

    if (input.name !== undefined && input.name !== current.name) {
      const clash = (await this.categories.list(userId)).some(
        (c) => c.id !== id && c.name.toLowerCase() === input.name!.toLowerCase()
      );
      if (clash) {
        throw new ValidationError(`A category named "${input.name}" already exists`);
      }
    }

    const updated = await this.categories.update(userId, id, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.archived !== undefined
        ? { archivedAt: input.archived ? new Date() : null }
        : {}),
    });

    if (!updated) throw new NotFoundError("Category");
    await this.reports.bumpDataVersion(userId);

    return updated;
  }

  /** Throws unless the category exists, belongs to the caller, and is usable. */
  async requireWritable(userId: string, id: string) {
    const category = await this.categories.findById(userId, id);
    if (!category) throw new NotFoundError("Category");

    if (category.archivedAt !== null) {
      throw new ValidationError(
        `"${category.name}" is archived. Restore it before using it.`
      );
    }

    return category;
  }
}

export const CategoryServiceProvider = provide(
  "CategoryService",
  () => new CategoryService()
);
