import { LockServiceProvider } from "@/domain/services/lockService";
import type { LockService } from "@/domain/services/lockService";
import { unlockPeriodDto } from "@/domain/dtos/lockDto";
import { Endpoint, Auth, Require, BadRequestError, type Ctx } from "@/domain/decorators/controller";

type Deps = { locks: LockService };

/**
 * Reopens a month.
 *
 * The month is a path segment, so it is validated here rather than by `Body()`
 * — an unvalidated segment would reach `monthToDate` and produce an Invalid
 * Date that silently matches nothing.
 */
export const DELETE = Endpoint<undefined, Deps>(
  Auth(),
  Require({ locks: LockServiceProvider }),
  async ({ user, params, deps }: Ctx<undefined, Deps>) => {
    const parsed = unlockPeriodDto.safeParse({ month: params.month });
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0].message);
    }

    await deps.locks.unlock(user!.id, parsed.data.month);
    return { message: `${parsed.data.month} is open` };
  }
);
