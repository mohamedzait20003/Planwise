"use client";

import {
  FolderIcon,
  KeyRoundIcon,
  LockIcon,
  MailCheckIcon,
  MailWarningIcon,
  ReceiptIcon,
  ShieldCheckIcon,
  TargetIcon,
  UserRoundIcon,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { AdminUser } from "@/lib/api/types";
import { formatRelativeTime } from "@/lib/utils/relative-time";
import { cn } from "@/lib/utils/utils";

/**
 * The pieces a user is displayed with.
 *
 * Factored out because the same user appears three times — a table row on wide
 * screens, a card on narrow ones, and the detail sheet — and three copies of
 * "how a role is drawn" is three places for them to drift apart.
 */

export function initialsOf(user: AdminUser): string {
  const initials = `${user.firstName.at(0) ?? ""}${user.lastName.at(0) ?? ""}`;
  return initials.toUpperCase() || user.email.slice(0, 2).toUpperCase();
}

export function fullName(user: AdminUser): string {
  return `${user.firstName} ${user.lastName}`.trim() || user.email;
}

export function UserIdentity({
  user,
  className,
}: Readonly<{ user: AdminUser; className?: string }>) {
  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <Avatar className="size-9 shrink-0 ring-1 ring-border">
        {user.avatarUrl && (
          <AvatarImage src={user.avatarUrl} alt="" />
        )}
        <AvatarFallback className="bg-primary/12 text-xs font-semibold text-primary">
          {initialsOf(user)}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{fullName(user)}</p>
        {/* Emails are long and have no spaces, so they get an explicit break
            rather than overflowing the cell they sit in. */}
        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
      </div>
    </div>
  );
}

export function RoleBadge({ role }: Readonly<{ role: AdminUser["role"] }>) {
  const isAdmin = role === "ADMIN";

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1",
        isAdmin && "border-primary/40 bg-primary/8 text-primary"
      )}
    >
      {isAdmin ? (
        <ShieldCheckIcon aria-hidden />
      ) : (
        <UserRoundIcon aria-hidden />
      )}
      {isAdmin ? "Admin" : "Member"}
    </Badge>
  );
}

/**
 * Verified or not.
 *
 * Carries an icon and a word, never colour alone — this is a status a
 * colourblind operator has to be able to read, and green-versus-amber is
 * exactly the pair that does not survive.
 */
export function VerifiedBadge({ verified }: Readonly<{ verified: boolean }>) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1",
        verified
          ? "border-favorable/35 bg-favorable/8 text-favorable"
          : "border-locked/35 bg-locked/8 text-locked"
      )}
    >
      {verified ? <MailCheckIcon aria-hidden /> : <MailWarningIcon aria-hidden />}
      {verified ? "Verified" : "Unverified"}
    </Badge>
  );
}

/** How the account signs in. Not a security control — a support hint. */
export function SignInMethods({ user }: Readonly<{ user: AdminUser }>) {
  const methods: string[] = [];
  if (user.hasPassword) methods.push("Password");
  for (const provider of user.providers) {
    // "GOOGLE" → "Google". The enum is the storage form, not a label.
    methods.push(provider.charAt(0) + provider.slice(1).toLowerCase());
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <KeyRoundIcon aria-hidden className="size-3" />
      {methods.length > 0 ? methods.join(" · ") : "None"}
    </span>
  );
}

const FOOTPRINT = [
  { key: "categories", label: "categories", icon: FolderIcon },
  { key: "plans", label: "plans", icon: TargetIcon },
  { key: "actuals", label: "actuals", icon: ReceiptIcon },
  { key: "lockedMonths", label: "locked months", icon: LockIcon },
] as const;

/**
 * What the account contains, as counts.
 *
 * Counts and never amounts. An operator needs to know whether an account is in
 * use; what its owner spends is theirs, and this is the screen where that line
 * is most convenient to cross.
 */
export function FootprintChips({
  user,
  className,
}: Readonly<{ user: AdminUser; className?: string }>) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {FOOTPRINT.map(({ key, label, icon: Icon }) => {
        const count = user.footprint[key];

        return (
          <li
            key={key}
            className={cn(
              "inline-flex items-center gap-1 rounded-lg bg-muted/60 px-1.5 py-0.5 text-xs",
              count === 0 && "opacity-50"
            )}
          >
            <Icon aria-hidden className="size-3 text-muted-foreground" />
            <span className="font-medium tabular">{count.toLocaleString()}</span>
            <span className="sr-only"> {label}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function LastEntry({ user }: Readonly<{ user: AdminUser }>) {
  if (!user.lastEntryAt) {
    return <span className="text-xs text-muted-foreground">No entries</span>;
  }

  return (
    <span className="text-xs tabular">
      {formatRelativeTime(user.lastEntryAt)}
    </span>
  );
}
