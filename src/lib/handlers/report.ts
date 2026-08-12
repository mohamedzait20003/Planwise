import { baseApi } from "@/lib/api/baseApi";
import type { ApiEnvelope, ReportQuery, ReportResponse } from "@/lib/api/types";

/**
 * The plan-vs-actual report.
 *
 * The report is generated off a queue and stored, so a request does not always
 * come back with numbers. `GET /client/report` answers one of three ways:
 *
 *   the report — a stored run exists and matches the current data;
 *   `{ status: "pending" | "processing" }` with 202 — work is under way;
 *   `{ status: "failed", error }` — the last attempt failed and the data has
 *   not changed since, so retrying would fail the same way.
 *
 * The endpoint is idempotent, which is what makes polling it safe: a job
 * already in flight is left alone rather than queued a second time.
 */

export type ReportProgress = {
  status: "pending" | "processing" | "failed";
  runId: string;
  error?: string | null;
};

export type ReportOutcome =
  | { ready: true; report: ReportResponse }
  | { ready: false; progress: ReportProgress };

/**
 * Discriminates on the payload rather than the status code.
 *
 * A failed run answers 200 — the request was fine, the answer is "this failed"
 * — so the code alone cannot tell the three cases apart. `ReportResponse` has
 * no `status` field, which makes its presence the reliable signal.
 */
function outcomeOf(
  envelope: ApiEnvelope<ReportResponse | ReportProgress>
): ReportOutcome {
  const data = envelope.data;

  if (data && "status" in data) {
    return { ready: false, progress: data };
  }

  if (!data) {
    throw new Error("The report response carried no data");
  }

  return { ready: true, report: data };
}

export async function getReport(params: ReportQuery): Promise<ReportOutcome> {
  const res = await baseApi.get<ApiEnvelope<ReportResponse | ReportProgress>>(
    "/client/report",
    { params }
  );

  return outcomeOf(res.data);
}

/**
 * The same report as CSV.
 *
 * Computed on demand rather than read from a stored run — the caller is already
 * waiting on a download, and there is nothing a browser can do with a 202.
 * Returned as a Blob because these bytes go straight to a file.
 */
export async function exportReportCsv(params: ReportQuery): Promise<Blob> {
  const res = await baseApi.get("/client/report/export", {
    params,
    responseType: "blob",
  });

  return res.data as Blob;
}
