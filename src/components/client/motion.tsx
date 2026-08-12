"use client";

import { motion } from "framer-motion";
import type { Variants } from "framer-motion";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.04 } },
};

export const rise: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: EASE_OUT } },
};

/** Staggers its `<Rise>` children on mount. */
export function Stagger({
  children,
  className,
}: Readonly<{ children: React.ReactNode; className?: string }>) {
  return (
    <motion.div
      className={className}
      variants={stagger}
      initial="hidden"
      animate="show"
    >
      {children}
    </motion.div>
  );
}

export function Rise({
  children,
  className,
}: Readonly<{ children: React.ReactNode; className?: string }>) {
  return (
    <motion.div className={className} variants={rise}>
      {children}
    </motion.div>
  );
}

/**
 * A table row that animates in and out.
 *
 * `height: 0` on exit rather than a plain fade, so deleting an entry collapses
 * the gap instead of leaving a hole the rows below jump across.
 */
export const rowMotion = {
  initial: { opacity: 0, y: -4 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, transition: { duration: 0.15 } },
  transition: { duration: 0.28, ease: EASE_OUT },
} as const;
