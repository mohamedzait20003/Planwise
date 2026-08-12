"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  DownloadIcon,
  LoaderCircleIcon,
  ScrollTextIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  WalletIcon,
} from "lucide-react";

import { PageHeader, Panel } from "@/components/client/page-header";
import { RangeField } from "@/components/client/month-field";
import { StatTile, CountUpValue } from "@/components/client/stat-tile";
import { VarianceChart } from "@/components/client/variance-chart";
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
  VarianceChip,
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
import { Label } from "@/components/ui/label";
import { useCategories, useReport, downloadReportCsv } from "@/lib/hooks";
import { currentMonth, monthShort, quarterOf } from "@/lib/utils/month";
import type { MonthRange } from "@/lib/utils/month";
import { formatCurrency } from "@/lib/utils/variance";
import type { ReportRow } from "@/lib/api/types";

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

  // The report may not exist yet — generation is queued, so the first answer is
  // usually "pending" and the numbers arrive on a later poll.
  const outcome = report.data;
  const data = outcome?.ready ? outcome.report : undefined;
  const progress = outcome && !outcome.ready ? outcome.progress : undefined;

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
    <Stagger className="space-y-8">
      <Rise>
        <PageHeader
          title="Report"
          description="Plan against actual for every category in the range, with the variance between them."
          actions={
            <Button
              variant="outline"
              className="rounded-xl"
              disabled={exporting || !data || data.rows.length === 0}
              onClick={onExport}
            >
              {exporting ? (
                <LoaderCircleIcon className="animate-spin" />
              ) : (
                <DownloadIcon />
              )}
              Export CSV
            </Button>
          }
        />
      </Rise>

      <Rise>
        <Panel>
          <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
            <RangeField value={range} onChange={setRange} anchor={anchor} />

            <div className="space-y-1.5">
              <Label htmlFor="filter" className="text-xs text-muted-foreground">
                Category
              </Label>
              <select
                id="filter"
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                className="h-9 rounded-xl border border-input bg-background px-3 text-sm transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none dark:bg-input/30"
              >
                <option value="">All categories</option>
                {(categories.data ?? []).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                    {category.archivedAt ? " (archived)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Panel>
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

      {progress && progress.status !== "failed" && (
        <Rise>
          <GeneratingState />
        </Rise>
      )}

      {progress?.status === "failed" && (
        <Rise>
          <ErrorState
            error={new ApiError(500, progress.error ?? "The report failed to generate")}
            onRetry={() => report.refetch()}
          />
        </Rise>
      )}

      {data && (
        <>
          <Rise>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatTile
                label="Total plan"
                icon={<WalletIcon className="size-4" />}
                value={
                  <CountUpValue to={data.totals.plan} format={formatCurrency} />
                }
                hint={`${data.byMonth.length} month${data.byMonth.length === 1 ? "" : "s"} in range`}
              />
              <StatTile
                label="Total actual"
                accent="info"
                icon={<ScrollTextIcon className="size-4" />}
                value={
                  <CountUpValue to={data.totals.actual} format={formatCurrency} />
                }
                hint="Missing entries counted as $0"
              />
              <StatTile
                label="Net variance"
                accent={data.totals.variance > 0 ? "unfavorable" : "favorable"}
                icon={
                  data.totals.variance > 0 ? (
                    <TrendingUpIcon className="size-4" />
                  ) : (
                    <TrendingDownIcon className="size-4" />
                  )
                }
                value={<VarianceAmount value={data.totals.variance} />}
                hint={
                  <VarianceChip
                    variance={data.totals.variance}
                    variancePct={data.totals.variancePct}
                  />
                }
              />
              <StatTile
                label="Categories"
                accent="locked"
                icon={<ScrollTextIcon className="size-4" />}
                value={new Set(data.rows.map((r) => r.categoryId)).size}
                hint="With a plan or an actual in range"
              />
            </div>
          </Rise>

          <Rise>
            <Panel
              title="Net variance by month"
              description="Above the line is over plan; below it is under."
            >
              <VarianceChart months={data.byMonth} />
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
                  icon={<ScrollTextIcon className="size-6" />}
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
                        <TableHead className="text-right">Variance %</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      <AnimatePresence initial={false}>
                        {byMonth(data.rows).flatMap(([month, rows]) => [
                          <motion.tr
                            key={`head-${month}`}
                            {...rowMotion}
                            className="bg-muted/40"
                          >
                            <TableCell colSpan={5} className="py-2">
                              <span className="flex items-center gap-2 text-xs font-medium tracking-wide uppercase">
                                {monthShort(month)}
                                {/* The lock lives on the month, so one row
                                    being locked means the month is. */}
                                <LockPill
                                  month={month}
                                  locked={rows.some((row) => row.locked)}
                                />
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
                              <TableCell className="text-right">
                                <VariancePct
                                  value={row.variancePct}
                                  variance={row.variance}
                                />
                              </TableCell>
                            </motion.tr>
                          )),
                        ])}
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
