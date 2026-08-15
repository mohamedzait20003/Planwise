"use client";

import {
  CircleAlertIcon,
  CircleCheckIcon,
  ClockIcon,
  LoaderCircleIcon,
} from "lucide-react";

import type { AdminOverview } from "@/lib/api/types";
import { monthShort } from "@/lib/utils/month";
import { formatRelativeTime } from "@/lib/utils/relative-time";
import { cn } from "@/lib/utils/utils";

/**
 * Report queue health.
 *
 * The four counts are the reason an operator opens this page, so they lead. The
 * failure list underneath is the worklist: a status count says something is
 * wrong, and only the errors say what.
 */

type Status = keyof AdminOverview["queue"];

const STATUS: Record<
  Status,
  { label: string; icon: typeof ClockIcon; tint: string; hint: string }
> = {
  pending: {
    label: "Pending",
    icon: ClockIcon,
    tint: "bg-locked/10 text-locked ring-locked/20",
    hint: "Queued, not yet picked up",
  },
  processing: {
    label: "Processing",
    icon: LoaderCircleIcon,
    tint: "bg-info/10 text-info ring-info/20",
    hint: "Being computed now",
  },
  ready: {
    label: "Ready",
    icon: CircleCheckIcon,
    tint: "bg-favorable/10 text-favorable ring-favorable/20",
    hint: "Computed and stored",
  },
  failed: {
    label: "Failed",
    icon: CircleAlertIcon,
    tint: "bg-unfavorable/10 text-unfavorable ring-unfavorable/20",
    hint: "Threw, and was recorded",
  },
};

const ORDER: Status[] = ["pending", "processing", "ready", "failed"];

export function QueueTotals({
  queue,
}: Readonly<{ queue: AdminOverview["queue"] }>) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {ORDER.map((status) => {
        const { label, icon: Icon, tint, hint } = STATUS[status];
        const count = queue[status];

        return (
          <li
            key={status}
            className="rounded-xl border border-border/60 bg-card/40 p-3"
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-lg ring-1",
                  tint
                )}
              >
                <Icon
                  aria-hidden
                  className={cn(
                    "size-3.5",
                    // Only spins when there is something to spin for — a
                    // permanent animation on a zero reads as a stuck process.
                    status === "processing" && count > 0 && "animate-spin"
                  )}
                />
              </span>
              <div className="min-w-0">
                <p className="text-lg leading-none font-semibold tabular">
                  {count.toLocaleString()}
                </p>
              </div>
            </div>
            <p className="mt-2 text-xs font-medium">{label}</p>
            <p className="text-xs text-muted-foreground">{hint}</p>
          </li>
        );
      })}
    </ul>
  );
}

export function FailureList({
  failures,
}: Readonly<{ failures: AdminOverview["failures"] }>) {
  if (failures.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-favorable/6 px-4 py-3 ring-1 ring-favorable/20">
        <CircleCheckIcon aria-hidden className="size-4 shrink-0 text-favorable" />
        <p className="text-sm text-muted-foreground">
          No failed runs. Every report that has been asked for was computed.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {failures.map((failure) => (
        <li
          key={failure.id}
          className="rounded-xl border border-unfavorable/25 bg-unfavorable/5 p-3"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <p className="text-sm font-medium break-all">{failure.userEmail}</p>
            <p className="text-xs text-muted-foreground tabular">
              {formatRelativeTime(failure.requestedAt)}
            </p>
          </div>

          <p className="mt-1 text-xs text-muted-foreground tabular">
            {monthShort(failure.from)} — {monthShort(failure.to)}
          </p>

          {/* The stored reason, verbatim. Paraphrasing the one string that says
              what broke is how a queue failure becomes unreproducible. */}
          <p className="mt-2 font-mono text-xs break-words text-unfavorable">
            {failure.error ?? "No reason was recorded."}
          </p>
        </li>
      ))}
    </ul>
  );
}
