import { PlanServiceProvider } from "@/domain/services/planService";
import type { PlanService } from "@/domain/services/planService";
import { upsertPlanDto, listPlansDto, type UpsertPlanDto } from "@/domain/dtos/planDto";
import { Endpoint, Auth, Body, Require, BadRequestError, type Ctx } from "@/domain/decorators/controller";
import { toPlan } from "@/domain/helpers/wire";

type Deps = { plans: PlanService };

export const GET = Endpoint<undefined, Deps>(
  Auth(),
  Require({ plans: PlanServiceProvider }),
  async ({ user, query, deps }: Ctx<undefined, Deps>) => {
    const parsed = listPlansDto.safeParse({
      month: query.get("month") || undefined,
    });

    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0].message);
    }

    return {
      message: "Plans",
      data: (await deps.plans.list(user!.id, parsed.data.month)).map(toPlan),
    };
  }
);

/**
 * Upsert, not create — and PUT rather than POST.
 *
 * One plan per category per month, so setting a target and changing it are the
 * same request; a POST/PATCH pair would only be a way to get a 409 on the
 * second save. PUT because that request is idempotent and the resource is
 * identified by the payload's natural key, `(category, month)`: sending it
 * twice leaves the same single row, which is exactly what PUT promises and
 * POST does not.
 */
export const PUT = Endpoint<UpsertPlanDto, Deps>(
  Auth(),
  Body(upsertPlanDto),
  Require({ plans: PlanServiceProvider }),
  async ({ user, body, deps }: Ctx<UpsertPlanDto, Deps>) => ({
    message: "Target saved",
    data: toPlan(await deps.plans.upsert(user!.id, body)),
  })
);
