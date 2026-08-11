"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRightIcon, CircleCheckIcon, SparklesIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ReportPreview } from "./report-preview";
import { CountUp } from "./motion-primitives";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

const rise = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE_OUT } },
};

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
};

export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pt-28 pb-20 sm:pt-36">
      {/* ---- Atmosphere -------------------------------------------------- */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        {/* Hairline grid, faded out toward the edges */}
        <div className="bg-grid absolute inset-0 mask-[radial-gradient(ellipse_70%_55%_at_50%_28%,black,transparent)]" />

        {/* Aurora blobs */}
        <div className="animate-aurora absolute -top-40 left-1/2 h-136 w-208 -translate-x-1/2 rounded-full bg-primary/25 blur-[110px]" />
        <div
          className="animate-aurora absolute -top-20 left-[18%] h-80 w-80 rounded-full bg-chart-2/25 blur-[100px]"
          style={{ animationDelay: "-6s" }}
        />
        <div
          className="animate-aurora absolute top-10 right-[14%] h-72 w-72 rounded-full bg-accent/40 blur-[90px]"
          style={{ animationDelay: "-11s" }}
        />
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative mx-auto max-w-3xl text-center"
      >
        <motion.div variants={rise} className="flex justify-center">
          <span className="ring-shimmer inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3.5 py-1.5 text-xs font-medium backdrop-blur">
            <SparklesIcon className="size-3.5 text-primary" />
            Targets, actuals, and the gap between them
          </span>
        </motion.div>

        <motion.h1
          variants={rise}
          className="mt-6 text-5xl font-semibold tracking-tight text-balance sm:text-6xl"
        >
          Know the{" "}
          <span className="font-display text-gradient italic">variance</span>{" "}
          before the quarter closes
        </motion.h1>

        <motion.p
          variants={rise}
          className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-pretty text-muted-foreground"
        >
          Planwise turns monthly targets and real spend into one honest number
          per category. Close a period and it stops moving — enforced at the API,
          not just greyed out in the UI.
        </motion.p>

        <motion.div
          variants={rise}
          className="mt-9 flex flex-col justify-center gap-3 sm:flex-row"
        >
          <Button
            size="lg"
            className="h-11 rounded-full px-6 text-sm shadow-lg shadow-primary/25 transition-shadow hover:shadow-xl hover:shadow-primary/30"
            nativeButton={false}
            render={<Link href="/auth/sign-up" />}
          >
            Start tracking
            <ArrowRightIcon className="transition-transform duration-300 group-hover/button:translate-x-0.5" />
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-11 rounded-full px-6 text-sm"
            nativeButton={false}
            render={<Link href="#report" />}
          >
            See a live report
          </Button>
        </motion.div>

        <motion.div
          variants={rise}
          className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground"
        >
          <CircleCheckIcon className="size-3 text-favorable" />
          Free to use — no tiers, no card required
        </motion.div>
      </motion.div>

      {/* ---- The product, reflected -------------------------------------- */}
      <div className="relative mx-auto mt-16 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 40, rotateX: 10 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 1.1, delay: 0.5, ease: EASE_OUT }}
          style={{ perspective: 1200 }}
        >
          <ReportPreview />
        </motion.div>

        {/* Mirror image beneath the card — cropped to a shallow slice */}
        <div aria-hidden className="h-28 overflow-hidden">
          <ReportPreview className="reflect" />
        </div>

        {/* Contact shadow so the card sits on the page instead of floating */}
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-4 left-1/2 h-16 w-2/3 -translate-x-1/2 rounded-[50%] bg-primary/20 blur-3xl"
        />
      </div>

      {/* ---- Proof strip -------------------------------------------------- */}
      <div className="mx-auto mt-16 grid max-w-3xl grid-cols-2 gap-6 sm:grid-cols-4">
        {[
          { value: 75, prefix: "$", suffix: "k", label: "Planned, Q1" },
          { value: 69.65, prefix: "$", suffix: "k", label: "Actual", decimals: 2 },
          { value: -7.13, suffix: "%", label: "Net variance", decimals: 2, tone: "text-favorable" },
          { value: 1, label: "Period locked" },
        ].map(({ value, label, prefix, suffix, decimals, tone }, i) => (
          <motion.div
            key={label}
            className="text-center"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, delay: i * 0.08, ease: EASE_OUT }}
          >
            <CountUp
              to={value}
              prefix={prefix}
              suffix={suffix}
              decimals={decimals}
              className={`block text-2xl font-semibold tabular ${tone ?? ""}`}
            />
            <p className="mt-1 text-xs text-muted-foreground">{label}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
