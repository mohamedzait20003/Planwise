import { ActualServiceProvider } from "@/domain/services/actualService";
import type { ActualService } from "@/domain/services/actualService";
import { Endpoint, Auth, Require, type Ctx } from "@/domain/decorators/controller";

type Deps = { actuals: ActualService };

/**
 * Puts a soft-deleted entry back.
 *
 * A sibling route rather than a flag on `PATCH /actuals/[id]`, because that
 * endpoint edits a live entry and refuses a deleted one outright. Folding
 * restore into it would mean the same verb sometimes means "change this row"
 * and sometimes "make this row exist again", with a different lock story for
 * each.
 *
 * Answers 423 when the entry's own month is closed, on the same terms as the
 * delete that produced it.
 */
export const POST = Endpoint<undefined, Deps>(
  Auth(),
  Require({ actuals: ActualServiceProvider }),
  async ({ user, params, deps }: Ctx<undefined, Deps>) => {
    await deps.actuals.restore(user!.id, params.id);
    return { message: "Entry restored" };
  }
);
