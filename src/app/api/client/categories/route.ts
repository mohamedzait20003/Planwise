import { CategoryServiceProvider } from "@/domain/services/categoryService";
import type { CategoryService } from "@/domain/services/categoryService";
import { createCategoryDto, type CreateCategoryDto } from "@/domain/dtos/categoryDto";
import { Endpoint, Auth, Body, Require, type Ctx } from "@/domain/decorators/controller";
import { toCategory } from "@/domain/helpers/wire";

type Deps = { categories: CategoryService };

export const GET = Endpoint<undefined, Deps>(
  Auth(),
  Require({ categories: CategoryServiceProvider }),
  async ({ user, deps }: Ctx<undefined, Deps>) => ({
    message: "Categories",
    data: (await deps.categories.list(user!.id)).map(toCategory),
  })
);

export const POST = Endpoint<CreateCategoryDto, Deps>(
  Auth(),
  Body(createCategoryDto),
  Require({ categories: CategoryServiceProvider }),
  async ({ user, body, deps }: Ctx<CreateCategoryDto, Deps>) => ({
    message: "Category created",
    status: 201,
    data: toCategory(await deps.categories.create(user!.id, body.name)),
  })
);
