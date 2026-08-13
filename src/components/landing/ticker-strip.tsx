import { ArrowDownRightIcon, ArrowUpRightIcon, LockIcon } from "lucide-react";

import { cn } from "@/lib/utils/utils";
import { formatSignedCurrency } from "@/lib/utils/variance";

type Entry = {
  category: string;
  month: string;
  variance: number;
  locked?: boolean;
};

const entries: Entry[] = [
  { category: "Marketing", month: "Jan", variance: -200, locked: true },
  { category: "Payroll", month: "Jan", variance: 500, locked: true },
  { category: "Tools", month: "Jan", variance: -1_240, locked: true },
  { category: "Payroll", month: "Feb", variance: -200 },
  { category: "Contractors", month: "Feb", variance: 3_100 },
  { category: "Travel", month: "Feb", variance: -860 },
  { category: "Marketing", month: "Mar", variance: 150 },
  { category: "Hosting", month: "Mar", variance: -75 },
  { category: "Payroll", month: "Mar", variance: -600 },
];

function Chip({ entry }: Readonly<{ entry: Entry }>) {
  const over = entry.variance > 0;
  const Arrow = over ? ArrowUpRightIcon : ArrowDownRightIcon;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs",
        over
          ? "border-unfavorable/25 bg-unfavorable/8"
          : "border-favorable/25 bg-favorable/8"
      )}
    >
      {entry.locked && <LockIcon aria-hidden className="size-3 text-locked" />}
      <span className="font-medium">{entry.category}</span>
      <span className="text-muted-foreground">{entry.month}</span>
      {/* The arrow is what carries over/under for anyone who cannot separate
          the two tints — the colour only reinforces it. */}
      <span
        className={cn(
          "inline-flex items-center gap-0.5 font-medium tabular",
          over ? "text-unfavorable" : "text-favorable"
        )}
      >
        <Arrow aria-hidden className="size-3" />
        {formatSignedCurrency(entry.variance)}
      </span>
    </span>
  );
}

/**
 * A slow band of real-shaped variance rows between the hero and the
 * explanation.
 *
 * It is doing one job: teaching the page's vocabulary — category, month,
 * signed number, locked — before any section asks the reader to hold it. The
 * marquee keyframe pairs with a duplicated track so the loop has no seam, and
 * the global reduced-motion rule freezes it at a legible position rather than
 * mid-slide.
 */
export function TickerStrip() {
  return (
    <div className="relative overflow-hidden border-y border-border/60 bg-card/30 py-4">
      {/* Feathered ends, so chips arrive and leave instead of being cut */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-linear-to-r from-background to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-linear-to-l from-background to-transparent"
      />

      <div className="animate-marquee flex w-max gap-3 hover:paused">
        {entries.map((entry) => (
          <Chip key={`${entry.category}-${entry.month}`} entry={entry} />
        ))}
        {/* The second pass is what makes the loop seamless; it is the same
            content, so it is hidden from screen readers rather than read out
            a second time. */}
        <div aria-hidden className="flex gap-3">
          {entries.map((entry) => (
            <Chip key={`${entry.category}-${entry.month}-echo`} entry={entry} />
          ))}
        </div>
      </div>
    </div>
  );
}
