import { PlanServiceProvider } from "@/domain/services/planService";
import type { PlanService } from "@/domain/services/planService";
import { Endpoint, Auth, Require, type Ctx } from "@/domain/decorators/controller";

type Deps = { plans: PlanService };

/**
 * Removes a target.
 *
 * The month is read off the stored row inside the service, not taken from the
 * caller — a request naming an open month must not be able to delete a row in
 * a closed one.
 */
export const DELETE = Endpoint<undefined, Deps>(
  Auth(),
  Require({ plans: PlanServiceProvider }),
  async ({ user, params, deps }: Ctx<undefined, Deps>) => {
    await deps.plans.delete(user!.id, params.id);
    return { message: "Target removed" };
  }
);
