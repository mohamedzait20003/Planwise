"use client";

import { motion } from "framer-motion";
import { ReceiptTextIcon, TriangleAlertIcon } from "lucide-react";

import { Money, VarianceAmount, NotLogged } from "./variance";
import { LoadingRows } from "@/components/common/states";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useActuals } from "@/lib/hooks";
import { ApiError } from "@/lib/api";
import type { ReportRow } from "@/lib/api/types";
import { categorySolid } from "@/lib/utils/category-color";
import { monthLong } from "@/lib/utils/month";
import { formatCurrency } from "@/lib/utils/variance";
import { cn } from "@/lib/utils/utils";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

const entryDate = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/**
 * The entries behind one report cell.
 *
 * A report row is a category × month total, and totals are where questions
 * start: "why is Marketing $1,200 over in March?" is unanswerable from the
 * number itself. This opens the ledger underneath it.
 *
 * Deliberately live rather than stored. The report is a snapshot with its own
 * `computedAt`, but the entries are the current ledger — so if the two disagree,
 * the report is stale and the difference is the answer rather than a bug. The
 * panel says so when it happens instead of quietly reconciling them.
 */
export function DrillDown({
  row,
  onClose,
}: Readonly<{ row: ReportRow | null; onClose: () => void }>) {
  // The query is keyed on month + category and is the same one the actuals
  // screen uses, so opening a cell usually reads straight from cache.
  const entries = useActuals(row?.month, row?.categoryId);

  const logged = entries.data ?? [];
  const liveTotal = logged.reduce((sum, entry) => sum + entry.amount, 0);

  // Compared against the stored figure rather than assumed equal: a mismatch
  // means the report predates a write, which is worth saying out loud.
  const drifted =
    row !== null &&
    entries.isSuccess &&
    Math.abs(liveTotal - row.actual) > 0.005;

  return (
    <Sheet open={row !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        {row && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2.5">
                <span
                  aria-hidden
                  className={cn(
                    "size-3 shrink-0 rounded-[3px]",
                    categorySolid(row.categoryId)
                  )}
                />
                {row.categoryName}
              </SheetTitle>
              <p className="text-sm text-muted-foreground">
                {monthLong(row.month)}
              </p>
            </SheetHeader>

            <div className="space-y-5 overflow-y-auto px-4 pb-6">
              {/* The three figures the row asserted, so the panel can be read
                  without the table behind it. */}
              <dl className="grid grid-cols-3 gap-3 rounded-xl bg-muted/40 p-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Plan</dt>
                  <dd className="mt-0.5 font-medium">
                    <Money value={row.plan} />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Actual</dt>
                  <dd className="mt-0.5 font-medium">
                    {row.hasActual ? <Money value={row.actual} /> : <NotLogged />}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Variance</dt>
                  <dd className="mt-0.5">
                    <VarianceAmount value={row.variance} />
                  </dd>
                </div>
              </dl>

              {drifted && (
                <p
                  role="status"
                  className="flex items-start gap-2.5 rounded-xl bg-locked/8 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground ring-1 ring-locked/20"
                >
                  <TriangleAlertIcon
                    aria-hidden
                    className="mt-0.5 size-3.5 shrink-0 text-locked"
                  />
                  <span>
                    These entries total{" "}
                    <span className="font-medium text-foreground tabular">
                      {formatCurrency(liveTotal)}
                    </span>
                    , which is not what the report says. The report was generated
                    before the difference — regenerate it to bring the two back
                    into line.
                  </span>
                </p>
              )}

              {entries.isPending && <LoadingRows rows={3} />}

              {entries.isError && (
                <p role="alert" className="text-sm text-unfavorable">
                  {entries.error instanceof ApiError
                    ? entries.error.message
                    : "Could not load the entries behind this figure."}
                </p>
              )}

              {entries.isSuccess && logged.length === 0 && (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                    <ReceiptTextIcon aria-hidden className="size-5" />
                  </span>
                  <p className="max-w-xs text-sm leading-relaxed text-pretty text-muted-foreground">
                    Nothing was logged against {row.categoryName} in{" "}
                    {monthLong(row.month)}. The plan of{" "}
                    <Money value={row.plan} /> counts as fully unspent, which is
                    why the variance reads {formatCurrency(row.variance)}.
                  </p>
                </div>
              )}

              {logged.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {logged.length} {logged.length === 1 ? "entry" : "entries"}
                  </p>

                  <ul className="divide-y divide-border/60 rounded-xl ring-1 ring-border/60">
                    {logged.map((entry, i) => (
                      <motion.li
                        key={entry.id}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          duration: 0.3,
                          delay: i * 0.04,
                          ease: EASE_OUT,
                        }}
                        className="flex items-baseline justify-between gap-3 px-3 py-2.5"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm">
                            {entry.note ?? (
                              <span className="text-muted-foreground italic">
                                No note
                              </span>
                            )}
                          </span>
                          <span className="text-xs text-muted-foreground tabular">
                            {entryDate.format(new Date(entry.createdAt))}
                          </span>
                        </span>

                        <span className="shrink-0 text-sm font-medium">
                          <Money value={entry.amount} />
                        </span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
