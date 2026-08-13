"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckIcon, LockIcon, LockOpenIcon, ShieldXIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/utils";

const months = [
  { id: "2026-01", label: "Jan 2026", locked: true },
  { id: "2026-02", label: "Feb 2026", locked: false },
  { id: "2026-03", label: "Mar 2026", locked: false },
] as const;

type Result = { kind: "saved" | "rejected"; month: string };

/**
 * A working miniature of the write path.
 *
 * The section used to assert that a locked month rejects writes; this lets the
 * reader find out. Picking January and pressing Save produces the same
 * PERIOD_LOCKED refusal the API returns, which is a claim the page can only
 * make once — so it may as well be demonstrated rather than described.
 */
export function LockDemo() {
  const [monthId, setMonthId] = useState<string>("2026-01");
  const [amount, setAmount] = useState("19800");
  const [result, setResult] = useState<Result | null>(null);
  // Bumped on every rejection so the refusal animation restarts even when the
  // same month is submitted twice.
  const [attempt, setAttempt] = useState(0);

  const month = months.find((m) => m.id === monthId) ?? months[0];

  function save() {
    setAttempt((n) => n + 1);
    setResult({ kind: month.locked ? "rejected" : "saved", month: month.id });
  }

  return (
    <div className="surface-glass overflow-hidden rounded-2xl border border-border/60">
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
        <span className="text-xs font-medium">Log an actual</span>
        <span className="ml-auto font-mono text-[10px] text-muted-foreground">
          POST /api/client/actuals
        </span>
      </div>

      <div className="space-y-4 p-4">
        <fieldset>
          <legend className="mb-2 text-xs font-medium text-muted-foreground">
            Month
          </legend>
          <div className="flex flex-wrap gap-2">
            {months.map((m) => {
              const selected = m.id === monthId;

              return (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    setMonthId(m.id);
                    setResult(null);
                  }}
                  className={cn(
                    "inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition-colors duration-200",
                    "focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none",
                    selected
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border/70 text-muted-foreground hover:border-border hover:text-foreground"
                  )}
                >
                  {m.locked ? (
                    <LockIcon aria-hidden className="size-3 text-locked" />
                  ) : (
                    <LockOpenIcon aria-hidden className="size-3" />
                  )}
                  {m.label}
                  <span className="sr-only">
                    {m.locked ? " (locked)" : " (open)"}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Keyed on the attempt count so a repeat rejection replays the shake */}
        <div
          key={attempt}
          className={cn(
            "flex flex-col gap-2 sm:flex-row sm:items-end",
            result?.kind === "rejected" && "animate-refuse"
          )}
        >
          <div className="flex-1 space-y-1.5">
            <label
              htmlFor="lock-demo-amount"
              className="block text-xs font-medium text-muted-foreground"
            >
              Payroll — amount
            </label>
            <div className="flex h-9 items-center gap-1 rounded-xl border border-border/70 bg-background px-3 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30">
              <span className="text-sm text-muted-foreground">$</span>
              <input
                id="lock-demo-amount"
                // `inputMode` rather than type=number: this is a currency
                // field, and the spinner and scroll-to-change of a number
                // input are both wrong for one.
                inputMode="decimal"
                value={amount}
                onChange={(event) => {
                  setAmount(event.target.value.replace(/[^\d.]/g, ""));
                  setResult(null);
                }}
                className="h-full w-full bg-transparent text-sm tabular outline-none"
              />
            </div>
          </div>

          <Button className="h-9 rounded-xl sm:w-28" onClick={save}>
            Save actual
          </Button>
        </div>

        {/* Announced politely: the outcome matters, but it is the reader's own
            button press, so it should not interrupt what they are reading. */}
        <div aria-live="polite" className="min-h-20">
          <AnimatePresence mode="wait" initial={false}>
            {result && (
              <motion.div
                key={`${result.kind}-${result.month}`}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className={cn(
                  "flex gap-3 rounded-xl p-3 ring-1",
                  result.kind === "rejected"
                    ? "bg-unfavorable/8 ring-unfavorable/25"
                    : "bg-favorable/8 ring-favorable/25"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg",
                    result.kind === "rejected"
                      ? "bg-unfavorable/12 text-unfavorable"
                      : "bg-favorable/12 text-favorable"
                  )}
                >
                  {result.kind === "rejected" ? (
                    <ShieldXIcon aria-hidden className="size-3.5" />
                  ) : (
                    <CheckIcon aria-hidden className="size-3.5" />
                  )}
                </span>

                <div className="space-y-1">
                  <p className="font-mono text-xs font-medium">
                    {result.kind === "rejected"
                      ? "403 PERIOD_LOCKED"
                      : "201 Created"}
                  </p>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {result.kind === "rejected" ? (
                      <>
                        {result.month} is closed, so the write never reached the
                        database. Reopen the period to edit it.
                      </>
                    ) : (
                      <>
                        {result.month} is open, so the actual was recorded and
                        the variance for Payroll moved with it.
                      </>
                    )}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
