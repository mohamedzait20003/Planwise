"use client";

import Link from "next/link";
import {
  ArrowRightIcon,
  ReceiptTextIcon,
  ScrollTextIcon,
  TagsIcon,
  TargetIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  WalletIcon,
} from "lucide-react";

import { PageHeader, Panel } from "@/components/client/page-header";
import { StatTile, CountUpValue } from "@/components/client/stat-tile";
import { VarianceChart } from "@/components/client/variance-chart";
import { LockPill } from "@/components/client/lock-pill";
import { Rise, Stagger } from "@/components/client/motion";
import {
  EmptyState,
  ErrorState,
  GeneratingState,
  LoadingRows,
} from "@/components/client/states";
import { Money, VarianceAmount, VarianceChip } from "@/components/client/variance";
import { Button } from "@/components/ui/button";
import { useCategories, useLocks, useReport } from "@/lib/hooks";
import { currentMonth, lastMonths, monthLong } from "@/lib/utils/month";
import { formatCurrency } from "@/lib/utils/variance";

/**
 * The opening screen.
 *
 * Answers one question — "where am I against plan right now?" — and then gets
 * out of the way. The window is the trailing six months rather than the current
 * one alone, because a single month's variance says nothing about whether it is
 * a blip or a trend, and the trend is the reason anyone opens this.
 */

const WINDOW = 6;

function QuickLink({
  href,
  icon,
  title,
  description,
}: Readonly<{
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}>) {
  return (
    <Link
      href={href}
      className="group surface-glass flex items-start gap-4 rounded-2xl border border-border/60 p-4 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-primary ring-1 ring-primary/15 transition-transform group-hover:scale-105">
        {icon}
      </span>
      <div className="min-w-0 space-y-0.5">
        <p className="flex items-center gap-1.5 font-medium">
          {title}
          <ArrowRightIcon className="size-3.5 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-60" />
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const thisMonth = currentMonth();
  const range = lastMonths(thisMonth, WINDOW);

  const report = useReport(range);
  const locks = useLocks();
  const categories = useCategories();

  // Generation is queued, so the numbers may not exist yet on a first load.
  const outcome = report.data;
  const data = outcome?.ready ? outcome.report : undefined;
  const generating = outcome !== undefined && !outcome.ready;

  const locked = (locks.data ?? []).some((lock) => lock.month === thisMonth);
  const activeCategories = (categories.data ?? []).filter(
    (category) => category.archivedAt === null
  ).length;

  // The current month out of the same payload, so the headline and the chart
  // can never disagree about what this month's numbers are.
  const current = data?.byMonth.find((entry) => entry.month === thisMonth);
  const currentPct =
    current && current.plan !== 0 ? (current.variance / current.plan) * 100 : null;

  const empty = data?.rows.length === 0;

  return (
    <Stagger className="space-y-8">
      <Rise>
        <PageHeader
          title="Dashboard"
          description={`${monthLong(thisMonth)} against plan, and how the last ${WINDOW} months have run.`}
          actions={<LockPill month={thisMonth} locked={locked} />}
        />
      </Rise>

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
              icon={<TargetIcon className="size-6" />}
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatTile
                label={`Plan · ${monthLong(thisMonth)}`}
                icon={<TargetIcon className="size-4" />}
                value={
                  <CountUpValue to={current?.plan ?? 0} format={formatCurrency} />
                }
                hint={`${activeCategories} active ${activeCategories === 1 ? "category" : "categories"}`}
              />
              <StatTile
                label="Actual this month"
                accent="info"
                icon={<ReceiptTextIcon className="size-4" />}
                value={
                  <CountUpValue to={current?.actual ?? 0} format={formatCurrency} />
                }
                hint="Missing entries counted as $0"
              />
              <StatTile
                label="Variance this month"
                accent={(current?.variance ?? 0) > 0 ? "unfavorable" : "favorable"}
                icon={
                  (current?.variance ?? 0) > 0 ? (
                    <TrendingUpIcon className="size-4" />
                  ) : (
                    <TrendingDownIcon className="size-4" />
                  )
                }
                value={<VarianceAmount value={current?.variance ?? 0} />}
                hint={
                  <VarianceChip
                    variance={current?.variance ?? 0}
                    variancePct={currentPct}
                  />
                }
              />
              <StatTile
                label={`Net · last ${WINDOW} months`}
                accent={data.totals.variance > 0 ? "unfavorable" : "favorable"}
                icon={<WalletIcon className="size-4" />}
                value={<VarianceAmount value={data.totals.variance} />}
                hint={
                  <span className="flex items-center gap-1.5">
                    <Money value={data.totals.actual} muted /> of{" "}
                    <Money value={data.totals.plan} muted /> planned
                  </span>
                }
              />
            </div>
          </Rise>

          <Rise>
            <Panel
              title={`Net variance · last ${WINDOW} months`}
              description="Above the line is over plan; below it is under."
              actions={
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-xl"
                  nativeButton={false}
                  render={<Link href="/client/report" />}
                >
                  Full report
                  <ArrowRightIcon />
                </Button>
              }
            >
              <VarianceChart months={data.byMonth} />
            </Panel>
          </Rise>
        </>
      )}

      <Rise>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <QuickLink
            href="/client/plans"
            icon={<TargetIcon className="size-5" />}
            title="Set targets"
            description="One monthly amount per category."
          />
          <QuickLink
            href="/client/actuals"
            icon={<ReceiptTextIcon className="size-5" />}
            title="Log spend"
            description="Add an entry, or import a CSV."
          />
          <QuickLink
            href="/client/report"
            icon={<ScrollTextIcon className="size-5" />}
            title="Run the report"
            description="Any range, with variance and export."
          />
          <QuickLink
            href="/client/categories"
            icon={<TagsIcon className="size-5" />}
            title="Categories"
            description="Add, rename, or archive."
          />
        </div>
      </Rise>
    </Stagger>
  );
}
