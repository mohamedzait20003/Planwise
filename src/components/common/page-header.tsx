"use client";

import { motion } from "framer-motion";

import { cn } from "@/lib/utils/utils";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/**
 * The masthead every app screen opens with.
 *
 * Actions sit in the header rather than floating above the table, so the
 * primary verb for a screen is always in the same place — a user who has
 * learned where "Add entry" lives on one screen finds "Lock month" without
 * hunting.
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: Readonly<{
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}>) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE_OUT }}
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="max-w-2xl text-sm leading-relaxed text-pretty text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      )}
    </motion.header>
  );
}

/** A titled panel. The app's one container, so screens do not each invent one. */
export function Panel({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: Readonly<{
  title?: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}>) {
  return (
    <section
      className={cn(
        "surface-glass overflow-hidden rounded-2xl border border-border/60",
        className
      )}
    >
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
          <div className="space-y-0.5">
            {title && <h2 className="font-medium">{title}</h2>}
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}
