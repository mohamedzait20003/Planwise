import { ReportServiceProvider } from "@/domain/services/reportService";
import type { ReportService } from "@/domain/services/reportService";
import { reportQueryDto } from "@/domain/dtos/reportDto";
import { Endpoint, Auth, Require, BadRequestError, type Ctx } from "@/domain/decorators/controller";
import { toReport } from "@/domain/helpers/wire";
import { enqueueReport, inlineReports } from "@/domain/infra/queue";
import { ReportStatus } from "../../../../../generated/prisma/client";

type Deps = { reports: ReportService };

/**
 * Reads a report, generating it if there is no current one.
 *
 * Answers 200 with the report when a stored run is current, and 202 with
 * `{ status }` when one is being generated. The client polls this same URL —
 * which is why it must be idempotent, and why the branches below are ordered
 * the way they are: a job already in flight is left alone rather than claimed
 * again, or a poll every two seconds would queue a message every two seconds
 * and the report would never settle.
 *
 * A stale run is never served. A variance report one write behind is a wrong
 * number wearing the authority of a right one, so it is recomputed instead.
 */
export const GET = Endpoint<undefined, Deps>(
  Auth(),
  Require({ reports: ReportServiceProvider }),
  async ({ user, query, deps }: Ctx<undefined, Deps>) => {
    const parsed = reportQueryDto.safeParse({
      from: query.get("from") ?? "",
      to: query.get("to") ?? "",
      categoryId: query.get("categoryId") || undefined,
    });

    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0].message);
    }

    const userId = user!.id;
    const request = parsed.data;

    const existing = await deps.reports.findRun(userId, request);
    const current = existing !== null && (await deps.reports.isCurrent(userId, existing));

    if (existing && current) {
      if (existing.status === ReportStatus.READY) {
        return { message: "Report", data: toReport(existing) };
      }

      // In flight against the current data — say so and leave it be.
      if (
        existing.status === ReportStatus.PENDING ||
        existing.status === ReportStatus.PROCESSING
      ) {
        return {
          message: "Report is being generated",
          status: 202,
          data: { status: existing.status.toLowerCase(), runId: existing.id },
        };
      }

      // FAILED against data that has not changed. Retrying would fail the same
      // way, so report it rather than spin. A later write makes the run stale
      // and the branch below picks it up.
      return {
        message: existing.error ?? "The report failed to generate",
        data: {
          status: existing.status.toLowerCase(),
          runId: existing.id,
          error: existing.error,
        },
      };
    }

    // Missing or stale: claim the run — which resets the existing one rather
    // than adding a second under the same key — and hand the work over.
    const run = await deps.reports.claim(userId, request);

    if (inlineReports()) {
      await deps.reports.fulfil(userId, run.id);
      const computed = await deps.reports.findRun(userId, request);

      return computed?.status === ReportStatus.READY
        ? { message: "Report", data: toReport(computed) }
        : { message: "The report could not be generated", status: 500 };
    }

    try {
      await enqueueReport({ runId: run.id, userId });
    } catch (cause) {
      // The run is PENDING and nobody holds it, so the client would poll a job
      // that will never run. Mark it failed before the error propagates.
      await deps.reports.fail(
        run.id,
        "The report could not be queued. Please try again."
      );
      throw cause;
    }

    return {
      message: "Report is being generated",
      status: 202,
      data: { status: "pending" as const, runId: run.id },
    };
  }
);
