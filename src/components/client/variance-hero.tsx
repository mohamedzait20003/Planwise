"use client";

import { motion, useReducedMotion } from "framer-motion";

import { CountUpValue } from "./stat-tile";
import { VarianceChip } from "./variance";
import { formatCurrency, formatSignedCurrency } from "@/lib/utils/variance";
import { cn } from "@/lib/utils/utils";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/**
 * Plan against actual on one track.
 *
 * Both bars are measured against the larger of the two rather than against
 * plan, so an overspend extends past the plan marker instead of being clipped
 * at 100%. The marker is the target and the fill is the outcome — one glance
 * gives the direction, which the number beside it then makes exact.
 */
function ProportionBar({
  plan,
  actual,
}: Readonly<{ plan: number; actual: number }>) {
  const reduced = useReducedMotion();
  const ceiling = Math.max(plan, actual);

  // Nothing planned and nothing spent: a bar would imply a comparison that
  // was never made.
  if (ceiling <= 0) return null;

  const over = actual > plan;
  const fill = (actual / ceiling) * 100;
  const marker = (plan / ceiling) * 100;

  return (
    <div className="space-y-2">
      <div className="relative h-2.5 overflow-hidden rounded-full bg-muted">
        <motion.div
          className={cn(
            "h-full rounded-full",
            over ? "bg-mark-unfavorable" : "bg-mark-actual"
          )}
          initial={reduced ? false : { scaleX: 0 }}
          animate={{ scaleX: fill / 100 }}
          style={{ originX: 0, width: "100%" }}
          transition={{ duration: reduced ? 0 : 0.9, ease: EASE_OUT }}
        />

        {/* The plan marker sits above the fill so it stays readable when the
            actual has run past it. */}
        <span
          aria-hidden
          className="absolute inset-y-0 w-0.5 -translate-x-1/2 rounded-full bg-foreground/70"
          style={{ left: `${marker}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          <span data-numeric className="tabular font-medium text-foreground">
            {formatCurrency(actual)}
          </span>{" "}
          actual
        </span>
        <span>
          <span data-numeric className="tabular font-medium text-foreground">
            {formatCurrency(plan)}
          </span>{" "}
          planned
        </span>
      </div>
    </div>
  );
}

/**
 * The report's headline figure.
 *
 * One number gets to be the answer, and on a variance report it is the net
 * variance — a row of four equal tiles makes the reader decide which of them
 * matters, which is work the page should have done for them.
 */
export function VarianceHero({
  plan,
  actual,
  variance,
  variancePct,
  label = "Net variance",
  className,
}: Readonly<{
  plan: number;
  actual: number;
  variance: number;
  variancePct: number | null;
  /** What period this figure covers, e.g. "August 2026". */
  label?: string;
  className?: string;
}>) {
  let tone = "text-muted-foreground";
  if (variance > 0) tone = "text-unfavorable";
  else if (variance < 0) tone = "text-favorable";

  let verdict = "exactly on plan";
  if (variance > 0) verdict = "over plan";
  else if (variance < 0) verdict = "under plan";

  return (
    <section
      className={cn(
        "surface-glass relative overflow-hidden rounded-2xl border border-border/60 p-6",
        className
      )}
    >
      {/* Tints the card toward the verdict without colouring the whole surface */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -top-24 -right-16 size-56 rounded-full blur-3xl",
          variance > 0 && "bg-unfavorable/12",
          variance < 0 && "bg-favorable/12",
          variance === 0 && "bg-muted-foreground/8"
        )}
      />

      <div className="relative space-y-5">
        <div className="space-y-3">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {label}
          </p>

          <p
            className={cn(
              "text-4xl font-semibold tracking-tight sm:text-5xl",
              tone
            )}
          >
            <CountUpValue to={variance} format={formatSignedCurrency} />
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <VarianceChip variance={variance} variancePct={variancePct} />
            <span className="text-xs text-muted-foreground">{verdict}</span>
          </div>
        </div>

        <ProportionBar plan={plan} actual={actual} />
      </div>
    </section>
  );
}
