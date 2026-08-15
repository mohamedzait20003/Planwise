"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";


import {
  ChartDataTable,
  ChartLegend,
  ChartReadout,
  CHART_HEIGHT,
} from "@/components/charts/chart-kit";
import { cn } from "@/lib/utils/utils";
import { Button } from "@/components/ui/button";
import type { ReportMonthTotal } from "@/lib/api/types";
import { Segmented } from "@/components/common/segmented";
import { TrendChart, trendSummary } from "@/components/charts/trend-chart";
import { VarianceBars, varianceSummary } from "@/components/charts/variance-bars";
import { useChartSize } from "@/lib/utils/use-chart-size";


type View = "trend" | "variance";

/**
 * The report's chart, in two readings of the same months.
 *
 * Trend shows plan and actual as two series with the gap between them shaded;
 * variance shows only the gap, as bars either side of the plan line. They
 * answer different questions — "what happened" against "by how much" — and
 * neither subsumes the other, so both are kept and the toggle is cheap.
 *
 * The selected month is held here rather than inside either chart, so
 * switching views keeps your place: the crosshair you left on March is still
 * on March when the bars arrive.
 */
export function VarianceChart({
  months,
  lockedMonths,
  className,
}: Readonly<{
  months: ReportMonthTotal[];
  lockedMonths?: ReadonlySet<string>;
  className?: string;
}>) {
  const [view, setView] = useState<View>("trend");
  const [active, setActive] = useState<number | null>(null);
  const { ref, width } = useChartSize<HTMLDivElement>();

  if (months.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        No months in this range.
      </p>
    );
  }

  const summary = view === "trend" ? trendSummary(months) : varianceSummary(months);
  const lockedCount = months.filter((m) => lockedMonths?.has(m.month)).length;

  const last = months.length - 1;

  function step(delta: number) {
    setActive((current) => {
      if (current === null) return delta > 0 ? 0 : last;
      return Math.min(Math.max(current + delta, 0), last);
    });
  }

  return (
    <figure className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ChartLegend lockedCount={lockedCount} />

        <Segmented
          layoutId="chart-view"
          label="Chart view"
          value={view}
          onChange={setView}
          className="shrink-0"
          options={[
            { value: "trend", label: "Trend" },
            { value: "variance", label: "Variance" },
          ]}
        />
      </div>
      <p className="sr-only">{summary}</p>

      <div
        ref={ref}
        style={{ height: CHART_HEIGHT }}
        className="relative"
      >
        {width > 0 && (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={view}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
              transition={{ duration: 0.25 }}
            >
              {view === "trend" ? (
                <TrendChart
                  points={months}
                  active={active}
                  onActiveChange={setActive}
                  lockedMonths={lockedMonths}
                  width={width}
                />
              ) : (
                <VarianceBars
                  points={months}
                  active={active}
                  onActiveChange={setActive}
                  lockedMonths={lockedMonths}
                  width={width}
                />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      <figcaption className="flex items-center gap-3 border-t border-border/60 pt-3 text-sm">
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="rounded-lg"
            aria-label="Previous month"
            disabled={active === 0}
            onClick={() => step(-1)}
          >
            <ChevronLeftIcon aria-hidden className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="rounded-lg"
            aria-label="Next month"
            disabled={active === last}
            onClick={() => step(1)}
          >
            <ChevronRightIcon aria-hidden className="size-4" />
          </Button>
        </div>

        <div aria-live="polite" className="min-w-0 flex-1">
          <ChartReadout
            point={active === null ? null : months[active]}
            placeholder="Hover a month, or step through them with the arrows."
          />
        </div>
      </figcaption>

      <ChartDataTable
        points={months}
        caption={
          view === "trend"
            ? "Plan, actual and variance by month"
            : "Net variance by month"
        }
      />
    </figure>
  );
}
