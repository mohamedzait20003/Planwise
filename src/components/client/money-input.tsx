"use client";

import { useEffect, useRef, useState } from "react";
import { MinusIcon, PlusIcon } from "lucide-react";

import { cn } from "@/lib/utils/utils";

/**
 * A money field.
 *
 * `type="text"` with `inputMode="decimal"`, not `type="number"`. The native
 * control brings spinners that differ per browser, refuses to show thousands
 * separators, and — the reason it was wrong here — steps by the `step`
 * attribute, so arrow keys on a budget field nudge by one cent. Owning the
 * input means the steppers can move by an amount someone setting a budget
 * would actually use.
 *
 * Formatting follows focus: separators while reading, raw digits while typing.
 * Reformatting mid-keystroke fights the caret, and a comma appearing under the
 * cursor is the single most irritating thing a money field can do.
 *
 * Stepping commits on a short idle rather than per click, so holding down "+"
 * is one save and not fifteen.
 */

const COMMIT_DELAY_MS = 700;

const grouped = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function sanitize(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, "");
  const [whole, ...rest] = cleaned.split(".");

  if (rest.length === 0) return whole;
  return `${whole}.${rest.join("").slice(0, 2)}`;
}

function parse(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function MoneyInput({
  id,
  value,
  onCommit,
  onChange,
  disabled = false,
  step = 100,
  label,
  placeholder = "0",
  className,
}: Readonly<{
  id?: string;
  value: number | undefined;
  onCommit?: (amount: number | null) => void;
  onChange?: (amount: number | null) => void;
  disabled?: boolean;
  step?: number;
  label: string;
  placeholder?: string;
  className?: string;
}>) {
  const [draft, setDraft] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const committed = value === undefined ? "" : String(value);
  const raw = draft ?? committed;
  const shown = focused || raw === "" ? raw : grouped.format(Number(raw) || 0);

  useEffect(() => {
    return () => window.clearTimeout(timer.current);
  }, []);

  function edit(next: string) {
    setDraft(next);
    onChange?.(parse(next));
  }

  function commit(next: string) {
    window.clearTimeout(timer.current);
    setDraft(null);

    if (next === committed) return;
    onCommit?.(parse(next));
  }

  function nudge(direction: 1 | -1, multiplier: number) {
    const current = Number(raw) || 0;
    const next = Math.max(0, current + direction * step * multiplier);
    const text = String(Math.round(next * 100) / 100);

    edit(text);

    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setDraft(null);
      if (text !== committed) onCommit?.(parse(text));
    }, COMMIT_DELAY_MS);
  }

  const stepper = "flex h-11 w-10 shrink-0 items-center justify-center text-muted-foreground transition-colors enabled:hover:bg-muted enabled:hover:text-foreground disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none";

  return (
    <div
      className={cn(
        "inline-flex items-stretch overflow-hidden rounded-xl border border-input bg-background transition-all",
        "focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/40",
        disabled && "bg-muted opacity-70",
        "dark:bg-input/30",
        className
      )}
    >
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        disabled={disabled || (Number(raw) || 0) <= 0}
        onClick={(event) => nudge(-1, event.shiftKey ? 10 : 1)}
        className={cn(stepper, "border-r border-input")}
      >
        <MinusIcon className="size-4" />
      </button>

      <div className="relative flex min-w-0 flex-1 items-center">
        <span
          aria-hidden
          className={cn(
            "pl-3 text-sm transition-colors",
            raw ? "text-foreground" : "text-muted-foreground"
          )}
        >
          $
        </span>

        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          disabled={disabled}
          value={shown}
          placeholder={placeholder}
          aria-label={label}
          onFocus={() => setFocused(true)}
          onChange={(event) => edit(sanitize(event.target.value))}
          onBlur={() => {
            setFocused(false);
            commit(raw);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
              return;
            }
            if (event.key === "Escape") {
              setDraft(null);
              event.currentTarget.blur();
              return;
            }
            // Arrow keys step by the same amount the buttons do, which is the
            // behaviour the native control would have given for free if its
            // step were usable.
            if (event.key === "ArrowUp" || event.key === "ArrowDown") {
              event.preventDefault();
              nudge(event.key === "ArrowUp" ? 1 : -1, event.shiftKey ? 10 : 1);
            }
          }}
          className="h-11 w-full min-w-0 bg-transparent px-2 text-right text-base font-medium tabular outline-none disabled:cursor-not-allowed disabled:text-muted-foreground"
        />
      </div>

      <button
        type="button"
        aria-label={`Increase ${label}`}
        disabled={disabled}
        onClick={(event) => nudge(1, event.shiftKey ? 10 : 1)}
        className={cn(stepper, "border-l border-input")}
      >
        <PlusIcon className="size-4" />
      </button>
    </div>
  );
}
