"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeftIcon, ChevronRightIcon, LockIcon } from "lucide-react";

import { PageHeader, Panel } from "@/components/client/page-header";
import { Rise, Stagger } from "@/components/client/motion";
import { ErrorState, LoadingRows } from "@/components/client/states";
import { FormMessage, errorMessage } from "@/components/auth/form-message";
import { PeriodGrid } from "@/components/client/period-grid";
import { Button } from "@/components/ui/button";
import { useLockPeriod, useLocks, useUnlockPeriod } from "@/lib/hooks";
import { currentMonth } from "@/lib/utils/month";

/**
 * Closing the books, month by month.
 *
 * The window is a calendar year rather than a rolling list: locking is an
 * accounting rhythm, and "is Q1 closed?" is the question people arrive with.
 * A year at a time also means the year navigation is the only control needed
 * to reach any period, past or future.
 */
export default function PeriodsPage() {
  const anchor = currentMonth();
  const thisYear = Number(anchor.slice(0, 4));

  const [year, setYear] = useState(thisYear);

  const locks = useLocks();
  const lock = useLockPeriod();
  const unlock = useUnlockPeriod();

  const [pendingMonth, setPendingMonth] = useState<string | null>(null);

  const byMonth = new Map((locks.data ?? []).map((entry) => [entry.month, entry]));

  const busy = lock.isPending || unlock.isPending;
  const failure = lock.error ?? unlock.error;

  const closedThisYear = (locks.data ?? []).filter((entry) =>
    entry.month.startsWith(`${year}-`)
  ).length;

  function onLock(month: string, note: string) {
    setPendingMonth(month);
    lock.mutate(
      { month, note: note || undefined },
      { onSettled: () => setPendingMonth(null) }
    );
  }

  function onUnlock(month: string) {
    setPendingMonth(month);
    unlock.mutate(month, { onSettled: () => setPendingMonth(null) });
  }

  return (
    <Stagger className="space-y-6">
      <Rise>
        <PageHeader
          title="Periods"
          description="Close a month and its plans and actuals become read-only. The API refuses writes to a closed month — hiding the buttons is not what enforces it."
        />
      </Rise>

      {failure && (
        <Rise>
          <FormMessage>{errorMessage(failure)}</FormMessage>
        </Rise>
      )}

      {locks.isError && (
        <Rise>
          <ErrorState error={locks.error} onRetry={() => locks.refetch()} />
        </Rise>
      )}

      <Rise>
        <Panel
          title={`${year}`}
          description={`${closedThisYear} of 12 months closed`}
          actions={
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="rounded-lg"
                aria-label={`Go to ${year - 1}`}
                onClick={() => setYear((current) => current - 1)}
              >
                <ChevronLeftIcon aria-hidden className="size-4" />
              </Button>

              {year !== thisYear && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-lg"
                  onClick={() => setYear(thisYear)}
                >
                  Today
                </Button>
              )}

              <Button
                variant="outline"
                size="icon"
                className="rounded-lg"
                aria-label={`Go to ${year + 1}`}
                onClick={() => setYear((current) => current + 1)}
              >
                <ChevronRightIcon aria-hidden className="size-4" />
              </Button>
            </div>
          }
        >
          {locks.isPending && !locks.isError ? (
            <LoadingRows rows={4} />
          ) : (
            <div className="space-y-6">
              {/* How much of the year is shut, before any individual month is
                  read — the shape of a year's close is the thing people are
                  actually checking. */}
              <div className="space-y-2">
                <div
                  className="h-1.5 overflow-hidden rounded-full bg-muted"
                  aria-hidden
                >
                  <motion.div
                    className="h-full rounded-full bg-locked"
                    style={{ originX: 0, width: "100%" }}
                    initial={false}
                    animate={{ scaleX: closedThisYear / 12 }}
                    transition={{ type: "spring", stiffness: 200, damping: 30 }}
                  />
                </div>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <LockIcon aria-hidden className="size-3 text-locked" />
                  {closedThisYear === 0
                    ? `No months closed in ${year} yet`
                    : `${closedThisYear} closed, ${12 - closedThisYear} still open`}
                </p>
              </div>

              <PeriodGrid
                year={year}
                locks={byMonth}
                currentMonth={anchor}
                busyMonth={pendingMonth}
                disabled={busy}
                onLock={onLock}
                onUnlock={onUnlock}
              />
            </div>
          )}
        </Panel>
      </Rise>

      <Rise>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Reopening a month puts it straight back into edit. Locking is meant to
          stop accidents rather than to punish one, so a lock applied in error is
          a click to undo.
        </p>
      </Rise>
    </Stagger>
  );
}
