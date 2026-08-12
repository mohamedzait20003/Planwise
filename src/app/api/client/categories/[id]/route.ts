import { CategoryServiceProvider } from "@/domain/services/categoryService";
import type { CategoryService } from "@/domain/services/categoryService";
import { updateCategoryDto, type UpdateCategoryDto } from "@/domain/dtos/categoryDto";
import { Endpoint, Auth, Body, Require, type Ctx } from "@/domain/decorators/controller";
import { toCategory } from "@/domain/helpers/wire";

type Deps = { categories: CategoryService };

/**
 * Rename or archive.
 *
 * There is no DELETE. Plans and actuals reference a category with
 * `onDelete: Restrict`, so a delete is either refused by the database or takes
 * history with it — archiving keeps last quarter's report reading the same.
 */
export const PATCH = Endpoint<UpdateCategoryDto, Deps>(
  Auth(),
  Body(updateCategoryDto),
  Require({ categories: CategoryServiceProvider }),
  async ({ user, body, params, deps }: Ctx<UpdateCategoryDto, Deps>) => ({
    message: "Category updated",
    data: toCategory(await deps.categories.update(user!.id, params.id, body)),
  })
);
