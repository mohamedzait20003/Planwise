"use client";

import { useQuery } from "@tanstack/react-query";

import { exportReportCsv, getReport } from "@/lib/handlers/report";
import type { ReportOutcome } from "@/lib/handlers/report";
import { reportKeys } from "@/lib/api/keys";
import type { ReportQuery } from "@/lib/api/types";

/** How often to ask again while a run is still being computed. */
const POLL_MS = 2_000;

/**
 * The report, waiting for it if it is still being generated.
 *
 * Generation is queued, so the first ask usually answers "pending" and the
 * numbers arrive on a later poll. `refetchInterval` drives that, and stops the
 * moment the run is ready or has failed — a failed run against unchanged data
 * would fail identically forever, so polling it is just noise.
 *
 * Polling hits the same endpoint as the first request, which is safe because it
 * is idempotent: it leaves a job already in flight alone rather than queueing
 * another.
 *
 * `staleTime` is 0 deliberately, unlike the other lists. Any write bumps the
 * server's data version and the stored run becomes stale, so a cached report is
 * the one thing here that must never be served without asking.
 */
export function useReport(params: ReportQuery) {
  return useQuery({
    queryKey: reportKeys.query(params),
    queryFn: () => getReport(params),
    enabled: Boolean(params.from && params.to),
    staleTime: 0,
    gcTime: 5 * 60_000,
    refetchInterval: (query) => {
      const outcome = query.state.data as ReportOutcome | undefined;
      if (!outcome || outcome.ready) return false;

      return outcome.progress.status === "failed" ? false : POLL_MS;
    },
  });
}

/**
 * Triggers a CSV download.
 *
 * Not a hook — there is nothing to cache and no state to render. The object URL
 * is revoked straight after the click; leaving it alive pins the blob in memory
 * for the lifetime of the document.
 */
export async function downloadReportCsv(params: ReportQuery): Promise<void> {
  const blob = await exportReportCsv(params);
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `planwise-report-${params.from}-to-${params.to}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}
