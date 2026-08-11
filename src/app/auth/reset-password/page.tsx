"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CircleCheckIcon, LoaderCircleIcon, TriangleAlertIcon } from "lucide-react";

import { AuthShell, AuthRow, AuthLink } from "@/components/auth/auth-shell";
import { PasswordField, PasswordStrength } from "@/components/auth/password-field";
import { Button } from "@/components/ui/button";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  // Only surfaced once the user has typed into the second field, so the form
  // does not accuse them of a mismatch they have not finished making.
  const mismatch = confirm.length > 0 && confirm !== password;
  const canSubmit = password.length >= 8 && confirm === password;

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setPending(true);
    setTimeout(() => {
      setPending(false);
      setDone(true);
    }, 1100);
  }

  return (
    <AuthShell
      title="Choose a new"
      accent="password"
      description={done ? undefined : "Make it long. Length beats punctuation."}
      footer={done ? undefined : <AuthLink href="/auth/sign-in">Back to sign in</AuthLink>}
    >
      <AnimatePresence mode="wait" initial={false}>
        {done ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
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
              Your password has been updated. The reset link has been used and
              will not work again.
            </p>

            <Button className="h-11 w-full rounded-xl" render={<a href="/auth/sign-in" />} nativeButton={false}>
              Sign in
            </Button>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            onSubmit={onSubmit}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-5"
          >
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
              <Button
                type="submit"
                disabled={pending || !canSubmit}
                className="h-11 w-full rounded-xl text-sm shadow-lg shadow-primary/20"
              >
                {pending ? (
                  <>
                    <LoaderCircleIcon className="animate-spin" />
                    Updating…
                  </>
                ) : (
                  "Update password"
                )}
              </Button>
            </AuthRow>
          </motion.form>
        )}
      </AnimatePresence>
    </AuthShell>
  );
}
