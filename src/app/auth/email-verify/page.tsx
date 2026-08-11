"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CircleCheckIcon,
  LoaderCircleIcon,
  MailIcon,
  TriangleAlertIcon,
} from "lucide-react";

import { AuthShell, AuthLink } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";

/**
 * The three states this page can be in.
 *
 * `verifying` is the real landing state once the API is wired: the token comes
 * from the query string and is exchanged immediately. Until then the buttons
 * below drive it so every state can be seen and styled.
 */
type State = "verifying" | "verified" | "invalid";

const COPY: Record<
  State,
  { title: string; accent: string; description: string }
> = {
  verifying: {
    title: "Confirming your",
    accent: "email",
    description: "One moment while we check your link.",
  },
  verified: {
    title: "Your email is",
    accent: "confirmed",
    description: "You can sign in and start setting targets.",
  },
  invalid: {
    title: "This link has",
    accent: "expired",
    description:
      "Verification links last 24 hours and work once. Sign in to have a fresh one sent.",
  },
};

export default function EmailVerifyPage() {
  const [state, setState] = useState<State>("verifying");
  const copy = COPY[state];

  return (
    <AuthShell
      title={copy.title}
      accent={copy.accent}
      description={copy.description}
      footer={<AuthLink href="/auth/sign-in">Back to sign in</AuthLink>}
    >
      <div className="space-y-6 text-center">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={state}
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 20 }}
            className={
              {
                verifying:
                  "mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20",
                verified:
                  "mx-auto flex size-16 items-center justify-center rounded-2xl bg-favorable/12 text-favorable ring-1 ring-favorable/25",
                invalid:
                  "mx-auto flex size-16 items-center justify-center rounded-2xl bg-locked-muted text-locked ring-1 ring-locked/25",
              }[state]
            }
          >
            {state === "verifying" && (
              <LoaderCircleIcon className="size-7 animate-spin" />
            )}
            {state === "verified" && <CircleCheckIcon className="size-7" />}
            {state === "invalid" && <TriangleAlertIcon className="size-7" />}
          </motion.span>
        </AnimatePresence>

        {state === "verified" && (
          <Button
            className="h-11 w-full rounded-xl shadow-lg shadow-primary/20"
            nativeButton={false}
            render={<a href="/auth/sign-in" />}
          >
            Continue to sign in
          </Button>
        )}

        {state === "invalid" && (
          <Button
            variant="outline"
            className="h-11 w-full rounded-xl"
            nativeButton={false}
            render={<a href="/auth/sign-in" />}
          >
            <MailIcon />
            Sign in to resend
          </Button>
        )}

        {/* Temporary: lets every state be reviewed before the API exists. */}
        <div className="flex justify-center gap-1.5 border-t border-border/60 pt-4">
          {(["verifying", "verified", "invalid"] as const).map((next) => (
            <Button
              key={next}
              size="xs"
              variant={state === next ? "secondary" : "ghost"}
              className="rounded-full text-[11px] text-muted-foreground"
              onClick={() => setState(next)}
            >
              {next}
            </Button>
          ))}
        </div>
      </div>
    </AuthShell>
  );
}
