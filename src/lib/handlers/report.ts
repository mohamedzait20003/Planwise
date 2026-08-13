import { baseApi } from "@/lib/api/baseApi";
import type { ApiEnvelope, ReportQuery, ReportResponse } from "@/lib/api/types";

/**
 * The plan-vs-actual report.
 *
 * Reading and generating are separate calls, deliberately. `getReport` never
 * queues work — opening the page shows the last answer for the range, or
 * nothing at all if there has never been one. `generateReport` is what the
 * Generate button does.
 */

export type ReportOutcome =
  /** Nothing has ever been generated for this range. */
  | { status: "none" }
  /** A stored run. `stale` means the numbers underneath have moved since. */
  | {
      status: "ready";
      stale: boolean;
      computedAt: string | null;
      report: ReportResponse;
    }
  | { status: "pending" | "processing"; runId: string }
  | { status: "failed"; runId: string; error: string | null };

/**
 * Every response carries an explicit `status`, so nothing has to be inferred
 * from the HTTP code — a failed run answers 200, because the request was fine
 * and the answer is "this run failed".
 */
function outcomeOf(envelope: ApiEnvelope<ReportOutcome>): ReportOutcome {
  if (!envelope.data) {
    throw new Error("The report response carried no data");
  }

  return envelope.data;
}

/** Reads the stored run for a range. Never triggers generation. */
export async function getReport(params: ReportQuery): Promise<ReportOutcome> {
  const res = await baseApi.get<ApiEnvelope<ReportOutcome>>("/client/report", {
    params,
  });

  return outcomeOf(res.data);
}

/**
 * Queues a fresh run.
 *
 * Answers `ready` directly when the server is configured to compute inline,
 * and `pending` otherwise — the caller polls `getReport` either way, so it does
 * not have to care which.
 */
export async function generateReport(
  params: ReportQuery
): Promise<ReportOutcome> {
  const res = await baseApi.post<ApiEnvelope<ReportOutcome>>(
    "/client/report",
    null,
    { params }
  );

  return outcomeOf(res.data);
}

/**
 * The same report as CSV.
 *
 * Computed on demand rather than read from a stored run — the caller is already
 * waiting on a download, and there is nothing a browser can do with a 202. It
 * is therefore always current, even when the stored run is stale.
 */
export async function exportReportCsv(params: ReportQuery): Promise<Blob> {
  const res = await baseApi.get("/client/report/export", {
    params,
    responseType: "blob",
  });

  return res.data as Blob;
}
