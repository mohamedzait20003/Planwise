import { ActualServiceProvider } from "@/domain/services/actualService";
import type { ActualService } from "@/domain/services/actualService";
import { updateActualDto, type UpdateActualDto } from "@/domain/dtos/actualDto";
import { Endpoint, Auth, Body, Require, type Ctx } from "@/domain/decorators/controller";
import { toActual } from "@/domain/helpers/wire";

type Deps = { actuals: ActualService };

export const PATCH = Endpoint<UpdateActualDto, Deps>(
  Auth(),
  Body(updateActualDto),
  Require({ actuals: ActualServiceProvider }),
  async ({ user, body, params, deps }: Ctx<UpdateActualDto, Deps>) => ({
    message: "Entry updated",
    data: toActual(await deps.actuals.update(user!.id, params.id, body)),
  })
);

export const DELETE = Endpoint<undefined, Deps>(
  Auth(),
  Require({ actuals: ActualServiceProvider }),
  async ({ user, params, deps }: Ctx<undefined, Deps>) => {
    await deps.actuals.delete(user!.id, params.id);
    return { message: "Entry removed" };
  }
);
