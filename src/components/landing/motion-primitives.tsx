"use client";

import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import type { Variants } from "framer-motion";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/** Fade + rise as the element scrolls into view. Fires once. */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
}: Readonly<{
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}>) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}

/** Parent that staggers its <Reveal>-less children via `stagger` variants. */
export const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

export const staggerChild: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.65, ease: EASE_OUT } },
};

export function StaggerGroup({
  children,
  className,
}: Readonly<{ children: React.ReactNode; className?: string }>) {
  return (
    <motion.div
      className={className}
      variants={staggerParent}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: Readonly<{ children: React.ReactNode; className?: string }>) {
  return (
    <motion.div className={className} variants={staggerChild}>
      {children}
    </motion.div>
  );
}

/**
 * Counts from 0 to `to` when scrolled into view. Driven by a MotionValue so it
 * animates without a state update per frame.
 */
export function CountUp({
  to,
  duration = 1.5,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
}: Readonly<{
  to: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}>) {
  const count = useMotionValue(0);
  const text = useTransform(count, (v) => {
    const abs = Math.abs(v).toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    return `${v < 0 ? "−" : ""}${prefix}${abs}${suffix}`;
  });

  return (
    <motion.span
      className={className}
      // onViewportEnter is an event, not an effect — no cascading render
      onViewportEnter={() => {
        animate(count, to, { duration, ease: EASE_OUT });
      }}
      viewport={{ once: true, margin: "-60px" }}
    >
      <motion.span>{text}</motion.span>
    </motion.span>
  );
}
