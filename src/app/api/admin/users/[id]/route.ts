import { AdminServiceProvider } from "@/domain/services/adminService";
import type { AdminService } from "@/domain/services/adminService";
import { updateUserDto, type UpdateUserDto } from "@/domain/dtos/adminDto";
import { Endpoint, Auth, Body, Require, type Ctx } from "@/domain/decorators/controller";
import { toAdminUser } from "@/domain/helpers/wire";

type Deps = { admin: AdminService };

export const GET = Endpoint<undefined, Deps>(
  Auth("ADMIN"),
  Require({ admin: AdminServiceProvider }),
  async ({ params, deps }: Ctx<undefined, Deps>) => ({
    message: "User",
    data: toAdminUser(await deps.admin.getUser(params.id)),
  })
);

/**
 * Change a role or a verification state.
 *
 * The actor's own id is passed through from the token rather than taken from
 * the body — the rule is that an admin cannot demote *themselves*, and a caller
 * who could name the actor could sidestep it by naming somebody else.
 *
 * Both refusals come back as 400 `ValidationError`, which is what the mapping
 * table in `controller.ts` already does with them. They are the caller asking
 * for something the domain forbids, not an authorization failure — the caller
 * is an admin either way.
 */
export const PATCH = Endpoint<UpdateUserDto, Deps>(
  Auth("ADMIN"),
  Body(updateUserDto),
  Require({ admin: AdminServiceProvider }),
  async ({ user, params, body, deps }: Ctx<UpdateUserDto, Deps>) => ({
    message: "User updated",
    data: toAdminUser(await deps.admin.updateUser(user!.id, params.id, body)),
  })
);
