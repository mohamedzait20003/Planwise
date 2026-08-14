"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2Icon,
  ChevronDownIcon,
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
import { CountUpValue } from "@/components/client/stat-tile";
import { CategoryBreakdown } from "@/components/client/category-breakdown";
import { MoneyInput } from "@/components/client/money-input";
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
  useUpdateActual,
} from "@/lib/hooks";
import type { Actual } from "@/lib/api/types";
import { currentMonth, monthLong } from "@/lib/utils/month";
import { categorySolid } from "@/lib/utils/category-color";
import { formatCurrency } from "@/lib/utils/variance";
import { cn } from "@/lib/utils/utils";

/**
 * What was actually spent.
 *
 * Laid out as a workspace rather than a stack: entry on the left, the ledger on
 * the right. Logging an entry and checking what it did to the month are the two
 * halves of one task, and stacking them meant scrolling past the form to see
 * the result and back up to add the next one.
 *
 * Two ways in, because the brief asks for both and they suit different moments:
 * the form for the one entry you remember on a Tuesday, the CSV for the export
 * your accounting tool produces at month end.
 */

/**
 * An entry's amount and note, editable in place.
 *
 * Same commit-on-blur contract as the plans grid, and for the same reason:
 * correcting a figure you mistyped should not cost a dialog. The service checks
 * the lock on the row's stored month, so an entry cannot be edited out of a
 * closed period even if this input somehow renders enabled.
 */
function EditableEntry({
  entry,
  disabled,
}: Readonly<{ entry: Actual; disabled: boolean }>) {
  const update = useUpdateActual();
  const [note, setNote] = useState<string | null>(null);

  function commitNote() {
    const draft = note;
    setNote(null);
    if (draft === null) return;

    const next = draft.trim();
    if (next === (entry.note ?? "")) return;

    // "" clears it rather than storing an empty string — the DTO maps it to
    // null, which is what "no note" means in the column.
    update.mutate({ id: entry.id, note: next });
  }

  return (
    <>
      <TableCell className="max-w-xs">
        <input
          value={note ?? entry.note ?? ""}
          disabled={disabled}
          placeholder="—"
          aria-label="Note"
          onChange={(event) => setNote(event.target.value)}
          onBlur={commitNote}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
            if (event.key === "Escape") {
              setNote(null);
              event.currentTarget.blur();
            }
          }}
          maxLength={200}
          className={cn(
            "h-9 w-full rounded-lg border border-transparent bg-transparent px-2 text-sm transition-colors",
            "hover:border-border focus-visible:border-ring focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
            "disabled:cursor-not-allowed disabled:hover:border-transparent"
          )}
        />
      </TableCell>

      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          {update.isPending && (
            <LoaderCircleIcon
              aria-hidden
              className="size-3.5 animate-spin text-muted-foreground"
            />
          )}
          <MoneyInput
            value={entry.amount}
            onCommit={(amount) => {
              if (amount === null || amount === entry.amount) return;
              update.mutate({ id: entry.id, amount });
            }}
            disabled={disabled}
            step={50}
            label={`Amount for ${entry.note ?? "this entry"}`}
            className={cn("w-48", update.isError && "border-unfavorable")}
          />
        </div>
      </TableCell>
    </>
  );
}

/**
 * The quick-add form, stacked for the narrow rail.
 *
 * One column rather than a row of four: at rail width a horizontal form gives
 * every field about eighty pixels, and an amount field that cannot show
 * "$12,480" is worse than a taller form.
 */
function AddEntryForm({
  month,
  disabled,
}: Readonly<{ month: string; disabled: boolean }>) {
  const categories = useCategories();
  const create = useCreateActual();

  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState<number | null>(null);
  const [note, setNote] = useState("");

  const active = (categories.data ?? []).filter((c) => c.archivedAt === null);
  const valid = categoryId !== "" && amount !== null;

  function onSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid || disabled) return;

    create.mutate(
      { categoryId, month, amount, note: note.trim() || null },
      {
        onSuccess: () => {
          // Category deliberately survives: logging three entries against the
          // same category is the common shape, and re-picking it each time is
          // the kind of friction that makes people batch it into a spreadsheet.
          setAmount(null);
          setNote("");
        },
      }
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="category" className="text-xs text-muted-foreground">
          Category
        </Label>
        <select
          id="category"
          value={categoryId}
          disabled={disabled || active.length === 0}
          onChange={(event) => setCategoryId(event.target.value)}
          className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-muted dark:bg-input/30"
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
        <MoneyInput
          id="amount"
          value={amount ?? undefined}
          onChange={setAmount}
          disabled={disabled}
          step={50}
          label="Amount"
          className="h-10 w-full"
        />
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
          className="h-10"
        />
      </div>

      <Button
        type="submit"
        disabled={disabled || !valid || create.isPending}
        className="h-10 w-full rounded-xl"
      >
        {create.isPending ? (
          <LoaderCircleIcon aria-hidden className="animate-spin" />
        ) : (
          <PlusIcon aria-hidden />
        )}
        Log entry
      </Button>

      {active.length === 0 && !categories.isPending && (
        <p className="text-xs leading-relaxed text-muted-foreground">
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

/**
 * CSV import, behind a disclosure.
 *
 * Folded away by default because it is the month-end path, not the daily one —
 * and an import control sitting open above the ledger implies the file is the
 * expected way in. The result panel stays expanded once a file has been read,
 * since that is the only place the rejected rows are reported.
 */
function ImportPanel({ disabled }: Readonly<{ disabled: boolean }>) {
  const importActuals = useImportActuals();
  const fileInput = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const result = importActuals.data?.data;

  return (
    <div className="surface-glass overflow-hidden rounded-2xl border border-border/60">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="import-body"
        onClick={() => setOpen((shown) => !shown)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
      >
        <UploadIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        <span className="flex-1">
          <span className="block font-medium">Import from CSV</span>
          <span className="block text-xs text-muted-foreground">
            month, category, amount
          </span>
        </span>
        <motion.span
          aria-hidden
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-muted-foreground"
        >
          <ChevronDownIcon className="size-4" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id="import-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0, transition: { duration: 0.16 } }}
            transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-3 border-t border-border/60 px-5 py-4">
              <p className="text-xs leading-relaxed text-muted-foreground">
                A header row naming month, category and amount — in any order —
                then one row per entry. Category names must already exist, and
                months must read YYYY-MM.
              </p>

              <input
                ref={fileInput}
                type="file"
                accept=".csv,text/csv"
                disabled={disabled}
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) importActuals.mutate(file);
                  // Cleared so re-picking the same file after a fix still fires
                  // a change event.
                  event.target.value = "";
                }}
              />

              <Button
                variant="outline"
                className="h-10 w-full rounded-xl"
                disabled={disabled || importActuals.isPending}
                onClick={() => fileInput.current?.click()}
              >
                {importActuals.isPending ? (
                  <LoaderCircleIcon aria-hidden className="animate-spin" />
                ) : (
                  <UploadIcon aria-hidden />
                )}
                Choose CSV
              </Button>

              <FormMessage>
                {importActuals.error ? errorMessage(importActuals.error) : null}
              </FormMessage>

              {result && (
                <output className="block space-y-3 rounded-xl bg-muted/50 p-3 ring-1 ring-border">
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <span className="inline-flex items-center gap-2 text-favorable">
                      <CheckCircle2Icon aria-hidden className="size-4" />
                      <span data-numeric className="tabular font-medium">
                        {result.accepted}
                      </span>
                      <span>accepted</span>
                    </span>
                    {result.rejected > 0 && (
                      <span className="inline-flex items-center gap-2 text-unfavorable">
                        <TriangleAlertIcon aria-hidden className="size-4" />
                        <span data-numeric className="tabular font-medium">
                          {result.rejected}
                        </span>
                        <span>rejected</span>
                      </span>
                    )}
                  </div>

                  {result.errors.length > 0 && (
                    <ul className="space-y-1.5 text-xs">
                      {result.errors.map((rowError) => (
                        <li
                          key={`${rowError.line}-${rowError.raw}`}
                          className="space-y-0.5 border-l-2 border-unfavorable/40 pl-3"
                        >
                          <span className="flex flex-wrap items-baseline gap-2">
                            <span className="font-medium text-muted-foreground">
                              Line {rowError.line}
                            </span>
                            <code className="font-mono text-muted-foreground/80">
                              {rowError.raw}
                            </code>
                          </span>
                          <span className="block text-unfavorable">
                            {rowError.reason}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </output>
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
  const loading = actuals.isPending && !actuals.isError;

  return (
    <Stagger className="space-y-6">
      <Rise>
        <PageHeader
          title="Actuals"
          description={`What you actually spent in ${monthLong(month)}.`}
          actions={<LockPill month={month} locked={locked} />}
        />
      </Rise>

      {locked && (
        <Rise>
          <LockedNotice month={month} />
        </Rise>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,21rem)_minmax(0,1fr)]">
        {/* ---- Entry rail ------------------------------------------------ */}
        <Rise className="space-y-4 lg:sticky lg:top-24">
          <Panel>
            <div className="space-y-4">
              <MonthField value={month} onChange={setMonth} />

              <div className="flex items-end justify-between gap-3 border-t border-border/60 pt-4">
                <div>
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Logged
                  </p>
                  <p className="mt-1 text-2xl font-semibold tracking-tight">
                    <CountUpValue to={total} format={formatCurrency} />
                  </p>
                </div>
                <span className="flex size-9 items-center justify-center rounded-xl bg-info/10 text-info ring-1 ring-info/20">
                  <ReceiptTextIcon aria-hidden className="size-4" />
                </span>
              </div>

              <p className="text-xs text-muted-foreground">
                {entries.length} {entries.length === 1 ? "entry" : "entries"} in{" "}
                {monthLong(month)}
              </p>
            </div>
          </Panel>

          <Panel title="Log an entry">
            <AddEntryForm month={month} disabled={locked} />
          </Panel>

          <ImportPanel disabled={locked} />
        </Rise>

        {/* ---- Ledger ---------------------------------------------------- */}
        <Rise className="space-y-4">
          {actuals.isError && (
            <ErrorState error={actuals.error} onRetry={() => actuals.refetch()} />
          )}

          {entries.length > 0 && (
            <Panel
              title="Where it went"
              description="Share of this month's spend, by category."
            >
              <CategoryBreakdown entries={entries} names={names} />
            </Panel>
          )}

          <Panel title="Entries" bodyClassName="p-0">
            {loading && <LoadingRows rows={5} className="p-5" />}

            {!loading && entries.length === 0 && (
              <EmptyState
                icon={<FolderPlusIcon aria-hidden className="size-6" />}
                title={`Nothing logged for ${monthLong(month)}`}
                description="Use the form on the left for a single entry, or drop in a CSV if your accounting tool can export one."
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
                      <TableHead className="w-12">
                        <span className="sr-only">Delete</span>
                      </TableHead>
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
                            <span className="flex items-center gap-2">
                              {/* Ties the row to its bar in the breakdown
                                  above — the same colour on both. */}
                              <span
                                aria-hidden
                                className={cn(
                                  "size-2.5 shrink-0 rounded-[3px]",
                                  categorySolid(entry.categoryId)
                                )}
                              />
                              {names.get(entry.categoryId) ?? "Unknown category"}
                            </span>
                          </TableCell>

                          <EditableEntry entry={entry} disabled={locked} />

                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Delete entry of ${formatCurrency(entry.amount)}`}
                              disabled={locked || remove.isPending}
                              onClick={() => remove.mutate(entry.id)}
                              className={cn(
                                "size-8 rounded-lg text-muted-foreground",
                                !locked && "hover:text-unfavorable"
                              )}
                            >
                              <Trash2Icon aria-hidden className="size-4" />
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

          <FormMessage>
            {remove.error ? errorMessage(remove.error) : null}
          </FormMessage>
        </Rise>
      </div>
    </Stagger>
  );
}
