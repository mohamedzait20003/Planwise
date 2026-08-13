import { ReportServiceProvider } from "@/domain/services/reportService";
import type { ReportService } from "@/domain/services/reportService";
import { reportQueryDto, type ReportQueryDto } from "@/domain/dtos/reportDto";
import { Endpoint, Auth, Require, BadRequestError, type Ctx } from "@/domain/decorators/controller";
import { toReport } from "@/domain/helpers/wire";
import { enqueueReport, inlineReports } from "@/domain/infra/queue";
import { ReportStatus } from "../../../../../generated/prisma/client";

type Deps = { reports: ReportService };

function parseQuery(query: URLSearchParams): ReportQueryDto {
  const parsed = reportQueryDto.safeParse({
    from: query.get("from") ?? "",
    to: query.get("to") ?? "",
    categoryId: query.get("categoryId") || undefined,
  });

  if (!parsed.success) {
    throw new BadRequestError(parsed.error.issues[0].message);
  }

  return parsed.data;
}

export const GET = Endpoint<undefined, Deps>(
  Auth(),
  Require({ reports: ReportServiceProvider }),
  async ({ user, query, deps }: Ctx<undefined, Deps>) => {
    const request = parseQuery(query);
    const run = await deps.reports.findRun(user!.id, request);

    if (!run) {
      return { message: "No report yet", data: { status: "none" as const } };
    }

    if (run.status === ReportStatus.READY) {
      return {
        message: "Report",
        data: {
          status: "ready" as const,
          stale: !(await deps.reports.isCurrent(user!.id, run)),
          computedAt: run.computedAt?.toISOString() ?? null,
          report: toReport(run),
        },
      };
    }

    if (run.status === ReportStatus.FAILED) {
      return {
        message: run.error ?? "The report failed to generate",
        data: { status: "failed" as const, runId: run.id, error: run.error },
      };
    }

    return {
      message: "Report is being generated",
      status: 202,
      data: { status: run.status.toLowerCase(), runId: run.id },
    };
  }
);

export const POST = Endpoint<undefined, Deps>(
  Auth(),
  Require({ reports: ReportServiceProvider }),
  async ({ user, query, deps }: Ctx<undefined, Deps>) => {
    const userId = user!.id;
    const request = parseQuery(query);

    const existing = await deps.reports.findRun(userId, request);

    if (
      existing &&
      (existing.status === ReportStatus.PENDING ||
        existing.status === ReportStatus.PROCESSING)
    ) {
      return {
        message: "Report is already being generated",
        status: 202,
        data: { status: existing.status.toLowerCase(), runId: existing.id },
      };
    }

    const run = await deps.reports.claim(userId, request);

    if (inlineReports()) {
      await deps.reports.fulfil(userId, run.id);
      const computed = await deps.reports.findRun(userId, request);

      if (computed?.status !== ReportStatus.READY) {
        return { message: "The report could not be generated", status: 500 };
      }

      return {
        message: "Report",
        data: {
          status: "ready" as const,
          stale: false,
          computedAt: computed.computedAt?.toISOString() ?? null,
          report: toReport(computed),
        },
      };
    }

    try {
      await enqueueReport({ runId: run.id, userId });
    } catch (cause) {
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
