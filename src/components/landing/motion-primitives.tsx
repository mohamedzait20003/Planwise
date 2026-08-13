"use client";

import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import type { Variants } from "framer-motion";

import { cn } from "@/lib/utils/utils";

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

/**
 * A headline whose words rise out of their own clipped boxes, one after
 * another.
 *
 * Splitting on words rather than characters is deliberate: a per-character
 * reveal on a 9-word headline is 50-odd animated nodes and reads as an effect,
 * where per-word reads as the sentence arriving. Each word keeps its own
 * `<span>`, so the text still wraps, still selects, and is still one string to
 * a screen reader.
 */
export function WordReveal({
  text,
  className,
  delay = 0,
  /** Words to render in the accent treatment, matched case-insensitively. */
  accent,
  accentClassName,
}: Readonly<{
  text: string;
  className?: string;
  delay?: number;
  accent?: string;
  accentClassName?: string;
}>) {
  const reduced = useReducedMotion();
  const words = text.split(" ");
  const accented = accent?.toLowerCase();

  return (
    <span className={className}>
      {words.map((word, i) => {
        const isAccent =
          accented !== undefined &&
          word.replace(/[^\p{L}]/gu, "").toLowerCase() === accented;

        return (
          // Words repeat in a sentence, so the index has to be part of the key.
          <span key={`${word}-${i}`} className="word-mask">
            <motion.span
              className={cn("inline-block", isAccent && accentClassName)}
              initial={reduced ? false : { y: "110%", opacity: 0 }}
              animate={{ y: "0%", opacity: 1 }}
              transition={{
                duration: 0.75,
                delay: delay + i * 0.055,
                ease: EASE_OUT,
              }}
            >
              {word}
            </motion.span>
            {i < words.length - 1 && " "}
          </span>
        );
      })}
    </span>
  );
}

/**
 * Tilts its children toward the pointer.
 *
 * Mouse only, and only when motion is welcome: on a touch screen there is no
 * hover to track, and a card that tilts under a finger fights the scroll. The
 * rotation is spring-smoothed so it trails the cursor slightly instead of
 * snapping to it, and it returns to flat on leave.
 */
export function Tilt({
  children,
  className,
  /** Maximum rotation in degrees at the far edge. */
  max = 5,
}: Readonly<{ children: React.ReactNode; className?: string; max?: number }>) {
  const reduced = useReducedMotion();

  const px = useMotionValue(0);
  const py = useMotionValue(0);

  const spring = { stiffness: 150, damping: 20, mass: 0.6 };
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [max, -max]), spring);
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-max, max]), spring);

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <div className={className} style={{ perspective: 1400 }}>
      <motion.div
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        onPointerMove={(event) => {
          if (event.pointerType !== "mouse") return;
          const box = event.currentTarget.getBoundingClientRect();
          px.set((event.clientX - box.left) / box.width - 0.5);
          py.set((event.clientY - box.top) / box.height - 0.5);
        }}
        onPointerLeave={() => {
          px.set(0);
          py.set(0);
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}
