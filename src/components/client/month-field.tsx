"use client";

import { useId } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { addMonths, isMonth, monthLong } from "@/lib/utils/month";
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
