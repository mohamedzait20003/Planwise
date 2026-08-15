"use client";

import { motion } from "framer-motion";
import { ChevronLeftIcon, ChevronRightIcon, SlidersHorizontalIcon } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  FootprintChips,
  LastEntry,
  RoleBadge,
  SignInMethods,
  UserIdentity,
  VerifiedBadge,
  fullName,
} from "@/components/admin/user-cells";
import type { AdminUser } from "@/lib/api/types";

/**
 * The user list, drawn twice.
 *
 * A table on wide screens and cards below `md`. The alternative — one table
 * inside a horizontal scroller — technically fits, but six columns on a 375px
 * phone means every row is read by dragging, and the column that matters is
 * always the one off-screen. The two renderings share every cell, so there is
 * one definition of how a role or a footprint is drawn.
 */

const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function UserTable({
  users,
  onManage,
}: Readonly<{ users: readonly AdminUser[]; onManage: (user: AdminUser) => void }>) {
  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>User</TableHead>
              <TableHead>Access</TableHead>
              <TableHead>Workspace</TableHead>
              <TableHead>Last entry</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {users.map((user, index) => (
              <motion.tr
                key={user.id}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.28,
                  // A short per-row offset, capped: a full page staggered at
                  // 30ms would take most of a second to finish arriving.
                  delay: Math.min(index * 0.03, 0.3),
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="border-b transition-colors last:border-0 hover:bg-muted/50"
              >
                <TableCell className="max-w-64">
                  <UserIdentity user={user} />
                </TableCell>

                <TableCell>
                  <div className="flex flex-col items-start gap-1.5">
                    <div className="flex flex-wrap gap-1.5">
                      <RoleBadge role={user.role} />
                      <VerifiedBadge verified={user.verified} />
                    </div>
                    <SignInMethods user={user} />
                  </div>
                </TableCell>

                <TableCell>
                  <FootprintChips user={user} className="max-w-52" />
                </TableCell>

                <TableCell>
                  <LastEntry user={user} />
                </TableCell>

                <TableCell className="text-xs whitespace-nowrap tabular">
                  {dateFormat.format(new Date(user.createdAt))}
                </TableCell>

                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => onManage(user)}
                  >
                    <SlidersHorizontalIcon aria-hidden />
                    Manage
                    {/* The visible word is "Manage" on every row; a screen
                        reader needs to know which account it manages. */}
                    <span className="sr-only"> {fullName(user)}</span>
                  </Button>
                </TableCell>
              </motion.tr>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="divide-y divide-border/60 md:hidden">
        {users.map((user) => (
          <li key={user.id} className="space-y-3 p-4">
            <UserIdentity user={user} />

            <div className="flex flex-wrap gap-1.5">
              <RoleBadge role={user.role} />
              <VerifiedBadge verified={user.verified} />
            </div>

            <FootprintChips user={user} />

            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Joined {dateFormat.format(new Date(user.createdAt))}
              </p>

              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => onManage(user)}
              >
                <SlidersHorizontalIcon aria-hidden />
                Manage
                <span className="sr-only"> {fullName(user)}</span>
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

/**
 * Page back and forward.
 *
 * Numbered pages were considered and dropped: the list is filtered and searched
 * far more often than it is paged, and a row of numbers that is mostly wrong
 * after the next keystroke is noise. The count is what an operator actually
 * reads off this.
 */
export function Pager({
  page,
  perPage,
  total,
  busy,
  onPageChange,
}: Readonly<{
  page: number;
  perPage: number;
  total: number;
  busy: boolean;
  onPageChange: (page: number) => void;
}>) {
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const first = total === 0 ? 0 : (page - 1) * perPage + 1;
  const last = Math.min(page * perPage, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 px-4 py-3">
      <p aria-live="polite" className="text-xs text-muted-foreground tabular">
        {total === 0 ? (
          "No users"
        ) : (
          <>
            Showing <span className="font-medium text-foreground">{first}</span>–
            <span className="font-medium text-foreground">{last}</span> of{" "}
            <span className="font-medium text-foreground">{total.toLocaleString()}</span>
          </>
        )}
      </p>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl"
          disabled={busy || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeftIcon aria-hidden />
          Previous
        </Button>

        <span className="text-xs text-muted-foreground tabular">
          {page} / {lastPage}
        </span>

        <Button
          variant="outline"
          size="sm"
          className="rounded-xl"
          disabled={busy || page >= lastPage}
          onClick={() => onPageChange(page + 1)}
        >
          Next
          <ChevronRightIcon aria-hidden />
        </Button>
      </div>
    </div>
  );
}
