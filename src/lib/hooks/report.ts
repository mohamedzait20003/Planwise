"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  exportReportCsv,
  generateReport,
  getReport,
  getReportHistory,
} from "@/lib/handlers/report";
import type { ReportOutcome } from "@/lib/handlers/report";
import { reportKeys } from "@/lib/api/keys";
import type { ApiError } from "@/lib/api";
import type { ReportQuery } from "@/lib/api/types";

/** How often to ask again while a run is actually being computed. */
const POLL_MS = 2_000;

/**
 * The stored report for a range.
 *
 * Read-only: opening a page never queues work. Generation is `useGenerateReport`,
 * which is what the Generate button calls.
 *
 * The outcome is unpacked here rather than in each screen, and not only to save
 * the repetition. TanStack's result is itself a union of states, so reading
 * `.data` off it yields `ReportOutcome | undefined` in a form the compiler will
 * no longer narrow on `status` — a caller writing
 * `outcome.status === "ready" ? outcome : undefined` gets back the whole union
 * and has to cast. Re-annotating the value here restores the discriminant, so
 * the narrowing happens once, in the one place that can do it honestly.
 *
 * Polling only runs while a job is genuinely in flight, and stops the moment it
 * settles either way. A failed run is not polled: it would fail identically
 * until something changes.
 */
export function useReport(params: ReportQuery) {
  const query = useQuery<ReportOutcome, ApiError>({
    queryKey: reportKeys.query(params),
    queryFn: () => getReport(params),
    enabled: Boolean(params.from && params.to),

    // A stored report is a snapshot, not live data, and it carries its own
    // staleness flag. Refetching on every window focus would cost a request to
    // learn what the payload already said.
    staleTime: 30_000,
    gcTime: 5 * 60_000,

    refetchInterval: (self) => {
      const status = (self.state.data as ReportOutcome | undefined)?.status;
      return status === "pending" || status === "processing" ? POLL_MS : false;
    },
  });

  const outcome: ReportOutcome | undefined = query.data;
  const ready = outcome?.status === "ready" ? outcome : undefined;

  return {
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,

    /** Nothing has ever been generated for this range. */
    none: outcome?.status === "none",
    /** A run is queued or being computed. */
    generating:
      outcome?.status === "pending" || outcome?.status === "processing",
    /** The reason the last attempt failed, or null. */
    failure:
      outcome?.status === "failed"
        ? (outcome.error ?? "The report failed to generate")
        : null,

    report: ready?.report,
    /** True when the numbers underneath have moved since this was computed. */
    stale: ready?.stale ?? false,
    computedAt: ready?.computedAt ?? null,
  };
}

/**
 * Generates a report for a range.
 *
 * Writes the result straight into the cache, so a run computed inline appears
 * without a second request; a queued one lands as `pending` and `useReport`
 * takes over polling from there.
 */
export function useGenerateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: generateReport,
    onSuccess: (outcome, params) => {
      queryClient.setQueryData(reportKeys.query(params), outcome);
      // A new run belongs in the history, and a regenerated one changes the
      // entry already there — either way the cached list is now wrong.
      queryClient.invalidateQueries({ queryKey: reportKeys.history() });
    },
  });
}

/**
 * The ranges already run.
 *
 * Short `staleTime`: every write bumps the data version, which flips entries to
 * stale, and the list is the one place a reader would notice. Not polled — a
 * pending entry settles on the report query's own poll, and that invalidates
 * this list when it lands.
 */
export function useReportHistory(limit?: number) {
  return useQuery({
    queryKey: reportKeys.history(),
    queryFn: () => getReportHistory(limit),
    staleTime: 10_000,
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
