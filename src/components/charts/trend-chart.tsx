"use client";

import { useId, useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { scaleLinear, scalePoint } from "d3-scale";
import { area, curveMonotoneX, line } from "d3-shape";
import { extent, greatest, least } from "d3-array";

import {
  CHART_HEIGHT,
  type ChartPoint,
  GridLines,
  HatchPattern,
  MARGIN,
  MonthAxis,
} from "./chart-kit";
import { monthShort } from "@/lib/utils/month";
import { cn } from "@/lib/utils/utils";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/**
 * Plan against actual over the range, with the gap between them shaded by its
 * own sign.
 *
 * `curveMonotoneX` rather than a cardinal or Catmull-Rom spline: those
 * overshoot between points, and an overshoot on a spend chart draws a month
 * that costs more than any month cost. Monotone interpolation is bounded by
 * the data it joins, so the curve cannot invent a figure.
 *
 * The y axis does not start at zero, which is correct for a line chart and
 * would not be for a bar: a line encodes position and slope, so a truncated
 * axis reads accurately, while a bar encodes magnitude by area and needs the
 * baseline. Zeroing this axis would flatten a $200 variance against a $20,000
 * plan into nothing, which is the one thing the chart exists to show.
 */
export function TrendChart({
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
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");

  const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
  const innerHeight = CHART_HEIGHT - MARGIN.top - MARGIN.bottom;

  const geometry = useMemo(() => {
    const months = points.map((p) => p.month);

    const x = scalePoint<string>()
      .domain(months)
      .range([0, innerWidth])
      .padding(0.5);

    const values = points.flatMap((p) => [p.plan, p.actual]);
    const [low = 0, high = 0] = extent(values);
    // Headroom proportional to the spread, with a floor so a perfectly flat
    // series still gets an axis instead of a single line through the middle.
    const pad = (high - low || Math.abs(high) || 1) * 0.18;

    const y = scaleLinear()
      .domain([low - pad, high + pad])
      .nice(5)
      .range([innerHeight, 0]);

    const at = (month: string) => x(month) ?? 0;

    const planPath =
      line<ChartPoint>()
        .x((d) => at(d.month))
        .y((d) => y(d.plan))
        .curve(curveMonotoneX)(points) ?? "";

    const actualPath =
      line<ChartPoint>()
        .x((d) => at(d.month))
        .y((d) => y(d.actual))
        .curve(curveMonotoneX)(points) ?? "";

    const bandPath =
      area<ChartPoint>()
        .x((d) => at(d.month))
        .y0((d) => y(d.plan))
        .y1((d) => y(d.actual))
        .curve(curveMonotoneX)(points) ?? "";

    return {
      x,
      y,
      at,
      planPath,
      actualPath,
      bandPath,
      months,
      // The plan curve closed to the top and bottom edges. Splitting the band
      // on exactly that line is what makes the tint flip at the crossings and
      // nowhere else — in SVG the y axis points down, so "above the plan line"
      // is where actual came in higher than planned.
      overClip: `${planPath} L ${innerWidth} 0 L 0 0 Z`,
      underClip: `${planPath} L ${innerWidth} ${innerHeight} L 0 ${innerHeight} Z`,
    };
  }, [points, innerWidth, innerHeight]);

  const { y, at, months } = geometry;

  const hatchId = `hatch-${uid}`;
  const overId = `over-${uid}`;
  const underId = `under-${uid}`;
  const revealId = `reveal-${uid}`;

  /** Nearest month to a pointer position, in plot coordinates. */
  function indexAt(clientX: number, element: SVGRectElement) {
    const box = element.getBoundingClientRect();
    const local = clientX - box.left;
    let nearest = 0;
    let best = Infinity;

    for (let i = 0; i < months.length; i++) {
      const distance = Math.abs(at(months[i]) - local);
      if (distance < best) {
        best = distance;
        nearest = i;
      }
    }
    return nearest;
  }

  const drawDuration = reduced ? 0 : 1.15;

  return (
    <svg
      width={width}
      height={CHART_HEIGHT}
      className="overflow-visible"
      aria-hidden
    >
      <defs>
        <HatchPattern id={hatchId} />
        <clipPath id={overId}>
          <path d={geometry.overClip} />
        </clipPath>
        <clipPath id={underId}>
          <path d={geometry.underClip} />
        </clipPath>
        <clipPath id={revealId}>
          {/* Sweeps left to right in step with the actual line, so the gap
              appears to open up behind the advancing measurement rather than
              fading in as a finished shape. */}
          <motion.rect
            x={0}
            y={-MARGIN.top}
            height={CHART_HEIGHT}
            initial={reduced ? false : { width: 0 }}
            animate={{ width: innerWidth }}
            transition={{ duration: drawDuration, ease: EASE_OUT }}
          />
        </clipPath>
      </defs>

      <g transform={`translate(${MARGIN.left}, ${MARGIN.top})`}>
        <GridLines y={y} width={innerWidth} />

        <g clipPath={`url(#${revealId})`}>
          <path
            d={geometry.bandPath}
            clipPath={`url(#${overId})`}
            className="fill-mark-unfavorable"
            fillOpacity={0.22}
          />
          <path
            d={geometry.bandPath}
            clipPath={`url(#${overId})`}
            fill={`url(#${hatchId})`}
          />
          <path
            d={geometry.bandPath}
            clipPath={`url(#${underId})`}
            className="fill-mark-favorable"
            fillOpacity={0.22}
          />
        </g>

        {/* Plan is dashed because a target is a claim, not a measurement — and
            because the two series must stay separable without colour. */}
        <motion.path
          d={geometry.planPath}
          fill="none"
          className="stroke-mark-plan"
          strokeWidth={2}
          strokeDasharray="5 5"
          strokeLinecap="round"
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45, ease: EASE_OUT }}
        />

        <motion.path
          d={geometry.actualPath}
          fill="none"
          className="stroke-mark-actual"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reduced ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: drawDuration, ease: EASE_OUT }}
        />

        {/* Crosshair, behind the dots so it never covers one */}
        {active !== null && points[active] && (
          <g transform={`translate(${at(points[active].month)}, 0)`}>
            <line
              y2={innerHeight}
              className="stroke-foreground"
              strokeOpacity={0.28}
              strokeDasharray="3 3"
            />
          </g>
        )}

        {points.map((point, i) => {
          const isActive = i === active;

          return (
            <g key={point.month} transform={`translate(${at(point.month)}, 0)`}>
              <motion.circle
                cy={y(point.plan)}
                r={isActive ? 4 : 0}
                className="fill-card stroke-mark-plan"
                strokeWidth={2}
                animate={{ r: isActive ? 4 : 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 26 }}
              />
              <motion.circle
                cy={y(point.actual)}
                className="fill-card stroke-mark-actual"
                strokeWidth={2.5}
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 1, r: isActive ? 5.5 : 3.5 }}
                transition={{
                  opacity: {
                    duration: 0.2,
                    delay: reduced ? 0 : drawDuration * (i / points.length),
                  },
                  r: { type: "spring", stiffness: 400, damping: 26 },
                }}
              />
            </g>
          );
        })}

        <MonthAxis
          months={months}
          at={at}
          y={innerHeight}
          active={active}
          lockedMonths={lockedMonths}
        />

        {/* Pointer surface. One rect rather than per-point hit areas: the
            nearest-month rule means every pixel of the plot selects something,
            so there is no gap between targets to miss. */}
        <rect
          width={innerWidth || 1}
          height={innerHeight}
          fill="transparent"
          className={cn(innerWidth > 0 && "cursor-crosshair")}
          onPointerMove={(event) =>
            onActiveChange(indexAt(event.clientX, event.currentTarget))
          }
          onPointerLeave={(event) => {
            // A tap should leave the readout up; only a mouse leaving the plot
            // means "done looking".
            if (event.pointerType === "mouse") onActiveChange(null);
          }}
        />
      </g>
    </svg>
  );
}

/** Summary sentence for the chart's `aria-label`. */
export function trendSummary(points: readonly ChartPoint[]) {
  if (points.length === 0) return "No months in this range.";

  const net = points.reduce((sum, p) => sum + p.variance, 0);
  const worst = greatest(points, (p) => p.variance);
  const best = least(points, (p) => p.variance);

  const direction = net > 0 ? "over plan" : "under plan";
  const magnitude = Math.abs(Math.round(net)).toLocaleString("en-US");

  return (
    `Plan against actual across ${points.length} months, ` +
    `net $${magnitude} ${net === 0 ? "on plan" : direction}. ` +
    (worst ? `Furthest over plan: ${monthShort(worst.month)}. ` : "") +
    (best ? `Furthest under plan: ${monthShort(best.month)}. ` : "") +
    `Step through the months with the arrow buttons below the chart.`
  );
}
