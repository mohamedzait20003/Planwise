"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckIcon,
  CopyIcon,
  FolderPlusIcon,
  LoaderCircleIcon,
  TargetIcon,
  Undo2Icon,
} from "lucide-react";

import { PageHeader, Panel } from "@/components/common/page-header";
import { MonthField } from "@/components/client/month-field";
import { LockPill, LockedNotice } from "@/components/client/lock-pill";
import { Rise, Stagger } from "@/components/common/motion";
import { EmptyState, ErrorState, LoadingRows } from "@/components/common/states";
import { CountUpValue } from "@/components/common/stat-tile";
import { MoneyInput } from "@/components/client/money-input";
import { FormMessage, errorMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import {
  useCategories,
  useDeletePlan,
  useLocks,
  usePlans,
  useUpsertPlan,
} from "@/lib/hooks";
import { addMonths, monthLong, monthShort } from "@/lib/utils/month";
import { useCurrentMonth } from "@/lib/stores/preferences";
import { formatCurrency } from "@/lib/utils/variance";
import type { Category, Plan } from "@/lib/api/types";
import { cn } from "@/lib/utils/utils";

/**
 * Monthly targets.
 *
 * The screen's job is not to collect a number — it is to help someone decide
 * what the number should be. A bare input per category asks the user to invent
 * a figure from nothing, so each row carries the two things that actually
 * inform the decision: what was budgeted last month, and how large this target
 * is against the rest of the month.
 *
 * Editing is inline and commits on blur rather than behind a modal: setting a
 * quarter of targets is a dozen small numbers, and a dialog per number turns
 * five minutes of typing into five minutes of clicking.
 *
 * A locked month disables every input, but that is only the courtesy layer —
 * the API answers 423 regardless.
 */

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/** One category's target, with the context that makes it decidable. */
function TargetRow({
  category,
  month,
  plan,
  previous,
  share,
  disabled,
  index,
}: Readonly<{
  category: Category;
  month: string;
  plan: Plan | undefined;
  /** Last month's target for this category, if there was one. */
  previous: number | undefined;
  /** This target as a fraction of the month's total, 0–1. */
  share: number;
  disabled: boolean;
  index: number;
}>) {
  const upsert = useUpsertPlan();
  const remove = useDeletePlan();

  const [saved, setSaved] = useState(false);

  const pending = upsert.isPending || remove.isPending;
  const failure = upsert.error ?? remove.error;

  function flash() {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1400);
  }

  function save(amount: number) {
    if (amount === plan?.amount) return;
    upsert.mutate({ categoryId: category.id, month, amount }, { onSuccess: flash });
  }

  function commit(amount: number | null) {
    // Cleared means "no target", which is not the same as a target of $0 — so
    // the row is removed rather than saved as zero. The report then shows N/A
    // for the percentage instead of treating every dollar spent as infinitely
    // over a plan of nothing.
    if (amount === null) {
      if (plan) remove.mutate(plan.id, { onSuccess: flash });
      return;
    }

    save(amount);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04, ease: EASE_OUT }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border/60 bg-card/40 p-4 transition-colors sm:p-5",
        !disabled && "hover:border-primary/30",
        failure && "border-unfavorable/50"
      )}
    >
      {/* The share of the month's budget this category takes, drawn as a wash
          behind the row. It answers "is this a lot?" without a second column. */}
      <motion.div
        aria-hidden
        className="absolute inset-y-0 left-0 -z-10 bg-primary/6"
        initial={{ width: 0 }}
        animate={{ width: `${Math.round(share * 100)}%` }}
        transition={{ duration: 0.55, ease: EASE_OUT }}
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <p className="truncate font-medium">{category.name}</p>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {share > 0 && (
              <span data-numeric className="tabular">
                {(share * 100).toFixed(0)}% of this month
              </span>
            )}

            {previous === undefined ? (
              <span className="opacity-70">No target last month</span>
            ) : (
              <button
                type="button"
                disabled={disabled || pending || previous === plan?.amount}
                onClick={() => save(previous)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 transition-colors",
                  "enabled:hover:bg-muted enabled:hover:text-foreground",
                  "disabled:cursor-default disabled:opacity-70"
                )}
                title={`Use last month's target of ${formatCurrency(previous)}`}
              >
                <Undo2Icon className="size-3" />
                Last month{" "}
                <span data-numeric className="tabular font-medium">
                  {formatCurrency(previous)}
                </span>
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AnimatePresence mode="wait">
            {pending && (
              <motion.span
                key="pending"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <LoaderCircleIcon className="size-4 animate-spin text-muted-foreground" />
              </motion.span>
            )}
            {saved && !pending && (
              <motion.span
                key="saved"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
              >
                <CheckIcon className="size-4 text-favorable" />
              </motion.span>
            )}
          </AnimatePresence>

          <MoneyInput
            value={plan?.amount}
            onCommit={commit}
            disabled={disabled}
            label={`Target for ${category.name}, ${monthLong(month)}`}
            className={cn("w-56", failure && "border-unfavorable")}
          />
        </div>
      </div>

      {failure && (
        <p role="alert" className="mt-3 text-xs text-unfavorable">
          {errorMessage(failure)}
        </p>
      )}
    </motion.div>
  );
}

export default function PlansPage() {
  // Derived, not seeded: state captured before the stored preference arrives
  // would keep the device's month even after the zone loads.
  const thisMonth = useCurrentMonth();
  const [chosenMonth, setMonth] = useState<string | null>(null);
  const month = chosenMonth ?? thisMonth;
  const previousMonth = addMonths(month, -1);

  const categories = useCategories();
  const plans = usePlans(month);
  const lastMonth = usePlans(previousMonth);
  const locks = useLocks();
  const upsert = useUpsertPlan();

  const locked = (locks.data ?? []).some((lock) => lock.month === month);
  const active = (categories.data ?? []).filter((c) => c.archivedAt === null);

  const byCategory = new Map((plans.data ?? []).map((p) => [p.categoryId, p]));
  const previousByCategory = new Map(
    (lastMonth.data ?? []).map((p) => [p.categoryId, p.amount])
  );

  const total = [...byCategory.values()].reduce((sum, p) => sum + p.amount, 0);

  // Only categories that had a target last month and have none now — copying
  // must never overwrite a figure someone has already decided on.
  const copyable = active.filter(
    (category) =>
      previousByCategory.has(category.id) && !byCategory.has(category.id)
  );

  const failure = categories.error ?? plans.error ?? locks.error;
  const loading = categories.isPending || plans.isPending;

  function copyLastMonth() {
    for (const category of copyable) {
      upsert.mutate({
        categoryId: category.id,
        month,
        amount: previousByCategory.get(category.id)!,
      });
    }
  }

  return (
    <Stagger className="space-y-8">
      <Rise>
        <PageHeader
          title="Plans"
          description="What you intend to spend per category. Set a target for each, and the report measures against it."
          actions={<LockPill month={month} locked={locked} />}
        />
      </Rise>

      <Rise>
        <Panel bodyClassName="p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <MonthField
              value={month}
              onChange={setMonth}
              className="w-full sm:w-64"
            />

            <div className="space-y-1">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Planned · {monthLong(month)}
              </p>
              <p className="text-3xl font-semibold tracking-tight">
                <CountUpValue to={total} format={formatCurrency} />
              </p>
              <p className="text-xs text-muted-foreground">
                {byCategory.size} of {active.length}{" "}
                {active.length === 1 ? "category" : "categories"} have a target
              </p>
            </div>

            {copyable.length > 0 && !locked && (
              <Button
                variant="outline"
                className="rounded-xl"
                disabled={upsert.isPending}
                onClick={copyLastMonth}
              >
                {upsert.isPending ? (
                  <LoaderCircleIcon className="animate-spin" />
                ) : (
                  <CopyIcon />
                )}
                Copy {copyable.length} from {monthShort(previousMonth)}
              </Button>
            )}
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

      {loading && !failure && (
        <Rise>
          <LoadingRows rows={5} />
        </Rise>
      )}

      {!loading && active.length === 0 && (
        <Rise>
          <Panel>
            <EmptyState
              icon={<FolderPlusIcon className="size-6" />}
              title="No categories yet"
              description="Targets attach to a category, so start by creating one — Marketing, Payroll, Tools, whatever you actually track."
              action={
                <Button
                  className="rounded-xl"
                  nativeButton={false}
                  render={<Link href="/client/categories" />}
                >
                  Create a category
                </Button>
              }
            />
          </Panel>
        </Rise>
      )}

      {!loading && active.length > 0 && (
        <Rise className="space-y-3">
          {active.map((category, index) => {
            const plan = byCategory.get(category.id);

            return (
              <TargetRow
                key={category.id}
                category={category}
                month={month}
                plan={plan}
                previous={previousByCategory.get(category.id)}
                share={total > 0 && plan ? plan.amount / total : 0}
                disabled={locked}
                index={index}
              />
            );
          })}
        </Rise>
      )}

      <Rise>
        <FormMessage>
          {upsert.error ? errorMessage(upsert.error) : null}
        </FormMessage>
      </Rise>

      <Rise>
        <div className="flex items-start gap-3 rounded-xl bg-muted/40 px-4 py-3">
          <TargetIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">
              A blank target is not a target of $0.
            </span>{" "}
            Blank means nothing was planned, and the report shows variance % as
            N/A. A target of $0 is a real plan — anything spent against it counts
            as fully over. Clear a field to remove its target.
          </p>
        </div>
      </Rise>
    </Stagger>
  );
}
