"use client";

import { useEffect } from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";

import { cn } from "@/lib/utils/utils";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/**
 * Counts to `to` on mount, and re-counts from wherever it is when `to` changes.
 *
 * Driven by a MotionValue, so the animation runs outside React — a per-frame
 * `setState` on four tiles at once is what makes a dashboard feel heavy.
 *
 * The landing page's CountUp fires on `onViewportEnter`; this one cannot, since
 * these tiles are above the fold and would sit at zero waiting for a scroll.
 */
export function CountUpValue({
  to,
  format,
  className,
}: Readonly<{
  to: number;
  format: (value: number) => string;
  className?: string;
}>) {
  const value = useMotionValue(to);
  const text = useTransform(value, (current) => format(current));

  useEffect(() => {
    const controls = animate(value, to, { duration: 0.9, ease: EASE_OUT });
    return () => controls.stop();
  }, [to, value]);

  return (
    <motion.span data-numeric className={cn("tabular", className)}>
      {text}
    </motion.span>
  );
}

/**
 * One headline figure.
 *
 * A stat tile rather than a chart because a single number has no shape to
 * show — a one-bar chart is just a number wearing a rectangle.
 */
export function StatTile({
  label,
  value,
  hint,
  icon,
  accent,
  className,
}: Readonly<{
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  /** Tints the icon well. Defaults to the brand. */
  accent?: "primary" | "favorable" | "unfavorable" | "locked" | "info";
  className?: string;
}>) {
  const tint = {
    primary: "bg-primary/8 text-primary ring-primary/15",
    favorable: "bg-favorable/10 text-favorable ring-favorable/20",
    unfavorable: "bg-unfavorable/10 text-unfavorable ring-unfavorable/20",
    locked: "bg-locked/10 text-locked ring-locked/20",
    info: "bg-info/10 text-info ring-info/20",
  }[accent ?? "primary"];

  return (
    <div
      className={cn(
        "surface-glass rounded-2xl border border-border/60 p-5 transition-shadow hover:shadow-lg hover:shadow-primary/5",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </p>
        {icon && (
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-xl ring-1",
              tint
            )}
          >
            {icon}
          </span>
        )}
      </div>

      <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
      {hint && <div className="mt-2 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
