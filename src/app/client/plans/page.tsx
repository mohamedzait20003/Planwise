"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { CheckIcon, FolderPlusIcon, LoaderCircleIcon, TargetIcon } from "lucide-react";

import { PageHeader, Panel } from "@/components/client/page-header";
import { MonthField } from "@/components/client/month-field";
import { LockPill, LockedNotice } from "@/components/client/lock-pill";
import { Rise, Stagger, rowMotion } from "@/components/client/motion";
import { EmptyState, ErrorState, LoadingRows } from "@/components/client/states";
import { StatTile, CountUpValue } from "@/components/client/stat-tile";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useCategories, useLocks, usePlans, useUpsertPlan } from "@/lib/hooks";
import { currentMonth, monthLong } from "@/lib/utils/month";
import { formatCurrency } from "@/lib/utils/variance";
import { cn } from "@/lib/utils/utils";

/**
 * Monthly targets, one row per category.
 *
 * Editing is inline and saves on blur rather than behind a modal: setting a
 * quarter of targets is a dozen small numbers, and a dialog per number would
 * turn five minutes of typing into five minutes of clicking.
 *
 * A locked month disables the inputs, but that is only the courtesy layer —
 * the API answers 423 regardless, and `PeriodLockedError` surfaces below if the
 * two ever disagree.
 */

/** One category's target for the month. Commits on blur, reverts on Escape. */
function PlanCell({
  categoryId,
  month,
  amount,
  disabled,
}: Readonly<{
  categoryId: string;
  month: string;
  amount: number | undefined;
  disabled: boolean;
}>) {
  const upsert = useUpsertPlan();
  const [draft, setDraft] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const committed = amount === undefined ? "" : String(amount);
  const value = draft ?? committed;

  function commit() {
    setDraft(null);
    if (draft === null) return;

    const parsed = Number(draft);
    // An empty box means "no target", which is not the same as a target of 0
    // and must not silently become one.
    if (draft.trim() === "" || Number.isNaN(parsed) || parsed < 0) return;
    if (parsed === amount) return;

    upsert.mutate(
      { categoryId, month, amount: parsed },
      {
        onSuccess: () => {
          setSaved(true);
          window.setTimeout(() => setSaved(false), 1400);
        },
      }
    );
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <AnimatePresence>
        {upsert.isPending && (
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <LoaderCircleIcon className="size-3.5 animate-spin text-muted-foreground" />
          </motion.span>
        )}
        {saved && !upsert.isPending && (
          <motion.span
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <CheckIcon className="size-3.5 text-favorable" />
          </motion.span>
        )}
      </AnimatePresence>

      <div className="relative">
        <span className="absolute top-1/2 left-2.5 -translate-y-1/2 text-xs text-muted-foreground">
          $
        </span>
        <input
          type="number"
          min={0}
          step="0.01"
          inputMode="decimal"
          disabled={disabled}
          value={value}
          placeholder="—"
          aria-label={`Target amount for ${month}`}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
            if (event.key === "Escape") {
              setDraft(null);
              event.currentTarget.blur();
            }
          }}
          className={cn(
            "h-9 w-32 rounded-xl border border-input bg-background pr-3 pl-6 text-right text-sm tabular transition-colors",
            "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
            "disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground",
            "dark:bg-input/30",
            upsert.isError && "border-unfavorable"
          )}
        />
      </div>
    </div>
  );
}

export default function PlansPage() {
  const [month, setMonth] = useState(currentMonth);

  const categories = useCategories();
  const plans = usePlans(month);
  const locks = useLocks();

  const locked = (locks.data ?? []).some((lock) => lock.month === month);
  const active = (categories.data ?? []).filter((c) => c.archivedAt === null);

  const amounts = new Map((plans.data ?? []).map((p) => [p.categoryId, p.amount]));
  const total = [...amounts.values()].reduce((sum, amount) => sum + amount, 0);

  const failure = categories.error ?? plans.error ?? locks.error;
  const loading = categories.isPending || plans.isPending;

  return (
    <Stagger className="space-y-8">
      <Rise>
        <PageHeader
          title="Plans"
          description={`Monthly spending target for each category. ${monthLong(month)}.`}
          actions={<LockPill month={month} locked={locked} />}
        />
      </Rise>

      <Rise>
        <Panel>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <MonthField value={month} onChange={setMonth} className="w-full max-w-xs" />
            <StatTile
              label="Planned this month"
              icon={<TargetIcon className="size-4" />}
              value={<CountUpValue to={total} format={formatCurrency} />}
              hint={`${amounts.size} of ${active.length} categories have a target`}
              className="min-w-56 flex-1"
            />
          </div>
        </Panel>
      </Rise>

      {locked && (
        <Rise>
          <LockedNotice month={month} />
        </Rise>
      )}

      {failure && (
        <Rise>
          <ErrorState
            error={failure}
            onRetry={() => {
              categories.refetch();
              plans.refetch();
              locks.refetch();
            }}
          />
        </Rise>
      )}

      <Rise>
        <Panel title="Targets" bodyClassName="p-0">
          {loading && !failure && <LoadingRows rows={5} className="p-5" />}

          {!loading && active.length === 0 && (
            <EmptyState
              icon={<FolderPlusIcon className="size-6" />}
              title="No categories yet"
              description="Targets attach to a category, so start by creating one — Marketing, Payroll, Tools, whatever you actually track."
              action={
                <Button className="rounded-xl" nativeButton={false} render={<Link href="/client/categories" />}>
                  Create a category
                </Button>
              }
            />
          )}

          {!loading && active.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Target</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence initial={false}>
                    {active.map((category) => (
                      <motion.tr
                        key={category.id}
                        {...rowMotion}
                        className="border-b transition-colors hover:bg-muted/40"
                      >
                        <TableCell className="font-medium">{category.name}</TableCell>
                        <TableCell className="text-right">
                          <PlanCell
                            categoryId={category.id}
                            month={month}
                            amount={amounts.get(category.id)}
                            disabled={locked}
                          />
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          )}
        </Panel>
      </Rise>

      <Rise>
        <p className="text-xs leading-relaxed text-muted-foreground">
          A blank target is not the same as a target of $0. Blank means nothing
          was planned and the report shows variance % as{" "}
          <span className="font-medium">N/A</span>; a target of $0 is a real
          plan, and anything spent against it is fully over.
        </p>
      </Rise>
    </Stagger>
  );
}
