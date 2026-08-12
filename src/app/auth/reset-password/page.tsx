"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CircleCheckIcon, LoaderCircleIcon, TriangleAlertIcon } from "lucide-react";

import { useResetPassword } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { AuthShell, AuthRow, AuthLink } from "@/components/auth/auth-shell";
import { PasswordField, PasswordStrength } from "@/components/auth/password-field";
import { FormMessage, errorMessage } from "@/components/auth/form-message";

function ResetForm() {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const reset = useResetPassword();

  const mismatch = confirm.length > 0 && confirm !== password;
  const canSubmit = token !== "" && password.length >= 8 && confirm === password;

  function onSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    reset.mutate({ token, password });
  }

  // Arriving without a token means the link was mangled or typed by hand.
  // Say so plainly rather than showing a form that cannot possibly succeed.
  if (!token) {
    return (
      <div className="space-y-5 text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-locked-muted text-locked ring-1 ring-locked/25">
          <TriangleAlertIcon className="size-6" />
        </span>
        <p className="text-sm leading-relaxed text-muted-foreground">
          This page needs a reset link. Request a new one and open it from your
          email.
        </p>
        <Button
          variant="outline"
          className="h-11 w-full rounded-xl"
          nativeButton={false}
          render={<Link href="/auth/forget-password" />}
        >
          Request a reset link
        </Button>
      </div>
    );
  }

  if (reset.isSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-5 text-center"
      >
        <motion.span
          className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-favorable/12 text-favorable ring-1 ring-favorable/25"
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 18 }}
        >
          <CircleCheckIcon className="size-6" />
        </motion.span>

        <p className="text-sm leading-relaxed text-muted-foreground">
          {reset.data?.message ?? "Your password has been updated."} The link
          has been used and will not work again.
        </p>

        <Button
          className="h-11 w-full rounded-xl"
          nativeButton={false}
          render={<Link href="/auth/sign-in" />}
        >
          Sign in
        </Button>
      </motion.div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <AuthRow>
        <PasswordField
          name="password"
          label="New password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={password}
          onChange={setPassword}
          hint={<PasswordStrength value={password} />}
        />
      </AuthRow>

      <AuthRow>
        <PasswordField
          name="confirm"
          label="Confirm password"
          autoComplete="new-password"
          value={confirm}
          onChange={setConfirm}
          hint={
            <AnimatePresence>
              {mismatch && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-1.5 pt-1 text-xs text-unfavorable"
                >
                  <TriangleAlertIcon className="size-3.5" />
                  Passwords do not match
                </motion.p>
              )}
            </AnimatePresence>
          }
        />
      </AuthRow>

      <AuthRow>
        <FormMessage>
          {reset.error ? errorMessage(reset.error) : null}
        </FormMessage>
      </AuthRow>

      <AuthRow>
        <Button
          type="submit"
          disabled={reset.isPending || !canSubmit}
          className="h-11 w-full rounded-xl text-sm shadow-lg shadow-primary/20"
        >
          {reset.isPending ? (
            <>
              <LoaderCircleIcon className="animate-spin" />
              Updating…
            </>
          ) : (
            "Update password"
          )}
        </Button>
      </AuthRow>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Choose a new"
      accent="password"
      description="Make it long. Length beats punctuation."
      footer={<AuthLink href="/auth/sign-in">Back to sign in</AuthLink>}
    >
      <Suspense fallback={<div className="h-64" />}>
        <ResetForm />
      </Suspense>
    </AuthShell>
  );
}
