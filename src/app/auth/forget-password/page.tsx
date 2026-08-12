"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeftIcon, LoaderCircleIcon, MailCheckIcon, MailIcon } from "lucide-react";

import { AuthShell, AuthRow, AuthLink } from "@/components/auth/auth-shell";
import { FormMessage, errorMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRequestPasswordReset } from "@/lib/hooks";

export default function ForgetPasswordPage() {
  const [Email, setEmail] = useState("");
  const request = useRequestPasswordReset();

  function onSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    request.mutate(Email.trim());
  }

  return (
    <AuthShell
      title="Forgot your"
      accent="password?"
      description={
        request.isSuccess
          ? undefined
          : "Give us the address on the account and we'll send a reset link."
      }
      footer={
        <AuthLink href="/auth/sign-in">
          <span className="inline-flex items-center gap-1.5">
            <ArrowLeftIcon className="size-3.5" />
            Back to sign in
          </span>
        </AuthLink>
      }
    >
      <AnimatePresence mode="wait" initial={false}>
        {request.isSuccess ? (
          <motion.div
            key="sent"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="space-y-4 text-center"
          >
            <motion.span
              className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-favorable/12 text-favorable ring-1 ring-favorable/25"
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 320, damping: 18 }}
            >
              <MailCheckIcon className="size-6" />
            </motion.span>

            <p className="text-sm leading-relaxed text-muted-foreground">
              {/* The server's own wording, which is deliberately conditional —
                  it answers identically whether or not the account exists, so
                  this page cannot be used to discover which addresses are
                  registered. */}
              {request.data?.message ??
                "If an account exists for that address, a reset link is on its way."}
            </p>

            <Button
              variant="outline"
              className="w-full rounded-xl"
              onClick={() => request.reset()}
            >
              Use a different address
            </Button>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            onSubmit={onSubmit}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="space-y-5"
          >
            <AuthRow className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <MailIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  className="pl-9"
                  value={Email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
            </AuthRow>

            <AuthRow>
              <FormMessage>
                {request.error ? errorMessage(request.error) : null}
              </FormMessage>
            </AuthRow>

            <AuthRow>
              <Button
                type="submit"
                disabled={request.isPending || Email.trim() === ""}
                className="h-11 w-full rounded-xl text-sm shadow-lg shadow-primary/20"
              >
                {request.isPending ? (
                  <>
                    <LoaderCircleIcon className="animate-spin" />
                    Sending…
                  </>
                ) : (
                  "Send reset link"
                )}
              </Button>
            </AuthRow>
          </motion.form>
        )}
      </AnimatePresence>
    </AuthShell>
  );
}
