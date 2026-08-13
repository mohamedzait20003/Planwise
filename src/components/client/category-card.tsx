"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  CheckIcon,
  LoaderCircleIcon,
  PencilIcon,
  UndoIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ApiError } from "@/lib/api";
import { useUpdateCategory } from "@/lib/hooks";
import type { Category } from "@/lib/api/types";
import { categoryChip, categoryMonogram } from "@/lib/utils/category-color";
import { cn } from "@/lib/utils/utils";

const dateFormat = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function formatAdded(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : dateFormat.format(date);
}

/* ---------------------------------------------------------------- subparts */

/**
 * The name, as a button that becomes an input.
 *
 * Split out from the card so each piece has one job: this one owns the swap
 * between reading and editing, and the card below owns the layout and the
 * archive action.
 */
function CategoryName({
  name,
  draft,
  archived,
  saving,
  onEdit,
  onDraftChange,
  onCommit,
  onCancel,
}: Readonly<{
  name: string;
  draft: string | null;
  archived: boolean;
  saving: boolean;
  onEdit: () => void;
  onDraftChange: (value: string) => void;
  onCommit: () => void;
  onCancel: () => void;
}>) {
  if (draft !== null) {
    return (
      <input
        value={draft}
        aria-label={`Rename ${name}`}
        maxLength={80}
        // Focus and select on mount so the name is immediately replaceable —
        // a click to rename should not need a second click to clear.
        ref={(node) => {
          node?.select();
        }}
        onChange={(event) => onDraftChange(event.target.value)}
        onBlur={onCommit}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") {
            onCancel();
            event.currentTarget.blur();
          }
        }}
        className="h-7 w-full rounded-lg border border-ring bg-background px-2 text-sm font-medium ring-3 ring-ring/30 outline-none"
      />
    );
  }

  return (
    <button
      type="button"
      disabled={archived || saving}
      aria-label={`Rename ${name}`}
      onClick={onEdit}
      className={cn(
        "flex h-7 w-full items-center gap-1.5 rounded-lg px-2 -mx-2 text-left text-sm font-medium transition-colors duration-200",
        "focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none",
        archived ? "cursor-default text-muted-foreground" : "hover:bg-muted/70"
      )}
    >
      <span className="truncate">{name}</span>
      {!archived && (
        <PencilIcon
          aria-hidden
          className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100"
        />
      )}
    </button>
  );
}

/** The line under the name: save state, archived pill, or the created date. */
function CategoryMeta({
  added,
  archived,
  saving,
  saved,
}: Readonly<{
  added: string | null;
  archived: boolean;
  saving: boolean;
  saved: boolean;
}>) {
  if (saving) {
    return (
      <p className="mt-1 flex h-5 items-center gap-1.5 text-xs text-muted-foreground">
        <LoaderCircleIcon aria-hidden className="size-3 animate-spin" />
        <span>Saving</span>
      </p>
    );
  }

  return (
    <p className="mt-1 flex h-5 items-center gap-1.5 text-xs text-muted-foreground">
      {archived && (
        <Badge variant="secondary" className="h-4 gap-1 px-1.5 text-[10px]">
          <ArchiveIcon aria-hidden />
          Archived
        </Badge>
      )}
      {!archived && saved && (
        <CheckIcon aria-hidden className="size-3 text-favorable" />
      )}
      {added && <span className="tabular">Added {added}</span>}
    </p>
  );
}

/* -------------------------------------------------------------------- card */

export function CategoryCard({
  category,
  justArchived,
  onArchivedChange,
}: Readonly<{
  category: Category;
  justArchived: boolean;
  onArchivedChange: (archived: boolean) => void;
}>) {
  const update = useUpdateCategory();
  const [draft, setDraft] = useState<string | null>(null);

  const archived = category.archivedAt !== null;
  const added = formatAdded(category.createdAt);

  function commit() {
    const next = draft?.trim();
    setDraft(null);
    if (!next || next === category.name) return;
    update.mutate({ id: category.id, name: next });
  }

  function toggleArchive() {
    update.mutate(
      { id: category.id, archived: !archived },
      { onSuccess: () => onArchivedChange(!archived) }
    );
  }

  const error = update.error && (update.error instanceof ApiError ? update.error.message : "Could not save that change.");

  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.16 } }}
      transition={{ type: "spring", stiffness: 320, damping: 30 }}
      className={cn(
        "group relative flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/70 p-4 transition-colors duration-200",
        "hover:border-border focus-within:border-ring/50",
        archived && !justArchived && "bg-card/40",
        justArchived && "border-locked/40 bg-locked-muted/40"
      )}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold ring-1 transition-[filter,opacity] duration-200",
            categoryChip(category.id),
            archived && "opacity-55 grayscale-[0.6]"
          )}
        >
          {categoryMonogram(category.name)}
        </span>

        <div className="min-w-0 flex-1">
          <CategoryName
            name={category.name}
            draft={draft}
            archived={archived}
            saving={update.isPending}
            onEdit={() => setDraft(category.name)}
            onDraftChange={setDraft}
            onCommit={commit}
            onCancel={() => setDraft(null)}
          />

          <CategoryMeta
            added={added}
            archived={archived}
            saving={update.isPending}
            saved={update.isSuccess}
          />
        </div>

        {justArchived ? (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 rounded-xl"
            disabled={update.isPending}
            onClick={toggleArchive}
          >
            <UndoIcon aria-hidden />
            Undo
          </Button>
        ) : (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-lg"
                  className="shrink-0 rounded-xl text-muted-foreground hover:text-foreground"
                  disabled={update.isPending}
                  aria-label={
                    archived
                      ? `Restore ${category.name}`
                      : `Archive ${category.name}`
                  }
                  onClick={toggleArchive}
                />
              }
            >
              {archived ? (
                <ArchiveRestoreIcon aria-hidden />
              ) : (
                <ArchiveIcon aria-hidden />
              )}
            </TooltipTrigger>
            <TooltipContent>
              {archived
                ? "Restore to the plans grid and entry form"
                : "Hide from the plans grid — history is kept"}
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg bg-unfavorable/8 px-2.5 py-1.5 text-xs leading-relaxed text-unfavorable"
        >
          {error}
        </p>
      )}
    </motion.li>
  );
}
