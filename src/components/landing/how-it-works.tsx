"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { LockIcon, TableIcon, TargetIcon, TrendingUpIcon } from "lucide-react";

import { SectionHeading } from "./section-heading";
import { cn } from "@/lib/utils/utils";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

const steps = [
  {
    icon: TargetIcon,
    title: "Set the target",
    desc: "Give each category a monthly number. Marketing → January 2026 → $5,000.",
    detail: "Plans are one per category per month, so there is never a second target to reconcile against.",
  },
  {
    icon: TableIcon,
    title: "Log what happened",
    desc: "Enter actuals by hand or drop in a CSV. Categories and months are validated on the way in.",
    detail: "A bad row is reported with its reason and skipped — the good rows in the same file still land.",
  },
  {
    icon: TrendingUpIcon,
    title: "Read the variance",
    desc: "Pick a range and see plan, actual, variance and variance % per category × month.",
    detail: "Variance is actual − plan, so the sign is stable: negative is under plan, everywhere, always.",
  },
  {
    icon: LockIcon,
    title: "Close the period",
    desc: "Lock the month. Plans and actuals inside it become read-only for everyone.",
    detail: "The lock is checked on every write, so a closed month reads the same today as it will next year.",
  },
];

/**
 * The four steps as a walk down a rail rather than four cards in a row.
 *
 * The left column pins and reports which step the reader is on; the right
 * column is the one that actually scrolls. That ordering matters — a grid of
 * equal cards says the steps are interchangeable, and these are strictly
 * sequential: there is nothing to log against until a target exists, and
 * nothing to lock until both are in.
 */
export function HowItWorks() {
  const [active, setActive] = useState(0);

  return (
    <section id="how" className="scroll-mt-24 px-6 py-24">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] lg:gap-20">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeading
            align="start"
            eyebrow="How it works"
            title="Four steps, one number that matters"
          >
            No financial-planning background required — if you can fill in a
            spreadsheet row, you can run a variance report.
          </SectionHeading>

          {/* Progress readout. Hidden from assistive tech: it mirrors the
              headings on the right, which are already in the document. */}
          <div aria-hidden className="mt-10 hidden items-center gap-4 lg:flex">
            <span className="font-display text-6xl leading-none text-muted-foreground/30 tabular">
              0{active + 1}
            </span>
            <div className="flex-1 space-y-2">
              <div className="h-1 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  animate={{ scaleX: (active + 1) / steps.length }}
                  style={{ originX: 0 }}
                  transition={{ type: "spring", stiffness: 220, damping: 30 }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {steps[active].title}
              </p>
            </div>
          </div>
        </div>

        <ol className="relative">
          {/* The rail itself, stopping at the last node rather than running on
              past it into empty space. */}
          <span
            aria-hidden
            className="absolute top-6 bottom-14 left-5 w-px bg-linear-to-b from-border via-border to-transparent"
          />

          {steps.map(({ icon: Icon, title, desc, detail }, i) => (
            <motion.li
              key={title}
              className="relative flex gap-6 pb-12 last:pb-0"
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              // The viewport band is narrow and sits above centre, so the step
              // the reader is looking at is the one reported on the left.
              viewport={{ margin: "-45% 0px -45% 0px" }}
              onViewportEnter={() => setActive(i)}
              transition={{ duration: 0.6, ease: EASE_OUT }}
            >
              <span
                className={cn(
                  "relative z-10 flex size-10 shrink-0 items-center justify-center rounded-xl ring-1 transition-colors duration-300",
                  i <= active
                    ? "bg-primary text-primary-foreground ring-primary/30"
                    : "bg-card text-muted-foreground ring-border"
                )}
              >
                <Icon aria-hidden className="size-4.5" />
              </span>

              <div className="space-y-2 pt-1.5">
                <h3 className="flex items-baseline gap-2.5 font-medium">
                  <span className="text-xs text-muted-foreground/60 tabular">
                    0{i + 1}
                  </span>
                  {title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {desc}
                </p>
                <p className="border-l-2 border-border/70 pl-3 text-sm leading-relaxed text-muted-foreground/75">
                  {detail}
                </p>
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
