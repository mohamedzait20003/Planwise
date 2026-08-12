"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { LoaderCircleIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Google's mark, inlined.
 *
 * Not `next/image` from a Google CDN: the button must render instantly and
 * identically offline, and a remote asset would also leak a request to Google
 * before the user has chosen to use it.
 */
function GoogleMark() {
  return (
    <svg viewBox="0 0 18 18" className="size-4" aria-hidden focusable="false">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

export function GoogleButton({
  label,
  callbackUrl = "/auth/callback",
}: Readonly<{ label: string; callbackUrl?: string }>) {
  const [leaving, setLeaving] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      disabled={leaving}
      onClick={() => {
        // A full-page redirect to Google, so there is no result to await and no
        // success path to handle here — `redirect: false` is only honoured by
        // the credentials and email providers. The flag exists so the button
        // stops inviting clicks during the moment before the browser leaves.
        setLeaving(true);
        signIn("google", { callbackUrl });
      }}
      className="h-11 w-full rounded-xl text-sm transition-colors hover:bg-muted"
    >
      {leaving ? <LoaderCircleIcon className="animate-spin" /> : <GoogleMark />}
      {label}
    </Button>
  );
}
