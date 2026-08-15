import { AdminServiceProvider } from "@/domain/services/adminService";
import type { AdminService } from "@/domain/services/adminService";
import { Endpoint, Auth, Require, type Ctx } from "@/domain/decorators/controller";
import { toAdminOverview } from "@/domain/helpers/wire";

type Deps = { admin: AdminService };

/**
 * The platform at a glance.
 *
 * `Auth("ADMIN")` rather than `Auth()`: `proxy.ts` already keeps non-admins off
 * the `/admin` pages, but that is a redirect, and a redirect is useless to
 * `fetch`. This is the check that decides whether the data leaves the server.
 */
export const GET = Endpoint<undefined, Deps>(
  Auth("ADMIN"),
  Require({ admin: AdminServiceProvider }),
  async ({ deps }: Ctx<undefined, Deps>) => ({
    message: "Platform overview",
    data: toAdminOverview(await deps.admin.overview()),
  })
);
