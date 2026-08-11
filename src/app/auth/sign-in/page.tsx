"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRightIcon, LoaderCircleIcon, MailIcon } from "lucide-react";

import { AuthShell, AuthRow, AuthLink } from "@/components/auth/auth-shell";
import { PasswordField } from "@/components/auth/password-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { GoogleButton } from "@/components/auth/google-button";

export default function SignInPage() {
  // Local only — the API is not wired up yet. Present so the pending state and
  // its animation are real rather than described in a comment.
  const [pending, setPending] = useState(false);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setTimeout(() => setPending(false), 1200);
  }

  return (
    <AuthShell
      title="Welcome"
      accent="back"
      description="Pick up where your numbers left off."
      footer={
        <>
          New here? <AuthLink href="/auth/sign-up">Create an account</AuthLink>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <AuthRow>
          <GoogleButton label="Continue with Google" />
        </AuthRow>

        <AuthRow className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-[11px] tracking-wider text-muted-foreground uppercase">
            or
          </span>
          <Separator className="flex-1" />
        </AuthRow>

        <AuthRow className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <MailIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              name="Email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              className="pl-9"
            />
          </div>
        </AuthRow>

        <AuthRow>
          <PasswordField name="password" autoComplete="current-password" />
          <div className="mt-2 text-right">
            <AuthLink href="/auth/forget-password">Forgot password?</AuthLink>
          </div>
        </AuthRow>

        <AuthRow>
          <Button
            type="submit"
            disabled={pending}
            className="h-11 w-full rounded-xl text-sm shadow-lg shadow-primary/20 transition-shadow hover:shadow-xl hover:shadow-primary/30"
          >
            {pending ? (
              <>
                <LoaderCircleIcon className="animate-spin" />
                Signing in…
              </>
            ) : (
              <>
                Sign in
                <motion.span
                  className="inline-flex"
                  initial={false}
                  whileHover={{ x: 2 }}
                >
                  <ArrowRightIcon />
                </motion.span>
              </>
            )}
          </Button>
        </AuthRow>
      </form>
    </AuthShell>
  );
}
