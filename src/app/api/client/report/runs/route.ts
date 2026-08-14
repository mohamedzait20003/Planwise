import { ReportServiceProvider } from "@/domain/services/reportService";
import type { ReportService } from "@/domain/services/reportService";
import { Endpoint, Auth, Require, type Ctx } from "@/domain/decorators/controller";

type Deps = { reports: ReportService };

/** Newest 50 is the cap; the list is a way back to a range, not an archive. */
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

/**
 * The ranges this user has run.
 *
 * Summaries only — no rows. Selecting an entry sets the range and category
 * filter on the report screen, and the existing `GET /api/client/report` then
 * serves that run, so there is nothing here for a second fetch of the same
 * numbers to do.
 */
export const GET = Endpoint<undefined, Deps>(
  Auth(),
  Require({ reports: ReportServiceProvider }),
  async ({ user, query, deps }: Ctx<undefined, Deps>) => {
    const asked = Number(query.get("limit"));
    // A bad or absent limit falls back rather than erroring: this is a
    // convenience parameter, and there is no request it can make invalid.
    const limit =
      Number.isInteger(asked) && asked > 0
        ? Math.min(asked, MAX_LIMIT)
        : DEFAULT_LIMIT;

    return {
      message: "Report history",
      data: await deps.reports.history(user!.id, limit),
    };
  }
);
