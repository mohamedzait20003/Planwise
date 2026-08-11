"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AtSignIcon, LoaderCircleIcon, MailIcon, TriangleAlertIcon } from "lucide-react";

import { AuthShell, AuthRow, AuthLink } from "@/components/auth/auth-shell";
import { PasswordField, PasswordStrength } from "@/components/auth/password-field";
import { GoogleButton } from "@/components/auth/google-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

/** Label row with an optional right-aligned note, so "optional" never crowds the name. */
function FieldLabel({
  htmlFor,
  children,
  note,
}: Readonly<{ htmlFor: string; children: React.ReactNode; note?: string }>) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <Label htmlFor={htmlFor}>{children}</Label>
      {note && <span className="text-xs text-muted-foreground">{note}</span>}
    </div>
  );
}

export default function SignUpPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);

  // Held back until the second field has content, so the form does not accuse
  // the user of a mismatch they have not finished making.
  const mismatch = confirm.length > 0 && confirm !== password;
  const canSubmit = password.length >= 8 && confirm === password;

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setPending(true);
    setTimeout(() => setPending(false), 1200);
  }

  return (
    <AuthShell
      title="Start tracking"
      accent="variance"
      description="Set targets, log what you spent, and see the gap."
      // Wider than the other auth cards: this is the only form with paired
      // columns, and at max-w-md the two-up rows are too cramped to read.
      className="max-w-lg"
      footer={
        <>
          Already have an account?{" "}
          <AuthLink href="/auth/sign-in">Sign in</AuthLink>
        </>
      }
    >
      <form onSubmit={onSubmit}>
        <AuthRow>
          <GoogleButton label="Sign up with Google" />
        </AuthRow>

        <AuthRow className="my-6 flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-[11px] tracking-wider text-muted-foreground uppercase">
            or sign up with email
          </span>
          <Separator className="flex-1" />
        </AuthRow>

        {/* Who you are — tight rhythm inside the group, looser between groups. */}
        <div className="space-y-4">
          <AuthRow className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <FieldLabel htmlFor="fname">First name</FieldLabel>
              <Input id="fname" name="FName" autoComplete="given-name" placeholder="Ada" />
            </div>
            <div className="space-y-2">
              <FieldLabel htmlFor="lname">Last name</FieldLabel>
              <Input id="lname" name="LName" autoComplete="family-name" placeholder="Lovelace" />
            </div>
          </AuthRow>

          <AuthRow className="space-y-2">
            <FieldLabel htmlFor="email">Email</FieldLabel>
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

          <AuthRow className="space-y-2">
            {/* Full width and grouped with the identity fields. Sitting beside a
                password field made this row look accidental — a handle has
                nothing to do with a credential. */}
            <FieldLabel htmlFor="username" note="Optional">
              Username
            </FieldLabel>
            <div className="relative">
              <AtSignIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="username"
                name="userName"
                autoComplete="username"
                placeholder="adalovelace"
                className="pl-9"
              />
            </div>
          </AuthRow>
        </div>

        {/* How you sign in. */}
        <div className="mt-6 space-y-3">
          <AuthRow className="grid gap-4 sm:grid-cols-2">
            <PasswordField
              name="password"
              autoComplete="new-password"
              placeholder="8+ characters"
              value={password}
              onChange={setPassword}
            />
            <PasswordField
              name="confirm"
              label="Confirm password"
              autoComplete="new-password"
              value={confirm}
              onChange={setConfirm}
            />
          </AuthRow>

          {/* Spans both columns: the meter describes the pair, and nesting it
              under one of them would push that column out of alignment. */}
          <AuthRow>
            <PasswordStrength value={password} />
            <AnimatePresence>
              {mismatch && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-1.5 pt-1 text-xs text-unfavorable"
                >
                  <TriangleAlertIcon className="size-3.5 shrink-0" />
                  Passwords do not match
                </motion.p>
              )}
            </AnimatePresence>
          </AuthRow>
        </div>

        <AuthRow className="mt-7">
          <Button
            type="submit"
            disabled={pending || !canSubmit}
            className="h-11 w-full rounded-xl text-sm shadow-lg shadow-primary/20 transition-shadow hover:shadow-xl hover:shadow-primary/30"
          >
            {pending ? (
              <>
                <LoaderCircleIcon className="animate-spin" />
                Creating account…
              </>
            ) : (
              "Create account"
            )}
          </Button>
        </AuthRow>

        <AuthRow className="mt-4">
          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            We&rsquo;ll email you a link to confirm your address. Free to use —
            no tiers, no card.
          </p>
        </AuthRow>
      </form>
    </AuthShell>
  );
}
