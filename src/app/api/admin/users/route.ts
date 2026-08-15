import { AdminServiceProvider } from "@/domain/services/adminService";
import type { AdminService } from "@/domain/services/adminService";
import { Endpoint, Auth, Require, type Ctx } from "@/domain/decorators/controller";
import { toAdminUser } from "@/domain/helpers/wire";

type Deps = { admin: AdminService };

/**
 * One page of users, newest first.
 *
 * The filters arrive as query parameters, so there is no `Body()` step to hang
 * a schema on — `AdminService.listUsers` parses them against `listUsersDto`
 * instead, which keeps the bounds on `perPage` in the DTO with the rest of the
 * validation rather than inline here.
 */
export const GET = Endpoint<undefined, Deps>(
  Auth("ADMIN"),
  Require({ admin: AdminServiceProvider }),
  async ({ query, deps }: Ctx<undefined, Deps>) => {
    const page = await deps.admin.listUsers(query);

    return {
      message: "Users",
      data: { ...page, items: page.items.map(toAdminUser) },
    };
  }
);
