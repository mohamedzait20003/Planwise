"use client";

import { ArrowDownRightIcon, ArrowUpRightIcon, MinusIcon } from "lucide-react";

import {
  formatCurrency,
  formatSignedCurrency,
  formatVariancePct,
} from "@/lib/utils/variance";
import { cn } from "@/lib/utils/utils";

/**
 * Variance, rendered.
 *
 * The sign convention is the one `computeVariance` sets: variance = actual −
 * plan, so NEGATIVE is under plan and favorable. That inverts the usual "red
 * for negative" instinct, which is exactly why the arrow and the word are here
 * — colour alone would read backwards to anyone who has not been told.
 */

export type Tone = "favorable" | "unfavorable" | "neutral";

export function toneOf(variance: number): Tone {
  if (variance === 0) return "neutral";
  return variance < 0 ? "favorable" : "unfavorable";
}

const TONE_TEXT: Record<Tone, string> = {
  favorable: "text-favorable",
  unfavorable: "text-unfavorable",
  neutral: "text-muted-foreground",
};

const TONE_CHIP: Record<Tone, string> = {
  favorable: "bg-favorable/10 text-favorable ring-favorable/20",
  unfavorable: "bg-unfavorable/10 text-unfavorable ring-unfavorable/20",
  neutral: "bg-muted text-muted-foreground ring-border",
};

function ToneIcon({ tone, className }: Readonly<{ tone: Tone; className?: string }>) {
  if (tone === "neutral") return <MinusIcon className={className} />;
  
  return tone === "favorable" ? (
    <ArrowDownRightIcon className={className} />
  ) : (
    <ArrowUpRightIcon className={className} />
  );
}

/** Signed money in the tone of its direction, e.g. "−$200". */
export function VarianceAmount({
  value,
  className,
}: Readonly<{ value: number; className?: string }>) {
  const tone = toneOf(value);

  return (
    <span
      data-numeric
      className={cn("font-medium tabular", TONE_TEXT[tone], className)}
    >
      {formatSignedCurrency(value)}
    </span>
  );
}

/** Signed percentage, or "N/A" when the plan was zero and the ratio undefined. */
export function VariancePct({
  value,
  variance,
  className,
}: Readonly<{ value: number | null; variance: number; className?: string }>) {
  const tone = value === null ? "neutral" : toneOf(variance);

  return (
    <span
      data-numeric
      className={cn("tabular", TONE_TEXT[tone], className)}
      // "N/A" is not self-explanatory in a column of percentages.
      title={value === null ? "No plan was set, so there is no ratio" : undefined}
    >
      {formatVariancePct(value)}
    </span>
  );
}

/**
 * The headline form: chip with arrow, amount and percentage together.
 *
 * Used where variance is the point of the tile rather than one column of many.
 */
export function VarianceChip({
  variance,
  variancePct,
  className,
}: Readonly<{
  variance: number;
  variancePct: number | null;
  className?: string;
}>) {
  const tone = toneOf(variance);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1",
        TONE_CHIP[tone],
        className
      )}
    >
      <ToneIcon tone={tone} className="size-3.5 shrink-0" />
      <span data-numeric className="tabular">
        {formatSignedCurrency(variance)}
      </span>
      <span className="opacity-60">·</span>
      <span data-numeric className="tabular">
        {formatVariancePct(variancePct)}
      </span>
    </span>
  );
}

/**
 * A row's variance as a mark either side of a centre line.
 *
 * Scaled against the largest variance in the table, not against the row's own
 * plan, so the marks are comparable down the column — that shared scale is the
 * whole reason to draw them rather than read the numbers, which are right
 * there in the next cell.
 *
 * Decorative in the accessibility sense: the figure it encodes is already in
 * the adjacent column, so it is hidden rather than announced twice.
 */
export function VarianceMeter({
  value,
  ceiling,
  className,
}: Readonly<{ value: number; ceiling: number; className?: string }>) {
  const tone = toneOf(value);
  const extent = ceiling > 0 ? Math.min(Math.abs(value) / ceiling, 1) * 50 : 0;

  return (
    <span
      aria-hidden
      className={cn("relative flex h-4 w-16 items-center", className)}
    >
      <span className="absolute inset-x-0 h-px bg-border" />
      <span className="absolute left-1/2 h-3 w-px -translate-x-1/2 bg-border" />

      {value !== 0 && (
        <span
          className={cn(
            "absolute h-1.5 rounded-full",
            tone === "unfavorable" ? "bg-mark-unfavorable" : "bg-mark-favorable"
          )}
          style={{
            // Over plan grows right of centre, under plan grows left — the
            // same orientation the variance bar chart uses.
            left: tone === "unfavorable" ? "50%" : `${50 - extent}%`,
            width: `${Math.max(extent, 2)}%`,
          }}
        />
      )}
    </span>
  );
}

/** Plain money, for the plan and actual columns. */
export function Money({
  value,
  muted,
  className,
}: Readonly<{ value: number; muted?: boolean; className?: string }>) {
  return (
    <span
      data-numeric
      className={cn("tabular", muted && "text-muted-foreground", className)}
    >
      {formatCurrency(value)}
    </span>
  );
}

/**
 * What the report shows where nothing was logged.
 *
 * The value is still summed as 0 — see `computeVariance` — so this marks the
 * cell without pretending the row is missing from the totals.
 */
export function NotLogged() {
  return (
    <span className="text-muted-foreground/70" title="Nothing logged; counted as $0">
      —
    </span>
  );
}
