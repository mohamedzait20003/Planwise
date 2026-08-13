"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { scaleBand, scaleLinear } from "d3-scale";
import { greatest, least, max } from "d3-array";

import {
  CHART_HEIGHT,
  type ChartPoint,
  GridLines,
  MARGIN,
  MonthAxis,
} from "./chart-kit";
import { formatSignedCurrency } from "@/lib/utils/variance";
import { monthShort } from "@/lib/utils/month";
import { cn } from "@/lib/utils/utils";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/**
 * Net variance per month, as bars either side of the plan line.
 *
 * This axis IS zeroed, unlike the trend chart's. A bar encodes its value as
 * length from a baseline, so moving the baseline rescales every bar into a lie;
 * the zero line here is also the plan line, which is the comparison the whole
 * chart is making.
 *
 * The domain is made symmetric around zero so a $500 overspend and a $500
 * saving draw the same length in opposite directions — without that, a range
 * with one big overspend would render every saving as a sliver.
 */
export function VarianceBars({
  points,
  active,
  onActiveChange,
  lockedMonths,
  width,
}: Readonly<{
  points: ChartPoint[];
  active: number | null;
  onActiveChange: (index: number | null) => void;
  lockedMonths?: ReadonlySet<string>;
  width: number;
}>) {
  const reduced = useReducedMotion();

  const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
  const innerHeight = CHART_HEIGHT - MARGIN.top - MARGIN.bottom;

  const { x, y, months, extremes } = useMemo(() => {
    const monthList = points.map((p) => p.month);

    const band = scaleBand<string>().domain(monthList).range([0, innerWidth]).padding(0.35);

    const reach = max(points, (p) => Math.abs(p.variance)) ?? 0;
    const bound = reach === 0 ? 1 : reach * 1.15;

    const linear = scaleLinear().domain([-bound, bound]).nice(4).range([innerHeight, 0]);

    // The best and worst months get a permanent label, so the two figures a
    // reader is looking for do not require a hover to find. `greatest`/`least`
    // rather than a bare `reduce`: they return undefined on an empty input
    // instead of throwing, so the empty case needs no separate guard.
    const marks = new Set(
      [
        greatest(points, (p) => p.variance)?.month,
        least(points, (p) => p.variance)?.month,
      ].filter((month) => month !== undefined)
    );

    return { x: band, y: linear, months: monthList, extremes: marks };
  }, [points, innerWidth, innerHeight]);

  const zero = y(0);
  const at = (month: string) => (x(month) ?? 0) + x.bandwidth() / 2;

  return (
    <svg
      width={width}
      height={CHART_HEIGHT}
      className="overflow-visible"
      aria-hidden
    >
      <g transform={`translate(${MARGIN.left}, ${MARGIN.top})`}>
        <GridLines y={y} width={innerWidth} count={4} />

        {points.map((point, i) => {
          const isActive = i === active;
          const over = point.variance > 0;
          const height = Math.abs(y(point.variance) - zero);
          // A month that landed exactly on plan still gets a visible sliver,
          // so "on plan" reads as a result rather than as missing data.
          const drawn = point.variance === 0 ? 2 : Math.max(height, 2);
          const top = over ? zero - drawn : zero;

          return (
            <g key={point.month}>
              <motion.rect
                x={x(point.month) ?? 0}
                width={x.bandwidth()}
                rx={3}
                className={cn(
                  point.variance === 0 && "fill-muted-foreground",
                  point.variance > 0 && "fill-mark-unfavorable",
                  point.variance < 0 && "fill-mark-favorable"
                )}
                fillOpacity={active === null || isActive ? 1 : 0.45}
                initial={reduced ? false : { y: zero, height: 0 }}
                animate={{ y: top, height: drawn }}
                transition={{
                  duration: reduced ? 0 : 0.6,
                  delay: reduced ? 0 : i * 0.05,
                  ease: EASE_OUT,
                }}
              />

              {extremes.has(point.month) && point.variance !== 0 && (
                <motion.text
                  x={at(point.month)}
                  y={over ? top - 6 : top + drawn + 14}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[10px] font-medium tabular"
                  initial={reduced ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: reduced ? 0 : 0.45 + i * 0.05 }}
                >
                  {formatSignedCurrency(point.variance)}
                </motion.text>
              )}

              {/* Full-height hit area: a 6px-tall bar is not a target */}
              <rect
                x={x(point.month) ?? 0}
                width={x.bandwidth()}
                height={innerHeight}
                fill="transparent"
                className="cursor-pointer"
                onPointerEnter={() => onActiveChange(i)}
                onPointerLeave={(event) => {
                  if (event.pointerType === "mouse") onActiveChange(null);
                }}
              />
            </g>
          );
        })}
        <line
          y1={zero}
          y2={zero}
          x2={innerWidth}
          className="stroke-border"
          strokeWidth={1.5}
        />
        {active !== null && points[active] && (
          <motion.line
            x1={0}
            x2={x.bandwidth()}
            y1={innerHeight + 4}
            y2={innerHeight + 4}
            className="stroke-foreground"
            strokeWidth={2}
            strokeLinecap="round"
            initial={false}
            animate={{ x: x(points[active].month) ?? 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 36 }}
          />
        )}

        <MonthAxis
          months={months}
          at={at}
          y={innerHeight}
          active={active}
          lockedMonths={lockedMonths}
        />
      </g>
    </svg>
  );
}

/** Summary sentence for the chart's `aria-label`. */
export function varianceSummary(points: readonly ChartPoint[]) {
  if (points.length === 0) return "No months in this range.";

  const over = points.filter((p) => p.variance > 0).length;
  const under = points.filter((p) => p.variance < 0).length;
  const worst = greatest(points, (p) => p.variance);

  return (
    `Net variance for ${points.length} months: ` +
    `${over} over plan, ${under} under plan. ` +
    (worst
      ? `Largest overspend ${monthShort(worst.month)} at ${formatSignedCurrency(worst.variance)}. `
      : "") +
    `Step through the months with the arrow buttons below the chart.`
  );
}
