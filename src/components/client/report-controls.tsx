"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarRangeIcon, LayersIcon, TriangleAlertIcon } from "lucide-react";

import { Segmented } from "@/components/client/segmented";
import { Label } from "@/components/ui/label";
import {
  addMonths,
  isMonth,
  monthShort,
  monthsBetween,
  quarterOf,
  yearOf,
} from "@/lib/utils/month";
import type { MonthRange } from "@/lib/utils/month";
import { categorySolid } from "@/lib/utils/category-color";
import type { Category } from "@/lib/api/types";
import { cn } from "@/lib/utils/utils";

type Mode = "quarter" | "last-quarter" | "year" | "custom";

/**
 * What a report is going to be run over.
 *
 * Presets first, free months second. Nearly every run is a quarter or a year,
 * and two date inputs make the reader assemble that themselves each time —
 * so the common ranges are one click and the arbitrary one is a click further
 * in. The from/to fields are not hidden to save space; they are hidden because
 * offering them first implies they are the expected way to answer.
 *
 * The mode is derived from the range rather than stored beside it, so a range
 * that happens to be this quarter lights up "This quarter" however it was
 * arrived at — there is no second source of truth to drift.
 */
export function ReportControls({
  range,
  onRangeChange,
  categoryId,
  onCategoryChange,
  categories,
  anchor,
  className,
}: Readonly<{
  range: MonthRange;
  onRangeChange: (range: MonthRange) => void;
  categoryId: string;
  onCategoryChange: (id: string) => void;
  categories: readonly Category[];
  /** Month the presets are computed from — usually the current month. */
  anchor: string;
  className?: string;
}>) {
  const fromId = useId();
  const toId = useId();
  const filterId = useId();

  // Set when the reader asks for custom months explicitly, so the fields stay
  // open even while the range still happens to match a preset.
  const [pinnedCustom, setPinnedCustom] = useState(false);

  const presets = [
    { id: "quarter" as const, label: "Quarter", range: quarterOf(anchor) },
    {
      id: "last-quarter" as const,
      label: "Last quarter",
      range: quarterOf(addMonths(anchor, -3)),
    },
    { id: "year" as const, label: "Year", range: yearOf(anchor) },
  ];

  const matched = presets.find(
    (preset) => preset.range.from === range.from && preset.range.to === range.to
  );
  const mode: Mode = pinnedCustom || !matched ? "custom" : matched.id;

  const inverted = range.from > range.to;
  const span = monthsBetween(range.from, range.to).length;

  const selected = categories.find((category) => category.id === categoryId);

  function onModeChange(next: Mode) {
    if (next === "custom") {
      setPinnedCustom(true);
      return;
    }

    setPinnedCustom(false);
    const preset = presets.find((entry) => entry.id === next);
    if (preset) onRangeChange(preset.range);
  }

  return (
    <section
      className={cn(
        "surface-glass overflow-hidden rounded-2xl border border-border/60",
        className
      )}
    >
      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-8">
        {/* ---- Range ---------------------------------------------------- */}
        <div className="space-y-3">
          <p className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            <CalendarRangeIcon aria-hidden className="size-3.5" />
            Range
          </p>

          <Segmented
            layoutId="report-range"
            label="Report range"
            value={mode}
            onChange={onModeChange}
            options={[
              ...presets.map((preset) => ({
                value: preset.id,
                label: preset.label,
              })),
              { value: "custom" as const, label: "Custom" },
            ]}
          />

          <AnimatePresence initial={false}>
            {mode === "custom" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0, transition: { duration: 0.14 } }}
                transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap items-end gap-3 pt-1">
                  <div className="space-y-1.5">
                    <Label htmlFor={fromId} className="text-xs text-muted-foreground">
                      From
                    </Label>
                    <input
                      id={fromId}
                      type="month"
                      value={range.from}
                      onChange={(event) => {
                        if (isMonth(event.target.value)) {
                          onRangeChange({ ...range, from: event.target.value });
                        }
                      }}
                      className="h-10 rounded-xl border border-input bg-background px-3 text-sm tabular transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none dark:bg-input/30"
                    />
                  </div>

                  <span aria-hidden className="pb-3 text-muted-foreground">
                    →
                  </span>

                  <div className="space-y-1.5">
                    <Label htmlFor={toId} className="text-xs text-muted-foreground">
                      To
                    </Label>
                    <input
                      id={toId}
                      type="month"
                      value={range.to}
                      onChange={(event) => {
                        if (isMonth(event.target.value)) {
                          onRangeChange({ ...range, to: event.target.value });
                        }
                      }}
                      className="h-10 rounded-xl border border-input bg-background px-3 text-sm tabular transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none dark:bg-input/30"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ---- Category -------------------------------------------------- */}
        <div className="space-y-3">
          <p className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            <LayersIcon aria-hidden className="size-3.5" />
            Category
          </p>

          <div className="relative">
            {/* The chip marks the filter with the same colour the category
                carries everywhere else, so a filtered report is recognisable
                at a glance rather than by reading the select. */}
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute top-1/2 left-3 size-2.5 -translate-y-1/2 rounded-[3px]",
                selected ? categorySolid(selected.id) : "bg-muted-foreground/40"
              )}
            />
            <select
              id={filterId}
              aria-label="Filter by category"
              value={categoryId}
              onChange={(event) => onCategoryChange(event.target.value)}
              className="h-10 w-full rounded-xl border border-input bg-background pr-3 pl-8 text-sm transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none dark:bg-input/30"
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                  {category.archivedAt ? " (archived)" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ---- What this will produce -------------------------------------- */}
      <div className="border-t border-border/60 bg-muted/25 px-5 py-3">
        {inverted ? (
          <p
            role="alert"
            className="flex items-center gap-2 text-xs text-unfavorable"
          >
            <TriangleAlertIcon aria-hidden className="size-3.5 shrink-0" />
            The start month is after the end month, so this range covers nothing.
          </p>
        ) : (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span className="font-medium text-foreground tabular">
              {monthShort(range.from)}
              {range.from !== range.to && ` – ${monthShort(range.to)}`}
            </span>
            <span aria-hidden>·</span>
            <span className="tabular">
              {span} month{span === 1 ? "" : "s"}
            </span>
            <span aria-hidden>·</span>
            <span>{selected ? selected.name : "all categories"}</span>
          </p>
        )}
      </div>
    </section>
  );
}
