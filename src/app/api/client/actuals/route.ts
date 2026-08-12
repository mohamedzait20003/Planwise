import { ActualServiceProvider } from "@/domain/services/actualService";
import type { ActualService } from "@/domain/services/actualService";
import {
  createActualDto,
  listActualsDto,
  type CreateActualDto,
} from "@/domain/dtos/actualDto";
import { Endpoint, Auth, Body, Require, BadRequestError, type Ctx } from "@/domain/decorators/controller";
import { toActual } from "@/domain/helpers/wire";

type Deps = { actuals: ActualService };

export const GET = Endpoint<undefined, Deps>(
  Auth(),
  Require({ actuals: ActualServiceProvider }),
  async ({ user, query, deps }: Ctx<undefined, Deps>) => {
    const parsed = listActualsDto.safeParse({
      month: query.get("month") || undefined,
      categoryId: query.get("categoryId") || undefined,
    });

    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0].message);
    }

    const rows = await deps.actuals.list(
      user!.id,
      parsed.data.month,
      parsed.data.categoryId
    );

    return { message: "Actuals", data: rows.map(toActual) };
  }
);

export const POST = Endpoint<CreateActualDto, Deps>(
  Auth(),
  Body(createActualDto),
  Require({ actuals: ActualServiceProvider }),
  async ({ user, body, deps }: Ctx<CreateActualDto, Deps>) => ({
    message: "Entry logged",
    status: 201,
    data: toActual(await deps.actuals.create(user!.id, body)),
  })
);
