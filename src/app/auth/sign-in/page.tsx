"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRightIcon, LoaderCircleIcon, MailIcon } from "lucide-react";

import { AuthShell, AuthRow, AuthLink } from "@/components/auth/auth-shell";
import { PasswordField } from "@/components/auth/password-field";
import { GoogleButton } from "@/components/auth/google-button";
import { FormMessage, errorMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useSignIn } from "@/lib/hooks";
import { ApiError, authError } from "@/lib/api";

function SignInForm() {
  const params = useSearchParams();
  const [Email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const signIn = useSignIn();

  // proxy.ts puts the original destination here when it bounces an
  // unauthenticated request, so both paths land the user where they were
  // headed. Otherwise /auth/callback picks the destination from their role.
  const destination = params.get("callbackUrl") ?? "/auth/callback";

  // Two sources of failure reach this form. The mutation covers credentials;
  // `?error=` is how next-auth reports a Google round trip that failed, which
  // never touched the mutation because the browser left the page for it.
  const redirected = params.get("error");
  const error = signIn.error ?? (redirected ? authError(redirected) : null);

  // An unverified account is not a failed sign-in: the password was right and
  // the server has already re-sent the link. It gets its own copy and its own
  // tone so the user is told to check their inbox, not to try again.
  const unverified = error instanceof ApiError && error.isUnverified;

  function onSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    signIn.mutate(
      { Email, password },
      {
        // A full load rather than a router push: the session cookie has just
        // been written, and every layout above this one needs to re-read it.
        onSuccess: () => window.location.assign(destination),
      }
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <AuthRow>
        <GoogleButton label="Continue with Google" callbackUrl={destination} />
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
            value={Email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
      </AuthRow>

      <AuthRow>
        <PasswordField
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
        />
        <div className="mt-2 text-right">
          <AuthLink href="/auth/forget-password">Forgot password?</AuthLink>
        </div>
      </AuthRow>

      <AuthRow>
        <FormMessage tone={unverified ? "success" : "error"}>
          {error ? errorMessage(error) : null}
        </FormMessage>
      </AuthRow>

      <AuthRow>
        <Button
          type="submit"
          disabled={signIn.isPending || !Email || !password}
          className="h-11 w-full rounded-xl text-sm shadow-lg shadow-primary/20 transition-shadow hover:shadow-xl hover:shadow-primary/30"
        >
          {signIn.isPending ? (
            <>
              <LoaderCircleIcon className="animate-spin" />
              Signing in…
            </>
          ) : (
            <>
              Sign in
              <ArrowRightIcon />
            </>
          )}
        </Button>
      </AuthRow>
    </form>
  );
}

export default function SignInPage() {
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
      {/* useSearchParams needs a Suspense boundary, or this page opts the whole
          route out of static rendering. */}
      <Suspense fallback={<div className="h-80" />}>
        <SignInForm />
      </Suspense>
    </AuthShell>
  );
}
