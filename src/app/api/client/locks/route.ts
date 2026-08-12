import { LockServiceProvider } from "@/domain/services/lockService";
import type { LockService } from "@/domain/services/lockService";
import { lockPeriodDto, type LockPeriodDto } from "@/domain/dtos/lockDto";
import { Endpoint, Auth, Body, Require, type Ctx } from "@/domain/decorators/controller";
import { toLock } from "@/domain/helpers/wire";

type Deps = { locks: LockService };

export const GET = Endpoint<undefined, Deps>(
  Auth(),
  Require({ locks: LockServiceProvider }),
  async ({ user, deps }: Ctx<undefined, Deps>) => ({
    message: "Locks",
    data: (await deps.locks.list(user!.id)).map(toLock),
  })
);

/**
 * Closes a month.
 *
 * Locking an already-locked month is a no-op that succeeds rather than a 409 —
 * the caller's intent is satisfied either way, and the note is updated.
 */
export const POST = Endpoint<LockPeriodDto, Deps>(
  Auth(),
  Body(lockPeriodDto),
  Require({ locks: LockServiceProvider }),
  async ({ user, body, deps }: Ctx<LockPeriodDto, Deps>) => ({
    message: `${body.month} is locked`,
    status: 201,
    data: toLock(await deps.locks.lock(user!.id, body.month, body.note)),
  })
);
