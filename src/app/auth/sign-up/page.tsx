"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  AtSignIcon,
  LoaderCircleIcon,
  MailCheckIcon,
  MailIcon,
  TriangleAlertIcon,
} from "lucide-react";

import { AuthShell, AuthRow, AuthLink } from "@/components/auth/auth-shell";
import { PasswordField, PasswordStrength } from "@/components/auth/password-field";
import { GoogleButton } from "@/components/auth/google-button";
import { FormMessage, errorMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useSignUp } from "@/lib/hooks";

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
  const [form, setForm] = useState({
    FName: "",
    LName: "",
    Email: "",
    userName: "",
  });
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const signUp = useSignUp();

  const set = (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }));

  // Held back until the second field has content, so the form does not accuse
  // the user of a mismatch they have not finished making.
  const mismatch = confirm.length > 0 && confirm !== password;
  const canSubmit =
    form.FName.trim() !== "" &&
    form.LName.trim() !== "" &&
    form.Email.trim() !== "" &&
    password.length >= 8 &&
    confirm === password;

  function onSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    signUp.mutate({
      FName: form.FName.trim(),
      LName: form.LName.trim(),
      Email: form.Email.trim(),
      password,
      // Optional in the schema; send it only when filled, or the server would
      // try to claim the empty string as a unique username.
      ...(form.userName.trim() ? { userName: form.userName.trim() } : {}),
    });
  }

  return (
    <AuthShell
      title="Start tracking"
      accent="variance"
      description={
        signUp.isSuccess
          ? undefined
          : "Set targets, log what you spent, and see the gap."
      }
      className="max-w-lg"
      footer={
        <>
          Already have an account?{" "}
          <AuthLink href="/auth/sign-in">Sign in</AuthLink>
        </>
      }
    >
      <AnimatePresence mode="wait" initial={false}>
        {signUp.isSuccess ? (
          <motion.div
            key="sent"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
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
              {signUp.data?.message ??
                "Account created. Check your email to confirm your address."}
            </p>

            <Button
              variant="outline"
              className="w-full rounded-xl"
              nativeButton={false}
              render={<Link href="/auth/sign-in" />}
            >
              Go to sign in
            </Button>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            onSubmit={onSubmit}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -8 }}
          >
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

            <div className="space-y-4">
              <AuthRow className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <FieldLabel htmlFor="fname">First name</FieldLabel>
                  <Input
                    id="fname"
                    autoComplete="given-name"
                    placeholder="Ada"
                    value={form.FName}
                    onChange={set("FName")}
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel htmlFor="lname">Last name</FieldLabel>
                  <Input
                    id="lname"
                    autoComplete="family-name"
                    placeholder="Lovelace"
                    value={form.LName}
                    onChange={set("LName")}
                  />
                </div>
              </AuthRow>

              <AuthRow className="space-y-2">
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <div className="relative">
                  <MailIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    className="pl-9"
                    value={form.Email}
                    onChange={set("Email")}
                  />
                </div>
              </AuthRow>

              <AuthRow className="space-y-2">
                <FieldLabel htmlFor="username" note="Optional">
                  Username
                </FieldLabel>
                <div className="relative">
                  <AtSignIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="username"
                    autoComplete="username"
                    placeholder="adalovelace"
                    className="pl-9"
                    value={form.userName}
                    onChange={set("userName")}
                  />
                </div>
              </AuthRow>
            </div>

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

            <AuthRow className="mt-5">
              <FormMessage>
                {signUp.error ? errorMessage(signUp.error) : null}
              </FormMessage>
            </AuthRow>

            <AuthRow className="mt-5">
              <Button
                type="submit"
                disabled={signUp.isPending || !canSubmit}
                className="h-11 w-full rounded-xl text-sm shadow-lg shadow-primary/20 transition-shadow hover:shadow-xl hover:shadow-primary/30"
              >
                {signUp.isPending ? (
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
                We&rsquo;ll email you a link to confirm your address. Free to
                use — no tiers, no card.
              </p>
            </AuthRow>
          </motion.form>
        )}
      </AnimatePresence>
    </AuthShell>
  );
}
