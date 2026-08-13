"use client";

import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils/utils";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

const WIDTH = 1200;
const HEIGHT = 260;

/* ------------------------------------------------------------------- shape --
 * Two series across a quarter's worth of months, normalised 0–1 with 1 at the
 * top. Plan is the steadier line because it is a decision; actual is the noisy
 * one because it is what happened. They cross five times, so the ribbon shows
 * both signs rather than making one of them the decorative default.
 * -------------------------------------------------------------------------- */

const PLAN = [0.55, 0.55, 0.62, 0.62, 0.58, 0.58, 0.66, 0.66, 0.62];
const ACTUAL = [0.48, 0.6, 0.58, 0.71, 0.63, 0.5, 0.6, 0.74, 0.68];

type Point = readonly [number, number];

function toPoints(series: readonly number[]): Point[] {
  const step = WIDTH / (series.length - 1);
  return series.map((value, i) => [i * step, HEIGHT - value * HEIGHT] as const);
}

/**
 * Catmull-Rom through the points, emitted as cubic beziers.
 *
 * An interpolating spline rather than a smoothing one: the curve passes
 * through every sample, so the two lines cross exactly where the numbers say
 * they cross, and the shaded regions stay honest.
 */
function smooth(points: readonly Point[]) {
  let d = `M ${points[0][0]} ${points[0][1]}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    const p3 = points[i + 2] ?? points[i + 1];

    d += ` C ${x1 + (x2 - p0[0]) / 6} ${y1 + (y2 - p0[1]) / 6}`;
    d += `, ${x2 - (p3[0] - x1) / 6} ${y2 - (p3[1] - y1) / 6}`;
    d += `, ${x2} ${y2}`;
  }

  return d;
}

const planPoints = toPoints(PLAN);
const actualPoints = toPoints(ACTUAL);

const planPath = smooth(planPoints);
const actualPath = smooth(actualPoints);

/** The band between the two lines: out along actual, back along plan. */
const gapPath = `${actualPath} ${smooth([...planPoints].reverse()).replace(/^M/, "L")} Z`;

/* In SVG the y axis points down, so "above the plan line" is where actual came
   in higher than planned — overspend. The two clips split the band on exactly
   that line, which is why the tint flips at the crossings and nowhere else. */
const overClip = `${planPath} L ${WIDTH} 0 L 0 0 Z`;
const underClip = `${planPath} L ${WIDTH} ${HEIGHT} L 0 ${HEIGHT} Z`;

/**
 * The hero's backdrop: a plan line, an actual line, and the gap between them
 * tinted by its own sign — the one rule the whole product turns on, drawn at
 * wall size before a single word explains it.
 */
export function VarianceRibbon({ className }: Readonly<{ className?: string }>) {
  const reduced = useReducedMotion();
  // Stripped to alphanumerics: useId's format has changed between React
  // versions, and these ids are interpolated into `url(#…)` references.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const overId = `over-${uid}`;
  const underId = `under-${uid}`;

  // With reduced motion the ribbon is simply already drawn — the information
  // is in the shape, so nothing is lost by skipping the reveal.
  const draw = reduced
    ? { initial: false as const, animate: { pathLength: 1, opacity: 1 } }
    : {
        initial: { pathLength: 0, opacity: 0 },
        animate: { pathLength: 1, opacity: 1 },
      };

  return (
    <svg
      aria-hidden
      focusable="false"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      className={cn("h-full w-full", className)}
    >
      <defs>
        <clipPath id={overId}>
          <path d={overClip} />
        </clipPath>
        <clipPath id={underId}>
          <path d={underClip} />
        </clipPath>
      </defs>

      {/* Over plan — rose. Under plan — emerald. Same tokens the report uses. */}
      <motion.path
        d={gapPath}
        clipPath={`url(#${overId})`}
        fill="var(--mark-unfavorable)"
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 0.16 }}
        transition={{ duration: 1, delay: 1.1, ease: EASE_OUT }}
      />
      <motion.path
        d={gapPath}
        clipPath={`url(#${underId})`}
        fill="var(--mark-favorable)"
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 0.16 }}
        transition={{ duration: 1, delay: 1.1, ease: EASE_OUT }}
      />

      {/* Plan: dashed, because a target is a claim rather than a measurement */}
      <motion.path
        d={planPath}
        fill="none"
        stroke="var(--mark-plan)"
        strokeWidth={2}
        strokeDasharray="7 8"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 0.75 }}
        transition={{ duration: 0.7, delay: 0.25, ease: EASE_OUT }}
      />

      {/* Actual: solid, and drawn left to right as though it were happening */}
      <motion.path
        d={actualPath}
        fill="none"
        stroke="var(--mark-actual)"
        strokeWidth={2.5}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        {...draw}
        transition={{
          pathLength: { duration: 1.6, delay: 0.45, ease: EASE_OUT },
          opacity: { duration: 0.3, delay: 0.45 },
        }}
      />
    </svg>
  );
}
