import { baseApi } from "@/lib/api/baseApi";
import type { ApiEnvelope, ReportQuery, ReportResponse } from "@/lib/api/types";

/**
 * The plan-vs-actual report.
 *
 * Read-only by design. The report is *derived* from categories, plans, actuals
 * and locks — computed per request rather than stored, so it cannot disagree
 * with the rows it summarises.
 */

export async function getReport(
  params: ReportQuery
): Promise<ApiEnvelope<ReportResponse>> {
  const res = await baseApi.get<ApiEnvelope<ReportResponse>>("/report", {
    params,
  });
  return res.data;
}

/**
 * The same report as CSV.
 *
 * Returned as a Blob rather than parsed — these bytes go straight to a
 * download, so there is nothing to deserialize.
 */
export async function exportReportCsv(params: ReportQuery): Promise<Blob> {
  const res = await baseApi.get("/report/export", {
    params,
    responseType: "blob",
  });
  return res.data as Blob;
}
