"use client";

import { useState } from "react";
import {
  CalendarIcon,
  FileTextIcon,
  LoaderCircleIcon,
  MailCheckIcon,
  MailWarningIcon,
  ShieldCheckIcon,
  TriangleAlertIcon,
} from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { FormMessage, errorMessage } from "@/components/auth/form-message";
import {
  FootprintChips,
  RoleBadge,
  SignInMethods,
  UserIdentity,
  VerifiedBadge,
  fullName,
} from "@/components/admin/user-cells";
import { useUpdateAdminUser } from "@/lib/hooks";
import type { AdminUser } from "@/lib/api/types";
import { formatRelativeTime } from "@/lib/utils/relative-time";

/**
 * One account, and the two things an operator can change about it.
 *
 * The actions live here rather than in a row menu because both of them want
 * room: a demotion needs a confirm step and a sentence saying what it costs,
 * and neither fits in a dropdown without becoming a dropdown that asks
 * questions. It also keeps the table itself scannable — every row is data, and
 * exactly one control opens this.
 */

const dateFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

/** A pending action awaiting its confirm. Null when nothing is being confirmed. */
type Pending = "demote" | "unverify" | null;

export function UserDetail({
  user,
  actorId,
  open,
  onOpenChange,
}: Readonly<{
  user: AdminUser | null;
  /** The signed-in admin, so the self-demotion rule can be explained up front. */
  actorId: string | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>) {
  if (!user) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
        {/*
          Keyed on the account, which is what resets this panel.

          A primed confirm and a failed mutation both belong to the user they
          were raised against. Clearing them in an effect that watches the id
          would work, and would also mean a render where the new user is on
          screen under the previous one's error. Remounting discards both before
          anything is drawn, and costs nothing here — the subtree is a form.
        */}
        <UserDetailBody key={user.id} user={user} actorId={actorId} />
      </SheetContent>
    </Sheet>
  );
}

function UserDetailBody({
  user,
  actorId,
}: Readonly<{ user: AdminUser; actorId: string | undefined }>) {
  const update = useUpdateAdminUser();
  const [pending, setPending] = useState<Pending>(null);

  const isSelf = user.id === actorId;
  const isAdmin = user.role === "ADMIN";

  function apply(input: { role?: AdminUser["role"]; verified?: boolean }) {
    update.mutate(
      { id: user.id, ...input },
      { onSuccess: () => setPending(null) }
    );
  }

  return (
    <>
    <SheetHeader>
      <SheetTitle className="sr-only">{fullName(user)}</SheetTitle>
      <SheetDescription className="sr-only">
        Account details and the actions available on this user.
      </SheetDescription>
      <UserIdentity user={user} />
    </SheetHeader>

    <div className="flex-1 space-y-6 overflow-y-auto px-4 pb-6">
      <div className="flex flex-wrap items-center gap-2">
        <RoleBadge role={user.role} />
        <VerifiedBadge verified={user.verified} />
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div className="space-y-0.5">
          <dt className="text-xs text-muted-foreground">Joined</dt>
          <dd className="flex items-center gap-1.5 text-sm tabular">
            <CalendarIcon aria-hidden className="size-3.5 text-muted-foreground" />
            {dateFormat.format(new Date(user.createdAt))}
          </dd>
        </div>

        <div className="space-y-0.5">
          <dt className="text-xs text-muted-foreground">Last entry</dt>
          <dd className="text-sm tabular">
            {user.lastEntryAt
              ? formatRelativeTime(user.lastEntryAt)
              : "Never logged one"}
          </dd>
        </div>

        <div className="col-span-2 space-y-0.5">
          <dt className="text-xs text-muted-foreground">Signs in with</dt>
          <dd>
            <SignInMethods user={user} />
          </dd>
        </div>
      </dl>

      <Separator />

      <section className="space-y-2">
        <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Workspace
        </h3>
        <FootprintChips user={user} />
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <FileTextIcon aria-hidden className="size-3" />
          {user.footprint.reportRuns.toLocaleString()} report
          {user.footprint.reportRuns === 1 ? " run" : " runs"}
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Counts only. The console does not read anyone&rsquo;s categories,
          targets or entries — what an account holds is its owner&rsquo;s.
        </p>
      </section>

      <Separator />

      <section className="space-y-3">
        <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Access
        </h3>

        {isSelf ? (
          <p className="rounded-xl bg-muted/60 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
            This is your own account. Changing your own role is refused —
            the screen that would undo it is the one the change takes away.
            Ask another admin.
          </p>
        ) : (
          <RoleAction
            isAdmin={isAdmin}
            pending={pending === "demote"}
            busy={update.isPending}
            onAsk={() => setPending("demote")}
            onCancel={() => setPending(null)}
            onConfirm={() => apply({ role: isAdmin ? "USER" : "ADMIN" })}
          />
        )}

        <VerificationAction
          verified={user.verified}
          pending={pending === "unverify"}
          busy={update.isPending}
          onAsk={() => setPending("unverify")}
          onCancel={() => setPending(null)}
          onConfirm={() => apply({ verified: !user.verified })}
        />

        <FormMessage>
          {update.error ? errorMessage(update.error) : null}
        </FormMessage>
      </section>
    </div>
    </>
  );
}

/**
 * Promote or demote.
 *
 * Promotion happens on one click; demotion asks first. The asymmetry is the
 * point — granting access is recoverable by revoking it, and revoking the wrong
 * one can be unrecoverable if it was the last.
 */
function RoleAction({
  isAdmin,
  pending,
  busy,
  onAsk,
  onCancel,
  onConfirm,
}: Readonly<{
  isAdmin: boolean;
  pending: boolean;
  busy: boolean;
  onAsk: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}>) {
  if (isAdmin && pending) {
    return (
      <ConfirmRow
        question="Remove admin access from this account?"
        detail="They keep their workspace and every figure in it. They lose the console."
        confirmLabel="Remove access"
        busy={busy}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 p-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">
          {isAdmin ? "Admin access" : "Member"}
        </p>
        <p className="text-xs text-muted-foreground">
          {isAdmin
            ? "Can reach this console and manage every account."
            : "Sees only their own workspace."}
        </p>
      </div>

      <Button
        variant={isAdmin ? "destructive" : "outline"}
        size="sm"
        className="shrink-0 rounded-xl"
        disabled={busy}
        onClick={isAdmin ? onAsk : onConfirm}
      >
        {busy && !isAdmin ? (
          <LoaderCircleIcon aria-hidden className="animate-spin" />
        ) : (
          <ShieldCheckIcon aria-hidden />
        )}
        {isAdmin ? "Remove" : "Make admin"}
      </Button>
    </div>
  );
}

/**
 * Mark verified, or take it back.
 *
 * Verifying is the support action — somebody never got the email. Clearing it
 * asks first, because it locks the account's owner out of signing in until they
 * complete the flow again.
 */
function VerificationAction({
  verified,
  pending,
  busy,
  onAsk,
  onCancel,
  onConfirm,
}: Readonly<{
  verified: boolean;
  pending: boolean;
  busy: boolean;
  onAsk: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}>) {
  if (verified && pending) {
    return (
      <ConfirmRow
        question="Clear this account's verification?"
        detail="They will not be able to sign in until they verify their address again."
        confirmLabel="Clear it"
        busy={busy}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 p-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">Email</p>
        <p className="text-xs text-muted-foreground">
          {verified
            ? "Confirmed. They can sign in."
            : "Unconfirmed. Sign-in is refused until they verify."}
        </p>
      </div>

      <Button
        variant={verified ? "ghost" : "outline"}
        size="sm"
        className="shrink-0 rounded-xl"
        disabled={busy}
        onClick={verified ? onAsk : onConfirm}
      >
        <VerifyIcon verified={verified} busy={busy} />
        {verified ? "Clear" : "Mark verified"}
      </Button>
    </div>
  );
}

/**
 * The verification button's icon.
 *
 * Its own component because the choice is three-way — spinner, or one of two
 * envelopes — and three-way choices written as nested ternaries inside JSX are
 * read by counting parentheses.
 */
function VerifyIcon({
  verified,
  busy,
}: Readonly<{ verified: boolean; busy: boolean }>) {
  // Only the one-click direction spins here; clearing is confirmed first, and
  // its spinner belongs to the confirm button.
  if (busy && !verified) {
    return <LoaderCircleIcon aria-hidden className="animate-spin" />;
  }

  return verified ? <MailWarningIcon aria-hidden /> : <MailCheckIcon aria-hidden />;
}

/**
 * The second half of a two-step action.
 *
 * Replaces the row it was triggered from rather than opening a dialog over it,
 * so the question appears where the answer will land and Cancel is the wider,
 * calmer target of the two.
 */
function ConfirmRow({
  question,
  detail,
  confirmLabel,
  busy,
  onCancel,
  onConfirm,
}: Readonly<{
  question: string;
  detail: string;
  confirmLabel: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}>) {
  return (
    <fieldset className="space-y-2.5 rounded-xl border border-unfavorable/30 bg-unfavorable/5 p-3">
      {/* The question is on screen as a paragraph below; the legend is what
          names the group for a screen reader landing on one of the buttons,
          which would otherwise announce "Cancel" with nothing to cancel. */}
      <legend className="sr-only">{question}</legend>

      <div className="flex items-start gap-2">
        <TriangleAlertIcon aria-hidden className="mt-0.5 size-3.5 shrink-0 text-unfavorable" />
        <div className="space-y-0.5">
          <p className="text-sm font-medium">{question}</p>
          <p className="text-xs leading-relaxed text-muted-foreground">{detail}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Cancel first and wider: the safe answer should be the easy one. */}
        <Button
          variant="outline"
          size="sm"
          className="flex-1 rounded-xl"
          disabled={busy}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          variant="destructive"
          size="sm"
          className="shrink-0 rounded-xl"
          disabled={busy}
          onClick={onConfirm}
        >
          {busy && <LoaderCircleIcon aria-hidden className="animate-spin" />}
          {confirmLabel}
        </Button>
      </div>
    </fieldset>
  );
}
