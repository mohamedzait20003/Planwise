"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  CheckIcon,
  ClockIcon,
  LoaderCircleIcon,
  ScrollTextIcon,
  TriangleAlertIcon,
} from "lucide-react";

import { VarianceAmount } from "./variance";
import { LoadingRows } from "./states";
import type { Category, ReportRunSummary } from "@/lib/api/types";
import { categorySolid } from "@/lib/utils/category-color";
import { currentMonth, monthShort, monthTerse, monthsBetween } from "@/lib/utils/month";
import { cn } from "@/lib/utils/utils";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

const stamp = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

/** Relative for the first day, absolute after — "31h ago" stops helping. */
function when(iso: string) {
  const then = new Date(iso);
  const minutes = Math.round((Date.now() - then.getTime()) / 60_000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h ago`;
  return stamp.format(then);
}

/**
 * "Feb – Aug 2026" rather than "Feb 2026 – Aug 2026".
 *
 * Within a single year the second year is noise, and the identity column is
 * narrow enough that the noise is what gets truncated away.
 */
function describeRange(from: string, to: string) {
  if (from === to) return monthShort(from);
  if (from.slice(0, 4) === to.slice(0, 4)) {
    return `${monthTerse(from)} – ${monthShort(to)}`;
  }
  return `${monthShort(from)} – ${monthShort(to)}`;
}

/* the axis */

type Domain = { months: string[]; nowIndex: number; stride: number };

/**
 * The span every run is drawn against.
 *
 * Bounded by the runs themselves rather than by the calendar: a user with three
 * quarters of history should see those three quarters filling the width, not
 * compressed into a corner of some fixed window.
 */
function useDomain(runs: readonly ReportRunSummary[]): Domain {
  return useMemo(() => {
    if (runs.length === 0) return { months: [], nowIndex: -1, stride: 1 };

    let start = runs[0].from;
    let end = runs[0].to;
    for (const run of runs) {
      if (run.from < start) start = run.from;
      if (run.to > end) end = run.to;
    }

    const months = monthsBetween(start, end);

    // Labels thin out as the span grows, so the axis never packs text tighter
    // than it can be read. Beyond three years only the year starts are named.
    let stride = 12;
    if (months.length <= 12) stride = 1;
    else if (months.length <= 36) stride = 3;

    // Only marked when today actually falls inside the span. Stretching the
    // domain to reach the present would squash a year of history to make room
    // for an empty gap.
    return { months, nowIndex: months.indexOf(currentMonth()), stride };
  }, [runs]);
}

function Axis({ domain }: Readonly<{ domain: Domain }>) {
  const { months, nowIndex, stride } = domain;
  const total = months.length;

  return (
    <div aria-hidden className="relative h-5">
      {months.map((month, i) => {
        const isYearStart = month.endsWith("-01");
        if (i % stride !== 0 && !isYearStart) return null;

        return (
          <span
            key={month}
            className="absolute top-0 -translate-x-1/2 text-[10px] whitespace-nowrap text-muted-foreground/70 tabular"
            style={{ left: `${((i + 0.5) / total) * 100}%` }}
          >
            {monthTerse(month)}
            {isYearStart && (
              <span className="ml-0.5 opacity-60">
                &rsquo;{month.slice(2, 4)}
              </span>
            )}
          </span>
        );
      })}

      {/* Sits at the foot of the axis, directly above the line that runs down
          through every track, so the two read as one mark rather than as a
          label that happens to be near a rule. */}
      {nowIndex >= 0 && (
        <span
          className="absolute bottom-0 -translate-x-1/2 text-[9px] leading-none font-medium tracking-wider text-primary uppercase"
          style={{ left: `${((nowIndex + 0.5) / total) * 100}%` }}
        >
          now
        </span>
      )}
    </div>
  );
}

/* the bar */

function Track({
  run,
  domain,
  category,
  isActive,
  index,
}: Readonly<{
  run: ReportRunSummary;
  domain: Domain;
  category: Category | undefined;
  isActive: boolean;
  index: number;
}>) {
  const reduced = useReducedMotion();
  const { months, nowIndex } = domain;
  const total = months.length;

  const startIndex = months.indexOf(run.from);
  const endIndex = months.indexOf(run.to);
  if (startIndex < 0 || endIndex < 0) return null;

  const left = (startIndex / total) * 100;
  const width = ((endIndex - startIndex + 1) / total) * 100;

  const fill = category ? categorySolid(category.id) : "bg-primary";

  return (
    <span aria-hidden className="relative block h-3 w-full">
      {/* Year boundaries only. A line per month would be noise; a line per year
          is the one division a reader is actually orienting by. */}
      {months.map((month, i) =>
        month.endsWith("-01") && i > 0 ? (
          <span
            key={month}
            className="absolute inset-y-0 w-px bg-border"
            style={{ left: `${(i / total) * 100}%` }}
          />
        ) : null
      )}

      <span className="absolute inset-0 rounded-full bg-muted/60" />

      {nowIndex >= 0 && (
        <span
          className="absolute inset-y-0 w-px bg-primary/30"
          style={{ left: `${((nowIndex + 0.5) / total) * 100}%` }}
        />
      )}

      <motion.span
        className={cn(
          "absolute inset-y-0 rounded-full",
          run.status === "failed"
            ? "bg-unfavorable/15 ring-1 ring-unfavorable/50"
            : fill,
          // Status is carried by the bar's own treatment as well as by the
          // label beside it: a faded, dashed bar reads as "not current" before
          // the word is read.
          run.status === "ready" &&
            run.stale &&
            "opacity-45 outline-1 outline-dashed outline-locked/70",
          (run.status === "pending" || run.status === "processing") &&
            "animate-pulse opacity-70",
          isActive && "ring-2 ring-primary/60 ring-offset-1 ring-offset-card"
        )}
        style={{ left: `${left}%`, width: `${width}%`, originX: 0 }}
        initial={reduced ? false : { scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{
          duration: reduced ? 0 : 0.55,
          delay: reduced ? 0 : index * 0.06,
          ease: EASE_OUT,
        }}
      />
    </span>
  );
}

/* -------------------------------------------------------------- the entry */

type Status = { label: string; tone: string; icon: typeof CheckIcon };

function statusOf(run: ReportRunSummary): Status {
  if (run.status === "failed") {
    return { label: "Failed", tone: "text-unfavorable", icon: TriangleAlertIcon };
  }
  if (run.status !== "ready") {
    return { label: "Running", tone: "text-info", icon: LoaderCircleIcon };
  }
  if (run.stale) {
    return { label: "Out of date", tone: "text-locked", icon: ClockIcon };
  }
  return { label: "Current", tone: "text-favorable", icon: CheckIcon };
}

/**
 * The ranges already run, drawn against one shared timeline.
 *
 * A report run is a claim about a span of months, and a list of text labels
 * throws that away — "Jan – Mar" and "Feb – Aug" read as two strings when they
 * are really two overlapping intervals. On a shared axis the overlap, the gaps
 * and the relative reach are all visible without reading a single date, and
 * picking up where you left off becomes a matter of pointing at the part of the
 * year you care about.
 *
 * One entry per range, not per generation: a run is keyed by its query, so
 * regenerating a range updates its bar rather than stacking a second one on the
 * same track.
 */
export function ReportHistory({
  runs,
  categories,
  activeFrom,
  activeTo,
  activeCategoryId,
  loading,
  onSelect,
  className,
}: Readonly<{
  runs: readonly ReportRunSummary[];
  categories: readonly Category[];
  activeFrom: string;
  activeTo: string;
  /** "" for every category, matching the screen's filter state. */
  activeCategoryId: string;
  loading: boolean;
  onSelect: (run: ReportRunSummary) => void;
  className?: string;
}>) {
  const domain = useDomain(runs);

  if (loading) return <LoadingRows rows={3} />;

  if (runs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/8 text-primary ring-1 ring-primary/15">
          <ScrollTextIcon aria-hidden className="size-5" />
        </span>
        <p className="max-w-sm text-sm leading-relaxed text-pretty text-muted-foreground">
          Nothing generated yet. Ranges you run appear here on a shared
          timeline, so you can come back to one without rebuilding it.
        </p>
      </div>
    );
  }

  const columns =
    "grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_auto]";

  return (
    <div className={cn("space-y-2", className)}>
      {/* The axis only earns its space where the tracks share a column. */}
      <div className={cn("hidden px-3 sm:grid", columns)}>
        <span />
        <Axis domain={domain} />
        <span className="w-32" />
      </div>

      <ul className="space-y-1">
        {runs.map((run, i) => {
          const category = run.categoryId
            ? categories.find((entry) => entry.id === run.categoryId)
            : undefined;

          const isActive =
            run.from === activeFrom &&
            run.to === activeTo &&
            (run.categoryId ?? "") === activeCategoryId;

          const span = monthsBetween(run.from, run.to).length;
          const status = statusOf(run);
          const label = category ? category.name : "All categories";
          const rangeText = describeRange(run.from, run.to);

          return (
            <motion.li
              key={run.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.04, ease: EASE_OUT }}
            >
              <button
                type="button"
                onClick={() => onSelect(run)}
                aria-current={isActive ? "true" : undefined}
                aria-label={`${label}, ${rangeText}, ${span} months, ${status.label.toLowerCase()}, computed ${when(run.computedAt ?? run.requestedAt)}. Load this report.`}
                className={cn(
                  "grid w-full items-center rounded-xl px-3 py-2.5 text-left transition-colors",
                  "focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none",
                  columns,
                  isActive
                    ? "bg-primary/8 ring-1 ring-primary/25"
                    : "hover:bg-muted/60"
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden
                    className={cn(
                      "size-2.5 shrink-0 rounded-[3px]",
                      category ? categorySolid(category.id) : "bg-primary"
                    )}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {label}
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground tabular">
                      {rangeText} · {span} mo
                    </span>
                  </span>
                </span>

                <Track
                  run={run}
                  domain={domain}
                  category={category}
                  isActive={isActive}
                  index={i}
                />

                <span className="flex items-center justify-between gap-3 sm:w-32 sm:flex-col sm:items-end sm:justify-center sm:gap-0.5">
                  {/* Always text, never hover-only — the figure is the reason
                      to pick one of these. */}
                  {run.status === "ready" ? (
                    <VarianceAmount
                      value={run.totals.variance}
                      className="text-sm"
                    />
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}

                  <span className="inline-flex items-center gap-1.5 text-[10px] whitespace-nowrap">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 font-medium",
                        status.tone
                      )}
                    >
                      <status.icon
                        aria-hidden
                        className={cn(
                          "size-2.5",
                          status.label === "Running" && "animate-spin"
                        )}
                      />
                      {status.label}
                    </span>
                    <span aria-hidden className="text-muted-foreground/50">
                      ·
                    </span>
                    <span className="text-muted-foreground tabular">
                      {when(run.computedAt ?? run.requestedAt)}
                    </span>
                  </span>
                </span>
              </button>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
