"use client";

import { useId } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { addMonths, isMonth, monthLong, quarterOf, yearOf } from "@/lib/utils/month";
import type { MonthRange } from "@/lib/utils/month";
import { cn } from "@/lib/utils/utils";

/**
 * Month controls.
 *
 * All of them wrap `<input type="month">` rather than a hand-built calendar.
 * The native control already speaks the "YYYY-MM" the API wants, is keyboard
 * and screen-reader complete, and on mobile opens the platform month wheel —
 * three things a custom popover would have to earn back before it broke even.
 */

/** One month, with arrows either side for the common ±1 step. */
export function MonthField({
  value,
  onChange,
  label = "Month",
  className,
}: Readonly<{
  value: string;
  onChange: (month: string) => void;
  label?: string;
  className?: string;
}>) {
  const id = useId();

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`Previous month, ${monthLong(addMonths(value, -1))}`}
          onClick={() => onChange(addMonths(value, -1))}
          className="size-9 shrink-0 rounded-xl"
        >
          <ChevronLeftIcon className="size-4" />
        </Button>

        <input
          id={id}
          type="month"
          value={value}
          onChange={(event) => {
            if (isMonth(event.target.value)) onChange(event.target.value);
          }}
          className="h-9 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-sm tabular transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none dark:bg-input/30"
        />

        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`Next month, ${monthLong(addMonths(value, 1))}`}
          onClick={() => onChange(addMonths(value, 1))}
          className="size-9 shrink-0 rounded-xl"
        >
          <ChevronRightIcon className="size-4" />
        </Button>
      </div>
    </div>
  );
}

/**
 * A from/to range, with the presets people actually ask for.
 *
 * The brief's example is "Q1 2026", so quarters are one click. The presets set
 * both ends at once, which also means the common case can never produce the
 * inverted range the free inputs allow.
 */
export function RangeField({
  value,
  onChange,
  anchor,
  className,
}: Readonly<{
  value: MonthRange;
  onChange: (range: MonthRange) => void;
  /** Month the presets are computed from — usually the current month. */
  anchor: string;
  className?: string;
}>) {
  const fromId = useId();
  const toId = useId();

  const inverted = value.from > value.to;

  const presets: Array<{ label: string; range: MonthRange }> = [
    { label: "This quarter", range: quarterOf(anchor) },
    { label: "Last quarter", range: quarterOf(addMonths(anchor, -3)) },
    { label: "This year", range: yearOf(anchor) },
  ];

  const isActive = (range: MonthRange) =>
    range.from === value.from && range.to === value.to;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={fromId} className="text-xs text-muted-foreground">
            From
          </Label>
          <input
            id={fromId}
            type="month"
            value={value.from}
            onChange={(event) => {
              if (isMonth(event.target.value)) {
                onChange({ ...value, from: event.target.value });
              }
            }}
            className="h-9 rounded-xl border border-input bg-background px-3 text-sm tabular transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none dark:bg-input/30"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={toId} className="text-xs text-muted-foreground">
            To
          </Label>
          <input
            id={toId}
            type="month"
            value={value.to}
            onChange={(event) => {
              if (isMonth(event.target.value)) {
                onChange({ ...value, to: event.target.value });
              }
            }}
            className="h-9 rounded-xl border border-input bg-background px-3 text-sm tabular transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none dark:bg-input/30"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {presets.map((preset) => (
            <Button
              key={preset.label}
              type="button"
              variant={isActive(preset.range) ? "secondary" : "ghost"}
              size="sm"
              onClick={() => onChange(preset.range)}
              className="h-9 rounded-xl text-xs"
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      {inverted && (
        <p role="alert" className="text-xs text-unfavorable">
          The start month is after the end month, so this range covers nothing.
        </p>
      )}
    </div>
  );
}
