"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";

import type { Actual } from "@/lib/api/types";
import { categorySolid } from "@/lib/utils/category-color";
import { formatCurrency } from "@/lib/utils/variance";
import { cn } from "@/lib/utils/utils";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

type Slice = {
  categoryId: string;
  name: string;
  amount: number;
  count: number;
  share: number;
};

/**
 * Where the month's spend went, by category.
 *
 * Bars rather than a donut: this is a ranking, and a reader comparing two
 * categories on a donut is comparing arc lengths, which is the least accurate
 * judgement the eye makes. Sorted descending so the answer to "what did we
 * spend most on" is always the first row.
 *
 * Bar length is share of the month's total, so the row widths add up to the
 * whole — the same figure the panel header states.
 */
export function CategoryBreakdown({
  entries,
  names,
  className,
}: Readonly<{
  entries: readonly Actual[];
  names: ReadonlyMap<string, string>;
  className?: string;
}>) {
  const reduced = useReducedMotion();

  const slices = useMemo<Slice[]>(() => {
    const totals = new Map<string, { amount: number; count: number }>();

    for (const entry of entries) {
      const current = totals.get(entry.categoryId) ?? { amount: 0, count: 0 };
      current.amount += entry.amount;
      current.count += 1;
      totals.set(entry.categoryId, current);
    }

    const sum = entries.reduce((running, entry) => running + entry.amount, 0);

    return [...totals.entries()]
      .map(([categoryId, { amount, count }]) => ({
        categoryId,
        name: names.get(categoryId) ?? "Unknown category",
        amount,
        count,
        share: sum > 0 ? amount / sum : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [entries, names]);

  if (slices.length === 0) return null;

  return (
    <ul className={cn("space-y-3", className)}>
      {slices.map((slice, i) => (
        <li key={slice.categoryId} className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden
                className={cn(
                  "size-2.5 shrink-0 rounded-[3px]",
                  categorySolid(slice.categoryId)
                )}
              />
              <span className="truncate font-medium">{slice.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground tabular">
                {slice.count}
              </span>
            </span>

            <span className="shrink-0 text-right">
              <span data-numeric className="tabular font-medium">
                {formatCurrency(slice.amount)}
              </span>
              <span className="ml-2 text-xs text-muted-foreground tabular">
                {Math.round(slice.share * 100)}%
              </span>
            </span>
          </div>

          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <motion.div
              className={cn("h-full rounded-full", categorySolid(slice.categoryId))}
              style={{ originX: 0, width: "100%" }}
              initial={reduced ? false : { scaleX: 0 }}
              animate={{ scaleX: slice.share }}
              transition={{
                duration: reduced ? 0 : 0.7,
                delay: reduced ? 0 : i * 0.05,
                ease: EASE_OUT,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
