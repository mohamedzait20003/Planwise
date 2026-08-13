"use client";

import { motion } from "framer-motion";

import { cn } from "@/lib/utils/utils";

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
  count?: number;
};

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
  layoutId,
}: Readonly<{
  value: T;
  onChange: (value: T) => void;
  options: readonly SegmentedOption<T>[];
  label: string;
  className?: string;
  layoutId: string;
}>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-2xl border border-border/60 bg-muted/40 p-1",
        className
      )}
    >
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => {
              const step =
                { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[
                  event.key
                ] ?? 0;
              if (step === 0) return;

              event.preventDefault();
              const index = options.findIndex((o) => o.value === value);
              const next =
                options[(index + step + options.length) % options.length];
              onChange(next.value);
            }}
            className={cn(
              "relative flex h-8 items-center gap-1.5 rounded-xl px-3 text-sm font-medium transition-colors duration-200",
              "focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none",
              selected
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {selected && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-xl bg-card shadow-sm ring-1 ring-border/70"
                transition={{ type: "spring", stiffness: 420, damping: 36 }}
              />
            )}
            <span className="relative z-10">{option.label}</span>
            {option.count !== undefined && (
              <span
                className={cn(
                  "relative z-10 tabular transition-colors duration-200",
                  selected ? "text-muted-foreground" : "text-muted-foreground/60"
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
