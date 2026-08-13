import { ReportServiceProvider } from "@/domain/services/reportService";
import type { ReportService } from "@/domain/services/reportService";
import { reportQueryDto } from "@/domain/dtos/reportDto";
import { Endpoint, Auth, Require, BadRequestError, type Ctx } from "@/domain/decorators/controller";

type Deps = { reports: ReportService };

/** Quotes a field only when it needs it, and doubles any quote inside. */
function csvCell(value: string | number | null): string {
  if (value === null) return "";

  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

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

    const report = await deps.reports.compute(user!.id, parsed.data);

    const lines = [
      ["month", "category", "plan", "actual", "variance", "variance_pct", "locked"]
        .join(","),
      ...report.rows.map((row) =>
        [
          csvCell(row.month),
          csvCell(row.categoryName),
          csvCell(row.plan.toFixed(2)),
          csvCell(row.hasActual ? row.actual.toFixed(2) : null),
          csvCell(row.variance.toFixed(2)),
          csvCell(row.variancePct === null ? null : row.variancePct.toFixed(2)),
          csvCell(row.locked ? "yes" : "no"),
        ].join(",")
      ),
    ];

    const name = `planwise-report-${parsed.data.from}-to-${parsed.data.to}.csv`;

    return new Response(`﻿${lines.join("\r\n")}`, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${name}"`,
      },
    });
  }
);
