"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LoaderCircleIcon, LockIcon, LockOpenIcon } from "lucide-react";

import { PageHeader, Panel } from "@/components/client/page-header";
import { Rise, Stagger, rowMotion } from "@/components/client/motion";
import { ErrorState, LoadingRows } from "@/components/client/states";
import { FormMessage, errorMessage } from "@/components/auth/form-message";
import { LockPill } from "@/components/client/lock-pill";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLockPeriod, useLocks, useUnlockPeriod } from "@/lib/hooks";
import { addMonths, currentMonth, monthLong } from "@/lib/utils/month";
import { cn } from "@/lib/utils/utils";

const WINDOW_BACK = 12;
const WINDOW_FORWARD = 3;

function ActionIcon({
  working,
  locked,
}: Readonly<{ working: boolean; locked: boolean }>) {
  if (working) return <LoaderCircleIcon className="animate-spin" />;
  return locked ? <LockOpenIcon /> : <LockIcon />;
}

function windowMonths(anchor: string): string[] {
  const out: string[] = [];
  
  for (let offset = WINDOW_FORWARD; offset >= -WINDOW_BACK; offset--) {
    out.push(addMonths(anchor, offset));
  }
  
  return out;
}

export default function PeriodsPage() {
  const anchor = currentMonth();
  const locks = useLocks();
  const lock = useLockPeriod();
  const unlock = useUnlockPeriod();

  const [pendingMonth, setPendingMonth] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const byMonth = new Map((locks.data ?? []).map((entry) => [entry.month, entry]));
  const months = windowMonths(anchor);

  const busy = lock.isPending || unlock.isPending;
  const failure = lock.error ?? unlock.error;

  function onLock(month: string) {
    setPendingMonth(month);
    lock.mutate(
      { month, note: note.trim() || undefined },
      { onSettled: () => setPendingMonth(null) }
    );
    setNote("");
  }

  function onUnlock(month: string) {
    setPendingMonth(month);
    unlock.mutate(month, { onSettled: () => setPendingMonth(null) });
  }

  return (
    <Stagger className="space-y-8">
      <Rise>
        <PageHeader
          title="Periods"
          description="Close a month and its plans and actuals become read-only. The API refuses writes to a closed month — hiding the buttons is not what enforces it."
        />
      </Rise>

      <Rise>
        <Panel
          title="Note for the next lock"
          description="Optional. Stored with the lock so a future reader knows why the month was closed."
        >
          <Input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="e.g. Signed off with finance on the 5th"
            maxLength={200}
            className="sm:max-w-md"
          />
        </Panel>
      </Rise>

      {failure && (
        <Rise>
          <FormMessage>{errorMessage(failure)}</FormMessage>
        </Rise>
      )}

      {locks.isError && (
        <Rise>
          <ErrorState error={locks.error} onRetry={() => locks.refetch()} />
        </Rise>
      )}

      <Rise>
        <Panel title="Months" bodyClassName="p-0">
          {locks.isPending && !locks.isError && <LoadingRows rows={6} className="p-5" />}

          {!locks.isPending && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence initial={false}>
                    {months.map((month) => {
                      const entry = byMonth.get(month);
                      const isLocked = Boolean(entry);
                      const working = busy && pendingMonth === month;

                      return (
                        <motion.tr
                          key={month}
                          {...rowMotion}
                          className={cn(
                            "border-b transition-colors hover:bg-muted/40",
                            month === anchor && "bg-primary/4"
                          )}
                        >
                          <TableCell className="font-medium">
                            {monthLong(month)}
                            {month === anchor && (
                              <span className="ml-2 text-xs font-normal text-muted-foreground">
                                current
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <LockPill month={month} locked={isLocked} note={entry?.note} />
                          </TableCell>
                          <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                            {entry?.note ?? "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant={isLocked ? "outline" : "ghost"}
                              size="sm"
                              className="rounded-xl"
                              disabled={busy}
                              onClick={() =>
                                isLocked ? onUnlock(month) : onLock(month)
                              }
                            >
                              <ActionIcon working={working} locked={isLocked} />
                              {isLocked ? "Unlock" : "Lock"}
                            </Button>
                          </TableCell>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          )}
        </Panel>
      </Rise>
    </Stagger>
  );
}
