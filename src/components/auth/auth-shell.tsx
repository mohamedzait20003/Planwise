"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { Logo } from "@/components/common/logo";
import { cn } from "@/lib/utils/utils";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.08 } },
};

const rise = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
};

export function AuthRow({
  children,
  className,
}: Readonly<{ children: React.ReactNode; className?: string }>) {
  return (
    <motion.div variants={rise} className={className}>
      {children}
    </motion.div>
  );
}

/**
 * The frame every auth page sits in.
 *
 * A single centred card rather than the usual split-screen: the app shell
 * already renders the nav and footer around this, and a full-bleed panel would
 * fight both. The atmosphere is the same aurora and hairline grid as the
 * landing hero, so arriving here does not feel like a different product.
 */
export function AuthShell({
  title,
  accent,
  description,
  children,
  footer,
  className,
}: Readonly<{
  title: string;
  accent?: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}>) {
  return (
    <section className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-6 py-16">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="bg-grid absolute inset-0 mask-[radial-gradient(ellipse_60%_50%_at_50%_40%,black,transparent)]" />
        <div className="animate-aurora absolute -top-32 left-1/2 h-120 w-176 -translate-x-1/2 rounded-full bg-primary/22 blur-[110px]" />
        <div
          className="animate-aurora absolute right-[12%] bottom-0 h-72 w-72 rounded-full bg-chart-2/20 blur-[100px]"
          style={{ animationDelay: "-7s" }}
        />
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className={cn("relative w-full max-w-md", className)}
      >
        <motion.div variants={rise} className="mb-8 flex justify-center">
          <Link href="/" aria-label="Planwise home" className="group">
            <Logo markClassName="size-8 transition-transform duration-500 group-hover:rotate-[-6deg]" />
          </Link>
        </motion.div>

        <motion.div
          variants={rise}
          className="surface-glass rounded-3xl border border-border/60 p-7 sm:p-8"
        >
          <div className="mb-6 space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-balance">
              {title}
              {accent && (
                <>
                  {" "}
                  <span className="font-display text-gradient italic">
                    {accent}
                  </span>
                </>
              )}
            </h1>
            {description && (
              <p className="text-sm leading-relaxed text-pretty text-muted-foreground">
                {description}
              </p>
            )}
          </div>

          {children}
        </motion.div>

        {footer && (
          <motion.p
            variants={rise}
            className="mt-6 text-center text-sm text-muted-foreground"
          >
            {footer}
          </motion.p>
        )}
      </motion.div>
    </section>
  );
}

export function AuthLink({
  href,
  children,
}: Readonly<{ href: string; children: React.ReactNode }>) {
  return (
    <Link
      href={href}
      className="font-medium text-primary underline-offset-4 transition-colors hover:underline"
    >
      {children}
    </Link>
  );
}
