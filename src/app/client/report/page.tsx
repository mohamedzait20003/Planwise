"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  DownloadIcon,
  LoaderCircleIcon,
  RefreshCwIcon,
  ScrollTextIcon,
  SparklesIcon,
  TriangleAlertIcon,
  WalletIcon,
} from "lucide-react";

import { PageHeader, Panel } from "@/components/client/page-header";
import { StatTile, CountUpValue } from "@/components/client/stat-tile";
import { VarianceChart } from "@/components/client/variance-chart";
import { VarianceHero } from "@/components/client/variance-hero";
import { ReportControls } from "@/components/client/report-controls";
import { LockPill } from "@/components/client/lock-pill";
import { Rise, Stagger, rowMotion } from "@/components/client/motion";
import {
  EmptyState,
  ErrorState,
  GeneratingState,
  LoadingRows,
} from "@/components/client/states";
import { ApiError } from "@/lib/api";
import {
  Money,
  NotLogged,
  VarianceAmount,
  VarianceMeter,
  VariancePct,
} from "@/components/client/variance";
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
  useCategories,
  useGenerateReport,
  useReport,
  downloadReportCsv,
} from "@/lib/hooks";
import { currentMonth, monthShort, quarterOf } from "@/lib/utils/month";
import type { MonthRange } from "@/lib/utils/month";
import { formatCurrency, formatSignedCurrency } from "@/lib/utils/variance";
import type { ReportRow } from "@/lib/api/types";
import { cn } from "@/lib/utils/utils";

/**
 * Plan vs actual, over a range.
 *
 * Two documented choices show up here and are worth stating where they are
 * visible rather than only in the README:
 *
 *   Missing actual — summed as 0, so the row still counts toward totals and the
 *   chart stays additive. The cell shows "—" so the reader can tell "nothing
 *   logged" from "logged as zero", but the arithmetic treats them alike.
 *
 *   Plan of 0 — variance % has no denominator, so it is null and reads "N/A".
 *   Never Infinity, never NaN, and never quietly 0%.
 */

const computedAtLabel = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

/** Says how old the figures are, and offers the one action that fixes it. */
function StaleNotice({
  computedAt,
  onRegenerate,
  busy,
}: Readonly<{
  computedAt: string | null;
  onRegenerate: () => void;
  busy: boolean;
}>) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      role="status"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-locked/8 px-4 py-3 text-sm ring-1 ring-locked/20"
    >
      <p className="flex items-start gap-2.5 leading-relaxed text-muted-foreground">
        <TriangleAlertIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-locked" />
        <span>
          <span className="font-medium text-foreground">
            These figures are out of date.
          </span>{" "}
          Plans, actuals or locks have changed since this was generated
          {computedAt
            ? ` on ${computedAtLabel.format(new Date(computedAt))}`
            : ""}
          .
        </span>
      </p>

      <Button
        variant="outline"
        size="sm"
        className="rounded-xl"
        disabled={busy}
        onClick={onRegenerate}
      >
        {busy ? (
          <LoaderCircleIcon aria-hidden className="animate-spin" />
        ) : (
          <RefreshCwIcon aria-hidden />
        )}
        Regenerate
      </Button>
    </motion.div>
  );
}

/** Groups rows by month, preserving the order the server sent them in. */
function byMonth(rows: ReportRow[]): Array<[month: string, rows: ReportRow[]]> {
  const groups = new Map<string, ReportRow[]>();

  for (const row of rows) {
    const existing = groups.get(row.month);
    if (existing) existing.push(row);
    else groups.set(row.month, [row]);
  }

  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export default function ReportPage() {
  const anchor = currentMonth();
  const [range, setRange] = useState<MonthRange>(() => quarterOf(anchor));
  const [categoryId, setCategoryId] = useState("");
  const [exporting, setExporting] = useState(false);

  const categories = useCategories();

  // "" means every category. It is also how the server keys the stored run, so
  // filtered and unfiltered reports are separate runs rather than one
  // overwriting the other.
  const params = { ...range, ...(categoryId ? { categoryId } : {}) };

  const report = useReport(params);
  const generate = useGenerateReport();

  // Reading never generates. `none` means nothing has been produced for this
  // range yet; a report may still be stale, and is shown anyway with its age —
  // hiding the last known answer because a number moved leaves the user with
  // nothing, and regenerating is one click away.
  const data = report.report;
  const working = generate.isPending || report.generating;

  /**
   * Months with at least one locked row. The lock lives on the month, so one
   * locked row means the month is closed — the chart marks these on its axis.
   */
  const lockedMonths = useMemo(
    () =>
      new Set(
        (data?.rows ?? []).filter((row) => row.locked).map((row) => row.month)
      ),
    [data]
  );

  /** Largest absolute row variance, so the inline meters share one scale. */
  const meterCeiling = useMemo(
    () =>
      (data?.rows ?? []).reduce(
        (peak, row) => Math.max(peak, Math.abs(row.variance)),
        0
      ),
    [data]
  );

  function onGenerate() {
    generate.mutate(params);
  }

  async function onExport() {
    setExporting(true);
    try {
      await downloadReportCsv(params);
    } finally {
      // Always clears: a failed download must not leave the button spinning
      // forever with no way back.
      setExporting(false);
    }
  }

  return (
    <Stagger className="space-y-6">
      <Rise>
        <PageHeader
          title="Report"
          description="Plan against actual for every category in the range, with the variance between them."
          actions={
            <>
              <Button
                variant="outline"
                className="rounded-xl"
                disabled={exporting || !data || data.rows.length === 0}
                onClick={onExport}
              >
                {exporting ? (
                  <LoaderCircleIcon aria-hidden className="animate-spin" />
                ) : (
                  <DownloadIcon aria-hidden />
                )}
                Export CSV
              </Button>

              <Button
                className="rounded-xl shadow-lg shadow-primary/20"
                disabled={working}
                onClick={onGenerate}
              >
                {working ? (
                  <LoaderCircleIcon aria-hidden className="animate-spin" />
                ) : (
                  <SparklesIcon aria-hidden />
                )}
                {data ? "Regenerate" : "Generate report"}
              </Button>
            </>
          }
        />
      </Rise>

      <Rise>
        <ReportControls
          range={range}
          onRangeChange={setRange}
          categoryId={categoryId}
          onCategoryChange={setCategoryId}
          categories={categories.data ?? []}
          anchor={anchor}
        />
      </Rise>

      {report.isError && (
        <Rise>
          <ErrorState error={report.error} onRetry={() => report.refetch()} />
        </Rise>
      )}

      {report.isPending && !report.isError && (
        <Rise>
          <LoadingRows rows={6} />
        </Rise>
      )}

      {generate.isError && (
        <Rise>
          <ErrorState error={generate.error} onRetry={onGenerate} />
        </Rise>
      )}

      {/* Never generated for this range. Nothing to show, so name the button. */}
      {report.none && !generate.isPending && (
        <Rise>
          <Panel>
            <EmptyState
              icon={<ScrollTextIcon aria-hidden className="size-6" />}
              title="No report for this range yet"
              description="Reports are generated on request rather than on every visit. Generate one to see plan against actual for these months."
              action={
                <Button className="rounded-xl" onClick={onGenerate}>
                  <SparklesIcon aria-hidden />
                  Generate report
                </Button>
              }
            />
          </Panel>
        </Rise>
      )}

      {/* Only while there is nothing to look at — a regenerate keeps the old
          figures on screen, with the stale notice above them. */}
      {working && !data && (
        <Rise>
          <GeneratingState />
        </Rise>
      )}

      {report.failure && !generate.isPending && (
        <Rise>
          <ErrorState error={new ApiError(500, report.failure)} onRetry={onGenerate} />
        </Rise>
      )}

      {report.stale && (
        <Rise>
          <StaleNotice
            computedAt={report.computedAt}
            onRegenerate={onGenerate}
            busy={working}
          />
        </Rise>
      )}

      {data && (
        <>
          {/* One headline figure, then the supporting ones — rather than four
              tiles of equal weight that leave the reader to rank them. */}
          <Rise>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1.6fr)]">
              <VarianceHero
                plan={data.totals.plan}
                actual={data.totals.actual}
                variance={data.totals.variance}
                variancePct={data.totals.variancePct}
              />

              <div className="grid gap-4 sm:grid-cols-3">
                <StatTile
                  label="Total plan"
                  icon={<WalletIcon aria-hidden className="size-4" />}
                  value={
                    <CountUpValue to={data.totals.plan} format={formatCurrency} />
                  }
                  hint={`${data.byMonth.length} month${data.byMonth.length === 1 ? "" : "s"} in range`}
                />
                <StatTile
                  label="Total actual"
                  accent="info"
                  icon={<ScrollTextIcon aria-hidden className="size-4" />}
                  value={
                    <CountUpValue to={data.totals.actual} format={formatCurrency} />
                  }
                  hint="Missing entries counted as $0"
                />
                <StatTile
                  label="Generated"
                  accent={report.stale ? "locked" : "favorable"}
                  icon={<RefreshCwIcon aria-hidden className="size-4" />}
                  value={
                    <span className="text-base font-medium">
                      {report.computedAt
                        ? computedAtLabel.format(new Date(report.computedAt))
                        : "—"}
                    </span>
                  }
                  hint={
                    report.stale
                      ? "Out of date — regenerate to refresh"
                      : `${new Set(data.rows.map((row) => row.categoryId)).size} categories in range`
                  }
                />
              </div>
            </div>
          </Rise>

          <Rise>
            <Panel
              title="Plan against actual"
              description="Trend shows both series with the gap shaded by its sign; Variance shows the gap alone."
            >
              <VarianceChart months={data.byMonth} lockedMonths={lockedMonths} />
            </Panel>
          </Rise>

          <Rise>
            <Panel
              title="Detail"
              description="Grouped by month, then category."
              bodyClassName="p-0"
            >
              {data.rows.length === 0 ? (
                <EmptyState
                  icon={<ScrollTextIcon aria-hidden className="size-6" />}
                  title="Nothing in this range"
                  description="No plans or actuals fall between these months. Widen the range, or set a target to get started."
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Plan</TableHead>
                        <TableHead className="text-right">Actual</TableHead>
                        <TableHead className="text-right">Variance</TableHead>
                        <TableHead className="w-20 text-center">
                          <span className="sr-only">Variance scale</span>
                        </TableHead>
                        <TableHead className="text-right">Variance %</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      <AnimatePresence initial={false}>
                        {byMonth(data.rows).flatMap(([month, rows]) => {
                          // Subtotals are computed here rather than read off
                          // `byMonth`: that array covers the whole range, and
                          // these rows may be filtered to one category.
                          const subtotal = rows.reduce(
                            (sums, row) => ({
                              plan: sums.plan + row.plan,
                              actual: sums.actual + row.actual,
                              variance: sums.variance + row.variance,
                            }),
                            { plan: 0, actual: 0, variance: 0 }
                          );

                          return [
                            <motion.tr
                              key={`head-${month}`}
                              {...rowMotion}
                              className="border-b bg-muted/50"
                            >
                              <TableCell colSpan={3} className="py-2">
                                <span className="flex items-center gap-2 text-xs font-medium tracking-wide uppercase">
                                  {monthShort(month)}
                                  <LockPill
                                    month={month}
                                    locked={rows.some((row) => row.locked)}
                                  />
                                </span>
                              </TableCell>
                              <TableCell
                                colSpan={3}
                                className="py-2 text-right text-xs"
                              >
                                <span className="text-muted-foreground">
                                  month net{" "}
                                </span>
                                <span
                                  data-numeric
                                  className={cn(
                                    "tabular font-medium",
                                    subtotal.variance === 0 &&
                                      "text-muted-foreground",
                                    subtotal.variance > 0 && "text-unfavorable",
                                    subtotal.variance < 0 && "text-favorable"
                                  )}
                                >
                                  {formatSignedCurrency(subtotal.variance)}
                                </span>
                              </TableCell>
                            </motion.tr>,

                            ...rows.map((row) => (
                              <motion.tr
                                key={`${month}-${row.categoryId}`}
                                {...rowMotion}
                                className="border-b transition-colors hover:bg-muted/40"
                              >
                                <TableCell className="font-medium">
                                  {row.categoryName}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Money value={row.plan} />
                                </TableCell>
                                <TableCell className="text-right">
                                  {row.hasActual ? (
                                    <Money value={row.actual} />
                                  ) : (
                                    <NotLogged />
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <VarianceAmount value={row.variance} />
                                </TableCell>
                                <TableCell>
                                  <VarianceMeter
                                    value={row.variance}
                                    ceiling={meterCeiling}
                                    className="mx-auto"
                                  />
                                </TableCell>
                                <TableCell className="text-right">
                                  <VariancePct
                                    value={row.variancePct}
                                    variance={row.variance}
                                  />
                                </TableCell>
                              </motion.tr>
                            )),
                          ];
                        })}
                      </AnimatePresence>
                    </TableBody>
                  </Table>
                </div>
              )}
            </Panel>
          </Rise>
        </>
      )}
    </Stagger>
  );
}
