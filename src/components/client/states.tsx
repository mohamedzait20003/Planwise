"use client";

import { motion } from "framer-motion";
import { LoaderCircleIcon, TriangleAlertIcon } from "lucide-react";

import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/utils";

/**
 * The three states every data screen has, in one place.
 *
 * They are components rather than a `renderState(query)` helper because each
 * screen wants them in a different container — inside a table body, inside a
 * card, or filling a panel — and a helper that took a wrapper prop would be
 * longer than the three call sites it saved.
 */

/** Skeleton rows sized to a table, so the layout does not jump when data lands. */
export function LoadingRows({
  rows = 5,
  className,
}: Readonly<{ rows?: number; className?: string }>) {
  return (
    <div className={cn("space-y-2", className)} aria-hidden>
      {Array.from({ length: rows }, (_, index) => (
        <motion.div
          key={index}
          className="h-11 rounded-lg bg-muted"
          initial={{ opacity: 0.35 }}
          animate={{ opacity: [0.35, 0.7, 0.35] }}
          transition={{
            duration: 1.4,
            repeat: Infinity,
            ease: "easeInOut",
            // Offset per row so the shimmer travels down the list rather than
            // pulsing as one block, which reads as a broken screen.
            delay: index * 0.09,
          }}
        />
      ))}
    </div>
  );
}

export function LoadingPanel({ label = "Loading" }: Readonly<{ label?: string }>) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
      <LoaderCircleIcon className="size-6 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

/**
 * A failed query.
 *
 * `ApiError.message` is the server's own wording and safe to show; anything
 * else is a bug whose message may carry internals, so it is replaced.
 */
export function ErrorState({
  error,
  onRetry,
}: Readonly<{ error: unknown; onRetry?: () => void }>) {
  const message =
    error instanceof ApiError
      ? error.message
      : "Something went wrong loading this.";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-4 rounded-2xl bg-unfavorable/8 px-6 py-12 text-center ring-1 ring-unfavorable/20"
      role="alert"
    >
      <span className="flex size-12 items-center justify-center rounded-2xl bg-unfavorable/12 text-unfavorable ring-1 ring-unfavorable/25">
        <TriangleAlertIcon className="size-5" />
      </span>
      <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
        {message}
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" className="rounded-xl" onClick={onRetry}>
          Try again
        </Button>
      )}
    </motion.div>
  );
}

/**
 * Nothing to show yet.
 *
 * Always carries the action that would fill it. An empty state that only says
 * "no data" leaves the user to work out what to do next, which on a first run
 * is the whole of their experience.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: Readonly<{
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}>) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center gap-4 px-6 py-14 text-center"
    >
      <motion.span
        initial={{ scale: 0.75, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.08 }}
        className="flex size-14 items-center justify-center rounded-2xl bg-primary/8 text-primary ring-1 ring-primary/15"
      >
        {icon}
      </motion.span>

      <div className="space-y-1.5">
        <p className="font-medium">{title}</p>
        <p className="mx-auto max-w-sm text-sm leading-relaxed text-pretty text-muted-foreground">
          {description}
        </p>
      </div>

      {action}
    </motion.div>
  );
}
