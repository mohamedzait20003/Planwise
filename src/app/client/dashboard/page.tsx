"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  LoaderCircleIcon,
  ReceiptTextIcon,
  RefreshCwIcon,
  ScrollTextIcon,
  TagsIcon,
  TargetIcon,
  WalletIcon,
} from "lucide-react";

import { PageHeader, Panel } from "@/components/client/page-header";
import { StatTile, CountUpValue } from "@/components/client/stat-tile";
import { VarianceChart } from "@/components/client/variance-chart";
import { VarianceHero } from "@/components/client/variance-hero";
import { TopMovers } from "@/components/client/top-movers";
import { LockPill } from "@/components/client/lock-pill";
import { Rise, Stagger } from "@/components/client/motion";
import {
  EmptyState,
  ErrorState,
  GeneratingState,
  LoadingRows,
} from "@/components/client/states";
import { Money, VarianceAmount } from "@/components/client/variance";
import { Button } from "@/components/ui/button";
import { useCategories, useGenerateReport, useLocks, useReport } from "@/lib/hooks";
import { lastMonths, monthLong } from "@/lib/utils/month";
import { useCurrentMonth } from "@/lib/stores/preferences";
import { formatCurrency } from "@/lib/utils/variance";

/**
 * The opening screen.
 *
 * Answers one question — "where am I against plan right now?" — and then gets
 * out of the way. The window is the trailing six months rather than the current
 * one alone, because a single month's variance says nothing about whether it is
 * a blip or a trend, and the trend is the reason anyone opens this.
 *
 * One figure is the headline and the rest support it. A row of equal tiles
 * makes the reader rank them, which is the work the screen should have done.
 */

const WINDOW = 6;

const jumpTo = [
  {
    href: "/client/plans",
    icon: TargetIcon,
    title: "Set targets",
    description: "One monthly amount per category.",
  },
  {
    href: "/client/actuals",
    icon: ReceiptTextIcon,
    title: "Log spend",
    description: "Add an entry, or import a CSV.",
  },
  {
    href: "/client/report",
    icon: ScrollTextIcon,
    title: "Run the report",
    description: "Any range, with variance and export.",
  },
  {
    href: "/client/categories",
    icon: TagsIcon,
    title: "Categories",
    description: "Add, rename, or archive.",
  },
];

function QuickLink({
  href,
  icon: Icon,
  title,
  description,
}: Readonly<{
  href: string;
  icon: typeof TargetIcon;
  title: string;
  description: string;
}>) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-primary ring-1 ring-primary/15 transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon aria-hidden className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {description}
        </span>
      </span>
      <ArrowRightIcon
        aria-hidden
        className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-70"
      />
    </Link>
  );
}

export default function DashboardPage() {
  const thisMonth = useCurrentMonth();
  const range = lastMonths(thisMonth, WINDOW);

  const report = useReport(range);
  const generate = useGenerateReport();
  const locks = useLocks();
  const categories = useCategories();

  // Reading never generates, so this window may simply have no report yet.
  const data = report.report;
  const generating = generate.isPending || report.generating;

  const locked = (locks.data ?? []).some((lock) => lock.month === thisMonth);
  const activeCategories = (categories.data ?? []).filter(
    (category) => category.archivedAt === null
  ).length;

  // The current month out of the same payload, so the headline and the chart
  // can never disagree about what this month's numbers are.
  const current = data?.byMonth.find((entry) => entry.month === thisMonth);
  const currentPct =
    current && current.plan !== 0 ? (current.variance / current.plan) * 100 : null;

  const currentRows = useMemo(
    () => (data?.rows ?? []).filter((row) => row.month === thisMonth),
    [data, thisMonth]
  );

  const lockedMonths = useMemo(
    () =>
      new Set(
        (data?.rows ?? []).filter((row) => row.locked).map((row) => row.month)
      ),
    [data]
  );

  const empty = data?.rows.length === 0;

  return (
    <Stagger className="space-y-6">
      <Rise>
        <PageHeader
          title="Dashboard"
          description={`${monthLong(thisMonth)} against plan, and how the last ${WINDOW} months have run.`}
          actions={
            <>
              <LockPill month={thisMonth} locked={locked} />
              {!report.none && !report.isPending && (
                <Button
                  variant="outline"
                  className="rounded-xl"
                  disabled={generating}
                  onClick={() => generate.mutate(range)}
                >
                  {generating ? (
                    <LoaderCircleIcon aria-hidden className="animate-spin" />
                  ) : (
                    <RefreshCwIcon aria-hidden />
                  )}
                  Refresh
                </Button>
              )}
            </>
          }
        />
      </Rise>

      {/* No report for this window yet. The dashboard reads the same stored run
          as the report page, so generating here fills both. */}
      {report.none && !generating && (
        <Rise>
          <Panel>
            <EmptyState
              icon={<RefreshCwIcon aria-hidden className="size-6" />}
              title="No report yet"
              description={`Reports are generated on request. Build one for the last ${WINDOW} months to see how you are tracking.`}
              action={
                <Button
                  className="rounded-xl"
                  onClick={() => generate.mutate(range)}
                >
                  Generate report
                </Button>
              }
            />
          </Panel>
        </Rise>
      )}

      {report.stale && (
        <Rise>
          <p className="flex items-center gap-2 rounded-xl bg-locked/8 px-4 py-3 text-sm text-muted-foreground ring-1 ring-locked/20">
            <RefreshCwIcon aria-hidden className="size-4 shrink-0 text-locked" />
            These figures are out of date — refresh to recompute them.
          </p>
        </Rise>
      )}

      {report.isError && (
        <Rise>
          <ErrorState error={report.error} onRetry={() => report.refetch()} />
        </Rise>
      )}

      {report.isPending && !report.isError && (
        <Rise>
          <LoadingRows rows={4} />
        </Rise>
      )}

      {generating && (
        <Rise>
          <GeneratingState />
        </Rise>
      )}

      {empty && (
        <Rise>
          <Panel>
            <EmptyState
              icon={<TargetIcon aria-hidden className="size-6" />}
              title="Nothing to compare yet"
              description="Plan vs actual needs both halves. Create a category, set a target for this month, then log what you spend against it."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Button
                    className="rounded-xl"
                    nativeButton={false}
                    render={<Link href="/client/categories" />}
                  >
                    Create a category
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    nativeButton={false}
                    render={<Link href="/client/plans" />}
                  >
                    Set targets
                  </Button>
                </div>
              }
            />
          </Panel>
        </Rise>
      )}

      {data && !empty && (
        <>
          <Rise>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1.6fr)]">
              <VarianceHero
                label={monthLong(thisMonth)}
                plan={current?.plan ?? 0}
                actual={current?.actual ?? 0}
                variance={current?.variance ?? 0}
                variancePct={currentPct}
              />

              <div className="grid gap-4 sm:grid-cols-3">
                <StatTile
                  label="Plan this month"
                  icon={<TargetIcon aria-hidden className="size-4" />}
                  value={
                    <CountUpValue to={current?.plan ?? 0} format={formatCurrency} />
                  }
                  hint={`${activeCategories} active ${activeCategories === 1 ? "category" : "categories"}`}
                />
                <StatTile
                  label="Actual this month"
                  accent="info"
                  icon={<ReceiptTextIcon aria-hidden className="size-4" />}
                  value={
                    <CountUpValue
                      to={current?.actual ?? 0}
                      format={formatCurrency}
                    />
                  }
                  hint="Missing entries counted as $0"
                />
                <StatTile
                  label={`Net · last ${WINDOW} months`}
                  accent={data.totals.variance > 0 ? "unfavorable" : "favorable"}
                  icon={<WalletIcon aria-hidden className="size-4" />}
                  value={<VarianceAmount value={data.totals.variance} />}
                  hint={
                    <span className="flex flex-wrap items-center gap-1.5">
                      <Money value={data.totals.actual} muted />
                      <span>of</span>
                      <Money value={data.totals.plan} muted />
                      <span>planned</span>
                    </span>
                  }
                />
              </div>
            </div>
          </Rise>

          {/* The one thing a dashboard owes you that a chart cannot: which
              categories to go and look at. */}
          <Rise>
            <Panel
              title="Furthest from plan"
              description={`By absolute variance in ${monthLong(thisMonth)}.`}
              actions={
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-xl"
                  nativeButton={false}
                  render={<Link href="/client/report" />}
                >
                  Full report
                  <ArrowRightIcon aria-hidden />
                </Button>
              }
            >
              <TopMovers rows={currentRows} />
            </Panel>
          </Rise>

          <Rise>
            <Panel
              title={`Last ${WINDOW} months`}
              description="Trend shows both series with the gap shaded by its sign; Variance shows the gap alone."
            >
              <VarianceChart months={data.byMonth} lockedMonths={lockedMonths} />
            </Panel>
          </Rise>
        </>
      )}

      <Rise>
        <Panel title="Jump to">
          <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-4">
            {jumpTo.map((link) => (
              <QuickLink key={link.href} {...link} />
            ))}
          </div>
        </Panel>
      </Rise>
    </Stagger>
  );
}
