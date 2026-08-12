"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2Icon,
  FolderPlusIcon,
  LoaderCircleIcon,
  PlusIcon,
  ReceiptTextIcon,
  Trash2Icon,
  TriangleAlertIcon,
  UploadIcon,
} from "lucide-react";

import { PageHeader, Panel } from "@/components/client/page-header";
import { MonthField } from "@/components/client/month-field";
import { LockPill, LockedNotice } from "@/components/client/lock-pill";
import { Rise, Stagger, rowMotion } from "@/components/client/motion";
import { EmptyState, ErrorState, LoadingRows } from "@/components/client/states";
import { StatTile, CountUpValue } from "@/components/client/stat-tile";
import { Money } from "@/components/client/variance";
import { FormMessage, errorMessage } from "@/components/auth/form-message";
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
import { Label } from "@/components/ui/label";
import {
  useActuals,
  useCategories,
  useCreateActual,
  useDeleteActual,
  useImportActuals,
  useLocks,
} from "@/lib/hooks";
import { currentMonth, monthLong } from "@/lib/utils/month";
import { formatCurrency } from "@/lib/utils/variance";
import { cn } from "@/lib/utils/utils";

/**
 * What was actually spent.
 *
 * Two ways in, because the brief asks for both and they suit different moments:
 * the form for the one entry you remember on a Tuesday, the CSV for the export
 * your accounting tool produces at month end.
 *
 * An import that rejects rows still succeeds — a file of forty lines with two
 * bad ones should land thirty-eight, not nothing. The rejects come back with
 * their line numbers so they can be fixed and re-sent.
 */

function AddEntryForm({
  month,
  disabled,
}: Readonly<{ month: string; disabled: boolean }>) {
  const categories = useCategories();
  const create = useCreateActual();

  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const active = (categories.data ?? []).filter((c) => c.archivedAt === null);
  const parsed = Number(amount);
  const valid = categoryId !== "" && amount.trim() !== "" && !Number.isNaN(parsed) && parsed >= 0;

  function onSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid || disabled) return;

    create.mutate(
      { categoryId, month, amount: parsed, note: note.trim() || null },
      {
        onSuccess: () => {
          // Category deliberately survives: logging three entries against the
          // same category is the common shape, and re-picking it each time is
          // the kind of friction that makes people batch it into a spreadsheet.
          setAmount("");
          setNote("");
        },
      }
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1.2fr_0.8fr_1.5fr_auto]">
        <div className="space-y-1.5">
          <Label htmlFor="category" className="text-xs text-muted-foreground">
            Category
          </Label>
          <select
            id="category"
            value={categoryId}
            disabled={disabled || active.length === 0}
            onChange={(event) => setCategoryId(event.target.value)}
            className="h-9 w-full rounded-xl border border-input bg-background px-3 text-sm transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-muted dark:bg-input/30"
          >
            <option value="">Choose…</option>
            {active.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="amount" className="text-xs text-muted-foreground">
            Amount
          </Label>
          <div className="relative">
            <span className="absolute top-1/2 left-2.5 -translate-y-1/2 text-xs text-muted-foreground">
              $
            </span>
            <input
              id="amount"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              disabled={disabled}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.00"
              className="h-9 w-full rounded-xl border border-input bg-background pr-3 pl-6 text-sm tabular transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-muted dark:bg-input/30"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="note" className="text-xs text-muted-foreground">
            Note <span className="opacity-70">(optional)</span>
          </Label>
          <Input
            id="note"
            value={note}
            disabled={disabled}
            onChange={(event) => setNote(event.target.value)}
            placeholder="What was it for?"
            maxLength={200}
          />
        </div>

        <div className="flex items-end">
          <Button
            type="submit"
            disabled={disabled || !valid || create.isPending}
            className="h-9 w-full rounded-xl sm:w-auto"
          >
            {create.isPending ? (
              <LoaderCircleIcon className="animate-spin" />
            ) : (
              <PlusIcon />
            )}
            Log
          </Button>
        </div>
      </div>

      {active.length === 0 && !categories.isPending && (
        <p className="text-xs text-muted-foreground">
          You need a category first —{" "}
          <Link href="/client/categories" className="text-primary hover:underline">
            create one
          </Link>
          .
        </p>
      )}

      <FormMessage>{create.error ? errorMessage(create.error) : null}</FormMessage>
    </form>
  );
}

function ImportPanel({ disabled }: Readonly<{ disabled: boolean }>) {
  const importActuals = useImportActuals();
  const fileInput = useRef<HTMLInputElement>(null);
  const result = importActuals.data?.data;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={fileInput}
          type="file"
          accept=".csv,text/csv"
          disabled={disabled}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) importActuals.mutate(file);
            // Cleared so re-picking the same file after a fix still fires a
            // change event.
            event.target.value = "";
          }}
        />
        <Button
          variant="outline"
          className="rounded-xl"
          disabled={disabled || importActuals.isPending}
          onClick={() => fileInput.current?.click()}
        >
          {importActuals.isPending ? (
            <LoaderCircleIcon className="animate-spin" />
          ) : (
            <UploadIcon />
          )}
          Choose CSV
        </Button>

        <code className="rounded-lg bg-muted px-2.5 py-1.5 font-mono text-xs text-muted-foreground">
          month,category,amount
        </code>
      </div>

      <FormMessage>
        {importActuals.error ? errorMessage(importActuals.error) : null}
      </FormMessage>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 rounded-xl bg-muted/50 p-4 ring-1 ring-border">
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <span className="inline-flex items-center gap-2 text-favorable">
                  <CheckCircle2Icon className="size-4" />
                  <span data-numeric className="tabular font-medium">
                    {result.accepted}
                  </span>
                  accepted
                </span>
                {result.rejected > 0 && (
                  <span className="inline-flex items-center gap-2 text-unfavorable">
                    <TriangleAlertIcon className="size-4" />
                    <span data-numeric className="tabular font-medium">
                      {result.rejected}
                    </span>
                    rejected
                  </span>
                )}
              </div>

              {result.errors.length > 0 && (
                <ul className="space-y-1.5 text-xs">
                  {result.errors.map((rowError) => (
                    <li
                      key={`${rowError.line}-${rowError.raw}`}
                      className="flex flex-wrap items-baseline gap-2 border-l-2 border-unfavorable/40 pl-3"
                    >
                      <span className="font-medium text-muted-foreground">
                        Line {rowError.line}
                      </span>
                      <code className="font-mono text-muted-foreground/80">
                        {rowError.raw}
                      </code>
                      <span className="text-unfavorable">{rowError.reason}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ActualsPage() {
  const [month, setMonth] = useState(currentMonth);

  const categories = useCategories();
  const actuals = useActuals(month);
  const locks = useLocks();
  const remove = useDeleteActual();

  const locked = (locks.data ?? []).some((lock) => lock.month === month);
  const entries = actuals.data ?? [];
  const total = entries.reduce((sum, entry) => sum + entry.amount, 0);

  const names = new Map((categories.data ?? []).map((c) => [c.id, c.name]));

  return (
    <Stagger className="space-y-8">
      <Rise>
        <PageHeader
          title="Actuals"
          description={`What you actually spent in ${monthLong(month)}.`}
          actions={<LockPill month={month} locked={locked} />}
        />
      </Rise>

      <Rise>
        <Panel>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <MonthField value={month} onChange={setMonth} className="w-full max-w-xs" />
            <StatTile
              label="Logged this month"
              accent="info"
              icon={<ReceiptTextIcon className="size-4" />}
              value={<CountUpValue to={total} format={formatCurrency} />}
              hint={`${entries.length} ${entries.length === 1 ? "entry" : "entries"}`}
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

      <Rise>
        <Panel title="Log an entry">
          <AddEntryForm month={month} disabled={locked} />
        </Panel>
      </Rise>

      <Rise>
        <Panel
          title="Import from CSV"
          description="One row per entry. Category names must already exist, and months must read YYYY-MM."
        >
          <ImportPanel disabled={locked} />
        </Panel>
      </Rise>

      {actuals.isError && (
        <Rise>
          <ErrorState error={actuals.error} onRetry={() => actuals.refetch()} />
        </Rise>
      )}

      <Rise>
        <Panel title="Entries" bodyClassName="p-0">
          {actuals.isPending && !actuals.isError && (
            <LoadingRows rows={4} className="p-5" />
          )}

          {!actuals.isPending && entries.length === 0 && (
            <EmptyState
              icon={<FolderPlusIcon className="size-6" />}
              title={`Nothing logged for ${monthLong(month)}`}
              description="Use the form above for a single entry, or drop in a CSV if your accounting tool can export one."
            />
          )}

          {entries.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence initial={false}>
                    {entries.map((entry) => (
                      <motion.tr
                        key={entry.id}
                        {...rowMotion}
                        className="border-b transition-colors hover:bg-muted/40"
                      >
                        <TableCell className="font-medium">
                          {names.get(entry.categoryId) ?? "Unknown category"}
                        </TableCell>
                        <TableCell className="max-w-sm truncate text-sm text-muted-foreground">
                          {entry.note ?? "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Money value={entry.amount} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Delete entry of ${entry.amount}`}
                            disabled={locked || remove.isPending}
                            onClick={() => remove.mutate(entry.id)}
                            className={cn(
                              "size-8 rounded-lg text-muted-foreground",
                              !locked && "hover:text-unfavorable"
                            )}
                          >
                            <Trash2Icon className="size-4" />
                          </Button>
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
        <FormMessage>{remove.error ? errorMessage(remove.error) : null}</FormMessage>
      </Rise>
    </Stagger>
  );
}
