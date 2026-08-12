"use client";

import { useQuery } from "@tanstack/react-query";

import { exportReportCsv, getReport } from "@/lib/handlers/report";
import { reportKeys } from "@/lib/api/keys";
import type { ReportQuery } from "@/lib/api/types";

export function useReport(params: ReportQuery) {
  return useQuery({
    queryKey: reportKeys.query(params),
    queryFn: () => getReport(params),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    select: (res) => res.data,
    // A half-filled range would query for a period the user has not chosen yet.
    enabled: Boolean(params.from && params.to),
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
