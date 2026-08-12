"use client";

import { LockIcon, LockOpenIcon } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { monthLong } from "@/lib/utils/month";
import { cn } from "@/lib/utils/utils";

/**
 * Marks a closed period.
 *
 * Locking granularity is the MONTH — `PeriodLock` is unique on
 * `[userId, periodMonth]`, so there is no quarter-level lock to represent.
 *
 * The pill is only ever a signal. Disabling the inputs behind it is a courtesy
 * to the user, not the enforcement: the API rejects a write to a locked month
 * with 423 whatever the UI believes, which is what makes the rule real.
 */
export function LockPill({
  month,
  locked,
  note,
  className,
}: Readonly<{
  month: string;
  locked: boolean;
  note?: string | null;
  className?: string;
}>) {
  if (!locked) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground ring-1 ring-border",
          className
        )}
      >
        <LockOpenIcon className="size-3.5" />
        Open
      </span>
    );
  }

  const pill = (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-locked/10 px-2.5 py-1 text-xs font-medium text-locked ring-1 ring-locked/25",
        className
      )}
    >
      <LockIcon className="size-3.5" />
      Locked
    </span>
  );

  return (
    <Tooltip>
      <TooltipTrigger render={pill} />
      <TooltipContent>
        {monthLong(month)} is closed. Plans and actuals are read-only.
        {note ? ` — ${note}` : ""}
      </TooltipContent>
    </Tooltip>
  );
}

/** A full-width notice for a screen whose whole month is closed. */
export function LockedNotice({ month }: Readonly<{ month: string }>) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-locked/8 px-4 py-3 text-sm ring-1 ring-locked/20">
      <LockIcon className="mt-0.5 size-4 shrink-0 text-locked" />
      <p className="leading-relaxed text-muted-foreground">
        <span className="font-medium text-foreground">
          {monthLong(month)} is locked.
        </span>{" "}
        Nothing here can be changed until the period is reopened. Unlock it from
        Periods if you need to make a correction.
      </p>
    </div>
  );
}
