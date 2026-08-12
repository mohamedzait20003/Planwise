"use client";

import { useState } from "react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils/utils";
import type { ReportMonthTotal } from "@/lib/api/types";
import { monthShort, monthTerse } from "@/lib/utils/month";
import { formatSignedCurrency, formatVariancePct } from "@/lib/utils/variance";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

type Bar = ReportMonthTotal & {
  extent: number;
  over: boolean;
};

function build(months: ReportMonthTotal[]) {
  const overMax = Math.max(0, ...months.map((m) => m.variance));
  const underMax = Math.max(0, ...months.map((m) => -m.variance));
  const span = overMax + underMax;

  if (span === 0) {
    return {
      zeroAt: 50,
      bars: months.map((m) => ({ ...m, extent: 0, over: false })),
    };
  }

  return {
    zeroAt: (overMax / span) * 100,
    bars: months.map(
      (m): Bar => ({
        ...m,
        extent: (Math.abs(m.variance) / span) * 100,
        over: m.variance > 0,
      })
    ),
  };
}

function varianceInk(variance: number): string {
  if (variance > 0) return "text-unfavorable";
  return variance < 0 ? "text-favorable" : "text-foreground";
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2.5 rounded-[3px] bg-mark-unfavorable" />
        <span>Over plan</span>
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2.5 rounded-[3px] bg-mark-favorable" />
        <span>Under plan</span>
      </span>
    </div>
  );
}

export function VarianceChart({
  months,
  className,
}: Readonly<{ months: ReportMonthTotal[]; className?: string }>) {
  const [hovered, setHovered] = useState<string | null>(null);
  const { zeroAt, bars } = build(months);

  if (bars.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        No months in this range.
      </p>
    );
  }

  const extremes = new Set(
    [
      bars.reduce((a, b) => (b.variance > a.variance ? b : a), bars[0]).month,
      bars.reduce((a, b) => (b.variance < a.variance ? b : a), bars[0]).month,
    ].filter(Boolean)
  );

  return (
    <div className={cn("space-y-4", className)}>
      <Legend />
      <div className="h-56 py-5 sm:h-64">
      <div className="relative h-full">
        <div
          className="absolute inset-x-0 z-0 border-t border-dashed border-border"
          style={{ top: `${zeroAt}%` }}
        >
          <span className="absolute -top-2 -left-1 bg-card px-1 text-[10px] text-muted-foreground">
            plan
          </span>
        </div>

        <div className="relative z-10 flex h-full items-stretch gap-2 sm:gap-3">
          {bars.map((bar, index) => {
            const active = hovered === bar.month;
            const label = formatSignedCurrency(bar.variance);

            return (
              <div
                key={bar.month}
                className="group relative flex-1"
                onMouseEnter={() => setHovered(bar.month)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(bar.month)}
                onBlur={() => setHovered(null)}
                role="img"
                aria-label={`${monthShort(bar.month)}: ${label}, ${formatVariancePct(
                  bar.plan === 0 ? null : (bar.variance / bar.plan) * 100
                )} against a plan of ${bar.plan}`}
              >
                <motion.div
                  className={cn(
                    "absolute inset-x-0 mx-auto w-full max-w-14",
                    bar.over ? "rounded-t bg-mark-unfavorable" : "rounded-b bg-mark-favorable",
                    "ring-2 ring-card",
                    active && "brightness-110"
                  )}
                  style={
                    bar.over
                      ? { bottom: `${100 - zeroAt}%` }
                      : { top: `${zeroAt}%` }
                  }
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(bar.extent, bar.variance === 0 ? 0 : 1.5)}%` }}
                  transition={{
                    duration: 0.6,
                    delay: index * 0.05,
                    ease: EASE_OUT,
                  }}
                />

                {extremes.has(bar.month) && bar.variance !== 0 && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 + index * 0.05 }}
                    data-numeric
                    className="absolute inset-x-0 text-center text-[11px] font-medium tabular text-muted-foreground"
                    style={
                      bar.over
                        ? { bottom: `calc(${100 - zeroAt}% + ${bar.extent}% + 4px)` }
                        : { top: `calc(${zeroAt}% + ${bar.extent}% + 4px)` }
                    }
                  >
                    {label}
                  </motion.span>
                )}

                {active && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={
                      bar.over ? { bottom: `calc(${100 - zeroAt}% + 8px)` } : { top: `calc(${zeroAt}% + 8px)` }
                    }
                    className="pointer-events-none absolute left-1/2 z-20 w-max -translate-x-1/2 rounded-xl border border-border/60 bg-popover px-3 py-2 text-xs shadow-xl"
                  >
                    <p className="font-medium">{monthShort(bar.month)}</p>
                    <dl className="mt-1 space-y-0.5 text-muted-foreground">
                      <div className="flex justify-between gap-4">
                        <dt>Plan</dt>
                        <dd data-numeric className="tabular text-foreground">
                          {bar.plan.toLocaleString("en-US", {
                            style: "currency",
                            currency: "USD",
                            maximumFractionDigits: 0,
                          })}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt>Actual</dt>
                        <dd data-numeric className="tabular text-foreground">
                          {bar.actual.toLocaleString("en-US", {
                            style: "currency",
                            currency: "USD",
                            maximumFractionDigits: 0,
                          })}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4 border-t border-border/60 pt-0.5">
                        <dt>Variance</dt>
                        <dd
                          data-numeric
                          className={cn("tabular font-medium", varianceInk(bar.variance))}
                        >
                          {label}
                        </dd>
                      </div>
                    </dl>
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      </div>

      <div className="flex items-stretch gap-2 sm:gap-3">
        {bars.map((bar) => (
          <div
            key={bar.month}
            className={cn(
              "flex-1 text-center text-xs transition-colors",
              hovered === bar.month
                ? "font-medium text-foreground"
                : "text-muted-foreground"
            )}
          >
            {monthTerse(bar.month)}
          </div>
        ))}
      </div>
    </div>
  );
}
