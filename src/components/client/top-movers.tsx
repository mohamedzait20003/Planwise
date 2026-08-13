"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

import { VarianceAmount, VarianceMeter, VariancePct } from "./variance";
import type { ReportRow } from "@/lib/api/types";
import { categorySolid } from "@/lib/utils/category-color";
import { cn } from "@/lib/utils/utils";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/**
 * The categories furthest from plan.
 *
 * Ranked by absolute variance, not by signed variance: the biggest saving is
 * as much a planning miss as the biggest overspend, and a list that sorted
 * signed would bury it at the bottom. The sign is still legible — the meter
 * puts it on the correct side of centre and the amount carries its own colour
 * and arrow.
 *
 * Rows with neither a plan nor an actual are dropped. They are exactly on
 * plan by arithmetic, and a "needs attention" list whose top entries are
 * categories nobody touched is not one.
 */
export function TopMovers({
  rows,
  limit = 5,
  className,
}: Readonly<{ rows: readonly ReportRow[]; limit?: number; className?: string }>) {
  const movers = useMemo(
    () =>
      rows
        .filter((row) => row.plan !== 0 || row.actual !== 0)
        .toSorted((a, b) => Math.abs(b.variance) - Math.abs(a.variance))
        .slice(0, limit),
    [rows, limit]
  );

  if (movers.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Nothing planned or logged this month yet.
      </p>
    );
  }

  const ceiling = Math.abs(movers[0].variance);

  return (
    <ul className={cn("space-y-1", className)}>
      {movers.map((row, i) => (
        <motion.li
          key={row.categoryId}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: i * 0.05, ease: EASE_OUT }}
          className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/50"
        >
          <span
            aria-hidden
            className={cn(
              "size-2.5 shrink-0 rounded-[3px]",
              categorySolid(row.categoryId)
            )}
          />

          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            {row.categoryName}
          </span>

          <VarianceMeter
            value={row.variance}
            ceiling={ceiling}
            className="hidden shrink-0 sm:flex"
          />

          <span className="w-24 shrink-0 text-right text-sm">
            <VarianceAmount value={row.variance} />
          </span>

          <span className="w-16 shrink-0 text-right text-xs">
            <VariancePct value={row.variancePct} variance={row.variance} />
          </span>
        </motion.li>
      ))}
    </ul>
  );
}
