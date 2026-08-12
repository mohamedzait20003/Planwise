"use client";

import { Suspense, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CircleCheckIcon,
  LoaderCircleIcon,
  MailIcon,
  TriangleAlertIcon,
} from "lucide-react";

import { AuthShell, AuthLink } from "@/components/auth/auth-shell";
import { errorMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { useVerifyEmail } from "@/lib/hooks";

const TONE = {
  pending: "bg-primary/10 text-primary ring-primary/20",
  success: "bg-favorable/12 text-favorable ring-favorable/25",
  failure: "bg-locked-muted text-locked ring-locked/25",
} as const;

function VerifyState() {
  const token = useSearchParams().get("token") ?? "";
  const verify = useVerifyEmail();

  const fired = useRef(false);
  const { mutate } = verify;

  useEffect(() => {
    if (!token || fired.current) return;
    fired.current = true;
    mutate(token);
  }, [token, mutate]);

  let state: keyof typeof TONE = "pending";

  if (!token || verify.isError)
    state = "failure";
  else if (verify.isSuccess)
    state = "success";

  return (
    <div className="space-y-6 text-center">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={state}
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.85, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 20 }}
          className={`mx-auto flex size-16 items-center justify-center rounded-2xl ring-1 ${TONE[state]}`}
        >
          {state === "pending" && (
            <LoaderCircleIcon className="size-7 animate-spin" />
          )}
          {state === "success" && <CircleCheckIcon className="size-7" />}
          {state === "failure" && <TriangleAlertIcon className="size-7" />}
        </motion.span>
      </AnimatePresence>

      <p className="text-sm leading-relaxed text-muted-foreground">
        {state === "pending" && "One moment while we check your link."}
        {state === "success" &&
          (verify.data?.message ?? "Your email is confirmed.")}
        {state === "failure" &&
          (token
            ? errorMessage(verify.error)
            : "This page needs a confirmation link. Open the one we emailed you.")}
      </p>

      {state === "success" && (
        <Button
          className="h-11 w-full rounded-xl shadow-lg shadow-primary/20"
          nativeButton={false}
          render={<Link href="/auth/sign-in" />}
        >
          Continue to sign in
        </Button>
      )}

      {state === "failure" && (
        <Button
          variant="outline"
          className="h-11 w-full rounded-xl"
          nativeButton={false}
          render={<Link href="/auth/sign-in" />}
        >
          <MailIcon />
          {/* Signing in with an unverified account re-issues the link, so this
              is the resend path — no separate endpoint needed. */}
          Sign in to get a new link
        </Button>
      )}
    </div>
  );
}

export default function EmailVerifyPage() {
  return (
    <AuthShell
      title="Confirming your"
      accent="email"
      footer={<AuthLink href="/auth/sign-in">Back to sign in</AuthLink>}
    >
      <Suspense fallback={<div className="h-40" />}>
        <VerifyState />
      </Suspense>
    </AuthShell>
  );
}
