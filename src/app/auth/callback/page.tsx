"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { LoaderCircleIcon } from "lucide-react";

import { AuthShell } from "@/components/auth/auth-shell";



/** Same-origin paths only. Anything else would make this an open redirect. */
function safePath(value: string | null): string | null {
  if (!value?.startsWith("/")) return null;

  // "//evil.com" is a protocol-relative URL, not a path — the browser treats it
  // as absolute, so it has to be rejected alongside "https://evil.com".
  if (value.startsWith("//")) return null;

  return value;
}

function CallbackRedirect() {
  const router = useRouter();
  const params = useSearchParams();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      router.replace("/auth/sign-in?error=SessionMissing");
      return;
    }

    const requested = safePath(params.get("callbackUrl"));
    const byRole = session?.user?.role === "ADMIN" ? "/admin/dashboard" : "/client/dashboard";

    router.replace(requested ?? byRole);
  }, [status, session, params, router]);

  return (
    <div className="flex flex-col items-center gap-5 py-4 text-center">
      <motion.span
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 20 }}
        className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20"
      >
        <LoaderCircleIcon className="size-7 animate-spin" />
      </motion.span>

      <p className="text-sm leading-relaxed text-muted-foreground">
        Taking you to your dashboard.
      </p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <AuthShell title="Signing you" accent="in">
      <Suspense fallback={<div className="h-40" />}>
        <CallbackRedirect />
      </Suspense>
    </AuthShell>
  );
}
