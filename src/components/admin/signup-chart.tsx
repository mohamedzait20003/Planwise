"use client";

import { useState } from "react";
import { scaleBand, scaleLinear } from "d3-scale";
import { motion, useReducedMotion } from "framer-motion";

import type { SignupPoint } from "@/lib/api/types";
import { monthLong, monthTerse } from "@/lib/utils/month";
import { useChartSize } from "@/lib/utils/use-chart-size";
import { cn } from "@/lib/utils/utils";

/**
 * Signups per month over the last year.
 *
 * A bar chart because the quantity is a count per discrete bucket — there is
 * nothing continuous between March and April to draw a line across. Same
 * boundary as every other chart here: d3 computes the scales, React renders the
 * marks, and the width comes from a `ResizeObserver` rather than a `viewBox` so
 * the 11px labels stay 11px on a narrow card.
 */

const HEIGHT = 200;
const MARGIN = { top: 16, right: 8, bottom: 26, left: 34 } as const;

export function SignupChart({
  points,
  className,
}: Readonly<{ points: readonly SignupPoint[]; className?: string }>) {
  const { ref, width } = useChartSize<HTMLDivElement>();
  const reduced = useReducedMotion();

  /** Which bar the pointer or keyboard is on. */
  const [active, setActive] = useState<string | null>(null);

  const plotWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;

  const busiest = Math.max(...points.map((point) => point.count), 0);
  const total = points.reduce((sum, point) => sum + point.count, 0);

  const x = scaleBand()
    .domain(points.map((point) => point.month))
    .range([0, plotWidth])
    .padding(0.28);

  // Never zero-height: a domain of [0, 0] would put every bar on the baseline
  // and divide by zero on the way there. An empty year draws a flat axis, which
  // is the honest picture of it.
  const y = scaleLinear().domain([0, Math.max(busiest, 1)]).range([plotHeight, 0]);

  // Whole numbers only — "1.5 signups" is not a quantity that exists.
  const ticks = y.ticks(Math.min(4, Math.max(busiest, 1))).filter(Number.isInteger);

  const selected = points.find((point) => point.month === active) ?? null;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {total === 0
            ? "No signups in the last 12 months"
            : `${total.toLocaleString()} in the last 12 months`}
        </p>

        {/* Reserved whether or not a bar is active, so hovering the chart does
            not reflow the header above it. */}
        <p className="min-h-4 text-xs font-medium tabular">
          {selected && (
            <>
              <span className="text-muted-foreground">
                {monthLong(selected.month)}
                {" · "}
              </span>
              {selected.count === 1 ? "1 signup" : `${selected.count} signups`}
            </>
          )}
        </p>
      </div>

      <div ref={ref} className="w-full">
        {width > 0 && (
          <svg
            width={width}
            height={HEIGHT}
            role="img"
            aria-label={`Signups per month for the last 12 months. ${total} in total.`}
            onPointerLeave={() => setActive(null)}
          >
            <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
              {ticks.map((tick) => (
                <g key={tick} transform={`translate(0,${y(tick)})`}>
                  <line
                    x2={plotWidth}
                    className="stroke-border/60"
                    strokeDasharray={tick === 0 ? undefined : "3 3"}
                  />
                  <text
                    x={-8}
                    dy="0.32em"
                    textAnchor="end"
                    className="fill-muted-foreground text-[11px] tabular"
                  >
                    {tick}
                  </text>
                </g>
              ))}

              {points.map((point, index) => {
                const barX = x(point.month) ?? 0;
                const barHeight = plotHeight - y(point.count);
                const isActive = point.month === active;

                return (
                  <g key={point.month}>
                    {/* A full-height target, so the pointer and the Tab key
                        reach a quiet month whose bar is a few pixels tall. */}
                    <rect
                      x={barX}
                      y={0}
                      width={x.bandwidth()}
                      height={plotHeight}
                      fill="transparent"
                      tabIndex={0}
                      role="button"
                      aria-label={`${monthLong(point.month)}: ${point.count} signups`}
                      className="cursor-pointer outline-none focus-visible:fill-primary/8"
                      onPointerEnter={() => setActive(point.month)}
                      onFocus={() => setActive(point.month)}
                      onBlur={() => setActive(null)}
                    />

                    <motion.rect
                      x={barX}
                      width={x.bandwidth()}
                      rx={4}
                      className={cn(
                        "pointer-events-none transition-colors",
                        isActive ? "fill-primary" : "fill-primary/45"
                      )}
                      initial={
                        reduced
                          ? false
                          : { y: plotHeight, height: 0 }
                      }
                      animate={{ y: y(point.count), height: barHeight }}
                      transition={{
                        duration: 0.45,
                        // Staggered left to right, so the year reads in the
                        // direction it is measured.
                        delay: reduced ? 0 : index * 0.035,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                    />
                  </g>
                );
              })}

              {points.map((point, index) => {
                const barX = (x(point.month) ?? 0) + x.bandwidth() / 2;
                // Every other label on narrow cards: twelve three-letter months
                // under 300px collide, and a rotated axis is worse than a
                // sparser one.
                const crowded = plotWidth < 380 && index % 2 === 1;

                return (
                  <text
                    key={point.month}
                    x={barX}
                    y={plotHeight + 16}
                    textAnchor="middle"
                    className={cn(
                      "fill-muted-foreground text-[11px]",
                      crowded && "hidden"
                    )}
                  >
                    {monthTerse(point.month)}
                  </text>
                );
              })}
            </g>
          </svg>
        )}
      </div>

      {/* The numbers themselves, for a screen reader. An aria-label alone gives
          the shape of the year and withholds every figure in it. */}
      <table className="sr-only">
        <caption>Signups per month</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Signups</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.month}>
              <th scope="row">{monthLong(point.month)}</th>
              <td>{point.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
