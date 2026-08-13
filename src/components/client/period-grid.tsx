"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckIcon,
  LoaderCircleIcon,
  LockIcon,
  LockOpenIcon,
  XIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PeriodLock } from "@/lib/api/types";
import { monthLong, monthTerse } from "@/lib/utils/month";
import { cn } from "@/lib/utils/utils";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

const QUARTERS = [
  { label: "Q1", offsets: [0, 1, 2] },
  { label: "Q2", offsets: [3, 4, 5] },
  { label: "Q3", offsets: [6, 7, 8] },
  { label: "Q4", offsets: [9, 10, 11] },
];

const lockedAtLabel = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

/* ---------------------------------------------------------------- one month */

function PeriodTile({
  month,
  lock,
  isCurrent,
  isFuture,
  busy,
  disabled,
  onLock,
  onUnlock,
}: Readonly<{
  month: string;
  lock: PeriodLock | undefined;
  isCurrent: boolean;
  isFuture: boolean;
  busy: boolean;
  disabled: boolean;
  onLock: (month: string, note: string) => void;
  onUnlock: (month: string) => void;
}>) {
  // Confirming is per-tile: the note belongs to the month being closed, and a
  // single shared field elsewhere on the page leaves no way to tell which
  // month it is about to be attached to.
  const [confirming, setConfirming] = useState(false);
  const [note, setNote] = useState("");

  const locked = lock !== undefined;

  function confirm() {
    onLock(month, note.trim());
    setConfirming(false);
    setNote("");
  }

  return (
    <div
      className={cn(
        "relative flex flex-col gap-2 rounded-xl border p-3 transition-colors duration-200",
        locked
          ? "border-locked/35 bg-locked-muted/40"
          : "border-border/60 bg-card/60",
        // A month that has not happened yet is dimmed rather than blocked:
        // closing one early is unusual, not wrong.
        isFuture && !locked && "opacity-60",
        isCurrent && "ring-2 ring-primary/35"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            {monthTerse(month)}
            {locked && (
              <LockIcon aria-hidden className="size-3 shrink-0 text-locked" />
            )}
          </p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {locked && lock.lockedAt
              ? `Closed ${lockedAtLabel.format(new Date(lock.lockedAt))}`
              : "Open"}
          </p>
        </div>

        {isCurrent && (
          <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium tracking-wide text-primary uppercase">
            Now
          </span>
        )}
      </div>

      {locked && lock.note && (
        <p
          title={lock.note}
          className="line-clamp-2 text-[11px] leading-snug text-muted-foreground"
        >
          {lock.note}
        </p>
      )}

      <AnimatePresence mode="wait" initial={false}>
        {confirming ? (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0, transition: { duration: 0.12 } }}
            transition={{ duration: 0.22, ease: EASE_OUT }}
            className="space-y-2 overflow-hidden"
          >
            <Input
              autoFocus
              value={note}
              onChange={(event) => setNote(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") confirm();
                if (event.key === "Escape") setConfirming(false);
              }}
              maxLength={200}
              placeholder="Why? (optional)"
              aria-label={`Note for closing ${monthLong(month)}`}
              className="h-8 text-xs"
            />
            <div className="flex gap-1.5">
              <Button
                size="sm"
                className="h-8 flex-1 rounded-lg"
                onClick={confirm}
              >
                <CheckIcon aria-hidden />
                Close
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="size-8 rounded-lg"
                aria-label="Cancel"
                onClick={() => setConfirming(false)}
              >
                <XIcon aria-hidden />
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="action"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            className="mt-auto"
          >
            <Button
              variant={locked ? "outline" : "ghost"}
              size="sm"
              disabled={disabled}
              className="h-8 w-full rounded-lg"
              onClick={() => (locked ? onUnlock(month) : setConfirming(true))}
              aria-label={
                locked ? `Reopen ${monthLong(month)}` : `Close ${monthLong(month)}`
              }
            >
              {busy ? (
                <LoaderCircleIcon aria-hidden className="animate-spin" />
              ) : (
                <>
                  {locked ? (
                    <LockOpenIcon aria-hidden />
                  ) : (
                    <LockIcon aria-hidden />
                  )}
                </>
              )}
              {locked ? "Reopen" : "Close"}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------- the year --- */

/**
 * A year of periods, as a calendar rather than a list.
 *
 * Months are a calendar, and a table of sixteen rows asked the reader to
 * rebuild one in their head to answer "is Q1 closed?". Laid out three to a
 * row under a quarter label, that question is answered by looking.
 */
export function PeriodGrid({
  year,
  locks,
  currentMonth,
  busyMonth,
  disabled,
  onLock,
  onUnlock,
}: Readonly<{
  year: number;
  locks: ReadonlyMap<string, PeriodLock>;
  currentMonth: string;
  busyMonth: string | null;
  disabled: boolean;
  onLock: (month: string, note: string) => void;
  onUnlock: (month: string) => void;
}>) {
  return (
    <div className="space-y-5">
      {QUARTERS.map((quarter, quarterIndex) => (
        <div key={quarter.label} className="flex gap-4">
          <div className="w-8 shrink-0 pt-3">
            <span className="text-xs font-medium text-muted-foreground/70 tabular">
              {quarter.label}
            </span>
          </div>

          <div className="grid flex-1 gap-3 sm:grid-cols-3">
            {quarter.offsets.map((offset, cell) => {
              const month = `${year}-${String(offset + 1).padStart(2, "0")}`;

              return (
                <motion.div
                  key={month}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.35,
                    delay: (quarterIndex * 3 + cell) * 0.02,
                    ease: EASE_OUT,
                  }}
                >
                  <PeriodTile
                    month={month}
                    lock={locks.get(month)}
                    isCurrent={month === currentMonth}
                    isFuture={month > currentMonth}
                    busy={busyMonth === month}
                    disabled={disabled}
                    onLock={onLock}
                    onUnlock={onUnlock}
                  />
                </motion.div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
