"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CircleCheckIcon, TriangleAlertIcon } from "lucide-react";

import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils/utils";

/**
 * Turns whatever a mutation threw into one line the user can act on.
 *
 * `ApiError` already carries the server's `message`, which every endpoint
 * writes for a human. Anything else is a bug or a dead connection, and its
 * message is not fit to show — so it gets replaced rather than leaked.
 */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    // Status 0 is "never reached the server" — the interceptor's own wording is
    // already the right thing to say.
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

export function FormMessage({
  tone = "error",
  children,
  className,
}: Readonly<{
  tone?: "error" | "success";
  children?: React.ReactNode;
  className?: string;
}>) {
  return (
    <AnimatePresence>
      {children && (
        <motion.div
          role={tone === "error" ? "alert" : "status"}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className={cn("overflow-hidden", className)}
        >
          <div
            className={cn(
              "flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs leading-relaxed ring-1",
              tone === "error"
                ? "bg-unfavorable/10 text-unfavorable ring-unfavorable/20"
                : "bg-favorable/10 text-favorable ring-favorable/20"
            )}
          >
            {tone === "error" ? (
              <TriangleAlertIcon className="mt-px size-3.5 shrink-0" />
            ) : (
              <CircleCheckIcon className="mt-px size-3.5 shrink-0" />
            )}
            <span>{children}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
