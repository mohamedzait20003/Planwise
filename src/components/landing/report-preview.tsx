"use client";

import { motion } from "framer-motion";
import { DownloadIcon, LockIcon } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  computeVariance,
  formatCurrency,
  formatSignedCurrency,
  formatVariancePct,
} from "@/lib/utils/variance";
import { cn } from "@/lib/utils/utils";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/* -------------------------------------------------------------- Preview data --
 * Landing-page-only figures, deliberately hardcoded so a signed-out visitor
 * sees a real report with no database behind it. This is NOT the app's seed
 * data — that belongs in the Prisma seed script and should stay separate.
 *
 * The Jan/Feb rows are verbatim from the assignment brief, including the
 * deliberately missing Marketing actual for 2026-02. March is added so the
 * preview reads as a full quarter and one month can be shown locked.
 * ---------------------------------------------------------------------------- */

type SampleRow = {
  month: string;
  category: string;
  plan: number;
  /** null = nothing logged for this category/month */
  actual: number | null;
};

const sampleRows: SampleRow[] = [
  { month: "2026-01", category: "Marketing", plan: 5_000, actual: 4_800 },
  { month: "2026-01", category: "Payroll", plan: 20_000, actual: 20_500 },
  { month: "2026-02", category: "Marketing", plan: 5_000, actual: null },
  { month: "2026-02", category: "Payroll", plan: 20_000, actual: 19_800 },
  { month: "2026-03", category: "Marketing", plan: 5_000, actual: 5_150 },
  { month: "2026-03", category: "Payroll", plan: 20_000, actual: 19_400 },
];

/** Closed periods — read-only in the UI and rejected by the API. */
const lockedMonths = new Set(["2026-01"]);

const monthLabels: Record<string, string> = {
  "2026-01": "Jan 2026",
  "2026-02": "Feb 2026",
  "2026-03": "Mar 2026",
};

const months = ["2026-01", "2026-02", "2026-03"];

function monthTotals(month: string) {
  const rows = sampleRows.filter((r) => r.month === month);
  return {
    plan: rows.reduce((sum, r) => sum + r.plan, 0),
    actual: rows.reduce((sum, r) => sum + (r.actual ?? 0), 0),
  };
}

/* ------------------------------------------------------------------- Derived */

const totalPlan = sampleRows.reduce((sum, r) => sum + r.plan, 0);
const totalActual = sampleRows.reduce((sum, r) => sum + (r.actual ?? 0), 0);
const totals = computeVariance(totalPlan, totalActual);

/** Headroom so the tallest bar doesn't touch the top of the plot. */
const chartMax = Math.max(
  ...months.flatMap((m) => {
    const { plan, actual } = monthTotals(m);
    return [plan, actual];
  })
) * 1.08;

/**
 * Colour only encodes a real over/under result. A row whose actual was never
 * logged still computes as −100%, but painting that green would read as "came
 * in under budget" when the truth is "we have no data" — so it stays neutral.
 */
function varianceTone(variance: number, hasActual = true) {
  if (!hasActual || variance === 0) return "text-muted-foreground";
  return variance < 0 ? "text-favorable" : "text-unfavorable";
}

function MonthChart() {
  return (
    <div className="flex items-end justify-between gap-4 px-1">
      {months.map((month, i) => {
        const { plan, actual } = monthTotals(month);
        const { variance } = computeVariance(plan, actual);
        const locked = lockedMonths.has(month);

        return (
          <div key={month} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex h-28 w-full items-end justify-center gap-1.5">
              {/* Plan — outlined, it's a target not a measurement */}
              <motion.div
                className="w-1/3 max-w-6 rounded-t-[3px] border border-dashed border-chart-1/70 bg-chart-1/15"
                initial={{ height: 0 }}
                whileInView={{ height: `${(plan / chartMax) * 100}%` }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.85, delay: 0.15 + i * 0.12, ease: EASE_OUT }}
              />
              {/* Actual — solid */}
              <motion.div
                className="w-1/3 max-w-6 rounded-t-[3px] bg-chart-2"
                initial={{ height: 0 }}
                whileInView={{ height: `${(actual / chartMax) * 100}%` }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.85, delay: 0.25 + i * 0.12, ease: EASE_OUT }}
              />
            </div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              {locked && <LockIcon className="size-2.5 text-locked" />}
              {monthLabels[month].replace(" 2026", "")}
            </div>
            <span className={cn("text-[10px] font-medium tabular", varianceTone(variance))}>
              {formatSignedCurrency(variance)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Kpi({
  label,
  value,
  tone,
  sub,
}: Readonly<{ label: string; value: string; tone?: string; sub?: string }>) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
        {label}
      </p>
      <p className={cn("text-lg font-semibold tabular", tone)}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground tabular">{sub}</p>}
    </div>
  );
}

/**
 * A faithful, non-interactive rendering of the report the app produces —
 * numbers are computed by the same `computeVariance` the product uses.
 */
export function ReportPreview({ className }: Readonly<{ className?: string }>) {
  return (
    <div
      className={cn(
        "surface-glass overflow-hidden rounded-2xl border border-border/60",
        className
      )}
    >
      {/* Window chrome */}
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-unfavorable/70" />
          <span className="size-2.5 rounded-full bg-locked/70" />
          <span className="size-2.5 rounded-full bg-favorable/70" />
        </div>
        <div className="ml-2 flex items-center gap-2">
          <span className="text-xs font-medium">Variance report</span>
          <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
            Q1 2026
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="icon-xs"
          className="ml-auto text-muted-foreground"
          aria-label="Export CSV"
        >
          <DownloadIcon />
        </Button>
      </div>

      <div className="space-y-5 p-4">
        <div className="grid grid-cols-3 gap-3">
          <Kpi label="Plan" value={formatCurrency(totalPlan)} />
          <Kpi label="Actual" value={formatCurrency(totalActual)} />
          <Kpi
            label="Variance"
            value={formatSignedCurrency(totals.variance)}
            tone={varianceTone(totals.variance)}
            sub={formatVariancePct(totals.variancePct)}
          />
        </div>

        <MonthChart />

        <div className="-mx-1 overflow-hidden rounded-lg border border-border/60">
          <Table className="text-xs">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-8 px-2.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                  Category
                </TableHead>
                <TableHead className="h-8 px-2.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                  Month
                </TableHead>
                <TableHead className="h-8 px-2.5 text-right text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                  Plan
                </TableHead>
                <TableHead className="h-8 px-2.5 text-right text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                  Actual
                </TableHead>
                <TableHead className="h-8 px-2.5 text-right text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                  Var
                </TableHead>
                <TableHead className="h-8 px-2.5 text-right text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                  Var %
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sampleRows.slice(0, 4).map((row, i) => {
                const { variance, variancePct } = computeVariance(
                  row.plan,
                  row.actual
                );
                const locked = lockedMonths.has(row.month);

                return (
                  <motion.tr
                    key={`${row.month}-${row.category}`}
                    className="border-b transition-colors last:border-0 hover:bg-muted/40"
                    initial={{ opacity: 0, x: -8 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ duration: 0.5, delay: 0.35 + i * 0.07, ease: EASE_OUT }}
                  >
                    <TableCell className="px-2.5 py-1.5 font-medium">
                      {row.category}
                    </TableCell>
                    <TableCell className="px-2.5 py-1.5 text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        {locked && <LockIcon className="size-2.5 text-locked" />}
                        {monthLabels[row.month]}
                      </span>
                    </TableCell>
                    <TableCell className="px-2.5 py-1.5 text-right tabular">
                      {formatCurrency(row.plan)}
                    </TableCell>
                    <TableCell className="px-2.5 py-1.5 text-right tabular">
                      {row.actual === null ? (
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <span className="cursor-help text-muted-foreground/70 underline decoration-dashed decoration-from-font underline-offset-4" />
                            }
                          >
                            $0
                          </TooltipTrigger>
                          <TooltipContent>
                            No actual logged — counted as $0
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        formatCurrency(row.actual)
                      )}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "px-2.5 py-1.5 text-right font-medium tabular",
                        varianceTone(variance, row.actual !== null)
                      )}
                    >
                      {formatSignedCurrency(variance)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "px-2.5 py-1.5 text-right font-medium tabular",
                        varianceTone(variance, row.actual !== null)
                      )}
                    >
                      {formatVariancePct(variancePct)}
                    </TableCell>
                  </motion.tr>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
