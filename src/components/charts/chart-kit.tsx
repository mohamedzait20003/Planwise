"use client";

import type { ScaleLinear } from "d3-scale";

import type { ReportMonthTotal } from "@/lib/api/types";
import { monthShort, monthTerse } from "@/lib/utils/month";
import { formatCurrency, formatSignedCurrency } from "@/lib/utils/variance";
import { cn } from "@/lib/utils/utils";

/* -------------------------------------------------------------- geometry -- */

/** Left gutter carries currency ticks, so it is wider than the others. */
export const MARGIN = { top: 18, right: 14, bottom: 30, left: 58 } as const;

export const CHART_HEIGHT = 260;

export type ChartPoint = ReportMonthTotal;

/* ------------------------------------------------------------ formatting -- */

const compact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Axis ticks only. Readouts and tables use the full `formatCurrency`. */
export function formatTick(value: number) {
  return value === 0 ? "$0" : compact.format(value);
}

/* ----------------------------------------------------------------- axes --- */

/**
 * Horizontal gridlines with their value labels.
 *
 * Tick values come from d3's `.ticks()` rather than an even split of the
 * domain, so they land on round numbers a reader can hold — $20k, $25k — and
 * the axis stays legible when the domain is something like 19,431 to 24,908.
 */
export function GridLines({
  y,
  width,
  count = 5,
}: Readonly<{ y: ScaleLinear<number, number>; width: number; count?: number }>) {
  return (
    <g aria-hidden>
      {y.ticks(count).map((value) => (
        <g key={value} transform={`translate(0, ${y(value)})`}>
          <line
            x2={width}
            className="stroke-border"
            strokeOpacity={value === 0 ? 0.9 : 0.45}
            strokeDasharray={value === 0 ? undefined : "3 4"}
          />
          <text
            x={-10}
            dy="0.32em"
            textAnchor="end"
            className="fill-muted-foreground text-[10px] tabular"
          >
            {formatTick(value)}
          </text>
        </g>
      ))}
    </g>
  );
}

/**
 * Month labels along the bottom.
 *
 * Labels are dropped by a whole stride rather than rotated when they will not
 * fit: a rotated label is harder to read than a missing one, and the crosshair
 * names the month exactly anyway.
 */
export function MonthAxis({
  months,
  at,
  y,
  active,
  lockedMonths,
}: Readonly<{
  months: string[];
  at: (month: string) => number;
  y: number;
  active: number | null;
  lockedMonths?: ReadonlySet<string>;
}>) {
  // ~46px per label before they start colliding.
  const span = months.length > 1 ? Math.abs(at(months[1]) - at(months[0])) : 999;
  const stride = Math.max(1, Math.ceil(46 / Math.max(span, 1)));

  return (
    <g transform={`translate(0, ${y})`}>
      {months.map((month, i) => {
        const isActive = i === active;
        // The active month always shows, even if its turn was skipped.
        if (i % stride !== 0 && !isActive) return null;

        return (
          <g key={month} transform={`translate(${at(month)}, 0)`}>
            <text
              dy="1.1em"
              textAnchor="middle"
              className={cn(
                "text-[10px] transition-colors",
                isActive
                  ? "fill-foreground font-medium"
                  : "fill-muted-foreground"
              )}
            >
              {monthTerse(month)}
            </text>
            {lockedMonths?.has(month) && (
              // A closed month is worth marking on the axis: it explains why a
              // figure will not move next time the report is run.
              <circle cy={16} r={2} className="fill-locked" />
            )}
          </g>
        );
      })}
    </g>
  );
}

/* --------------------------------------------------------------- legend --- */

export function ChartLegend({
  lockedCount = 0,
}: Readonly<{ lockedCount?: number }>) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-2">
        {/* Dashed in the swatch as well as on the chart — the legend has to
            carry the same distinction the lines do, or it only works in
            colour. */}
        <svg width="18" height="8" aria-hidden className="overflow-visible">
          <line
            x1="0"
            y1="4"
            x2="18"
            y2="4"
            className="stroke-mark-plan"
            strokeWidth="2"
            strokeDasharray="4 3"
          />
        </svg>
        <span>Plan</span>
      </span>

      <span className="inline-flex items-center gap-2">
        <svg width="18" height="8" aria-hidden className="overflow-visible">
          <line
            x1="0"
            y1="4"
            x2="18"
            y2="4"
            className="stroke-mark-actual"
            strokeWidth="2.5"
          />
        </svg>
        <span>Actual</span>
      </span>

      <span className="inline-flex items-center gap-2">
        <span className="size-2.5 rounded-[3px] bg-mark-unfavorable/45 ring-1 ring-mark-unfavorable/60" />
        <span>Over plan</span>
      </span>

      <span className="inline-flex items-center gap-2">
        <span className="size-2.5 rounded-[3px] bg-mark-favorable/45 ring-1 ring-mark-favorable/60" />
        <span>Under plan</span>
      </span>

      {lockedCount > 0 && (
        <span className="inline-flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-locked" />
          <span>{lockedCount} locked</span>
        </span>
      )}
    </div>
  );
}

/* -------------------------------------------------------------- readout --- */

/**
 * The figures for the month under the crosshair.
 *
 * Docked below the plot rather than floating over it. A tooltip that follows
 * the pointer covers the data it is describing, cannot be reached by keyboard
 * without reinventing focus, and on a touch screen sits under the finger — a
 * fixed panel has none of those problems and can be wired to `aria-live`.
 */
export function ChartReadout({
  point,
  placeholder,
}: Readonly<{ point: ChartPoint | null; placeholder: string }>) {
  if (!point) {
    return (
      <p className="flex h-12 items-center text-xs text-muted-foreground">
        {placeholder}
      </p>
    );
  }

  const over = point.variance > 0;
  const pct = point.plan === 0 ? null : (point.variance / point.plan) * 100;

  return (
    <dl className="flex h-12 flex-wrap items-center gap-x-6 gap-y-1 text-xs">
      <div>
        <dt className="text-muted-foreground">Month</dt>
        <dd className="font-medium">{monthShort(point.month)}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Plan</dt>
        <dd data-numeric className="tabular font-medium">
          {formatCurrency(point.plan)}
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Actual</dt>
        <dd data-numeric className="tabular font-medium">
          {formatCurrency(point.actual)}
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Variance</dt>
        <dd
          data-numeric
          className={cn(
            "tabular font-medium",
            point.variance === 0 && "text-muted-foreground",
            point.variance !== 0 &&
              (over ? "text-unfavorable" : "text-favorable")
          )}
        >
          {formatSignedCurrency(point.variance)}
          {pct !== null && (
            <span className="ml-1.5 font-normal opacity-70">
              {pct > 0 ? "+" : ""}
              {pct.toFixed(1)}%
            </span>
          )}
        </dd>
      </div>
    </dl>
  );
}

/* ------------------------------------------------------------ a11y table -- */

/**
 * The chart's data as a table, for screen readers.
 *
 * Not `aria-hidden` decoration and not a duplicate of the report's detail
 * table — that one is per category × month, and these are the month totals the
 * chart actually plots. A chart with only an `aria-label` summary tells a
 * screen-reader user the shape and withholds the numbers.
 */
export function ChartDataTable({
  points,
  caption,
}: Readonly<{ points: readonly ChartPoint[]; caption: string }>) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">Month</th>
          <th scope="col">Plan</th>
          <th scope="col">Actual</th>
          <th scope="col">Variance</th>
        </tr>
      </thead>
      <tbody>
        {points.map((point) => (
          <tr key={point.month}>
            <th scope="row">{monthShort(point.month)}</th>
            <td>{formatCurrency(point.plan)}</td>
            <td>{formatCurrency(point.actual)}</td>
            <td>
              {formatSignedCurrency(point.variance)}
              {point.variance > 0 ? " over plan" : ""}
              {point.variance < 0 ? " under plan" : ""}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ------------------------------------------------------------- patterns --- */

/**
 * Diagonal hatching for the over-plan band.
 *
 * Over and under are a red/green pair, which is the one pair deuteranopia
 * collapses. The texture is what survives that, so the two regions stay
 * distinguishable with the colour taken away entirely.
 */
export function HatchPattern({ id }: Readonly<{ id: string }>) {
  return (
    <pattern
      id={id}
      patternUnits="userSpaceOnUse"
      width={6}
      height={6}
      patternTransform="rotate(45)"
    >
      <line
        x1={0}
        y1={0}
        x2={0}
        y2={6}
        className="stroke-mark-unfavorable"
        strokeWidth={1.6}
        strokeOpacity={0.5}
      />
    </pattern>
  );
}
