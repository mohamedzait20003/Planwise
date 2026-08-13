"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import {
  FolderPlusIcon,
  LoaderCircleIcon,
  PlusIcon,
  SearchIcon,
  SearchXIcon,
  XIcon,
} from "lucide-react";

import { PageHeader, Panel } from "@/components/client/page-header";
import { Rise, Stagger } from "@/components/client/motion";
import { Segmented } from "@/components/client/segmented";
import { CategoryCard } from "@/components/client/category-card";
import { EmptyState, ErrorState, LoadingRows } from "@/components/client/states";
import { FormMessage, errorMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCategories, useCreateCategory } from "@/lib/hooks";

type Filter = "active" | "archived" | "all";

/** How long an archived card stays put so its undo is still reachable. */
const UNDO_LINGER_MS = 6_000;

export default function CategoriesPage() {
  const categories = useCategories();
  const create = useCreateCategory();

  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("active");

  /**
   * The category archived a moment ago. It is kept in the grid even when the
   * current filter would drop it, so the action that just removed it from view
   * still has a visible way back — archiving is reversible, and a row that
   * vanishes silently does not look reversible.
   */
  const [lingering, setLingering] = useState<string | null>(null);

  useEffect(() => {
    if (!lingering) return;
    const timer = setTimeout(() => setLingering(null), UNDO_LINGER_MS);
    return () => clearTimeout(timer);
  }, [lingering]);

  const all = useMemo(() => categories.data ?? [], [categories.data]);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const found = needle
      ? all.filter((category) => category.name.toLowerCase().includes(needle))
      : all;

    // Archived last, then alphabetical — a name grid is scanned by name, and
    // the live categories are the ones being scanned for.
    return [...found].sort((a, b) => {
      const archived = Number(a.archivedAt !== null) - Number(b.archivedAt !== null);
      return archived !== 0 ? archived : a.name.localeCompare(b.name);
    });
  }, [all, query]);

  const activeCount = matches.filter((c) => c.archivedAt === null).length;
  const archivedCount = matches.length - activeCount;

  const visible = matches.filter((category) => {
    if (category.id === lingering) return true;
    if (filter === "active") return category.archivedAt === null;
    if (filter === "archived") return category.archivedAt !== null;
    return true;
  });

  function onCreate(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    create.mutate(
      { name: trimmed },
      {
        onSuccess: () => {
          setName("");
          // A new category is always active, so show the filter it landed in
          // rather than leaving the user staring at an unchanged grid.
          setFilter((current) => (current === "archived" ? "active" : current));
          setQuery("");
        },
      }
    );
  }

  const searching = query.trim() !== "";
  const loading = categories.isPending && !categories.isError;

  return (
    <Stagger className="space-y-8">
      <Rise>
        <PageHeader
          title="Categories"
          description="What you plan and spend against. Marketing, Payroll, Tools — whatever your months are actually made of."
        />
      </Rise>

      <Rise>
        <Panel title="Add a category">
          <form onSubmit={onCreate} className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Marketing"
                aria-label="New category name"
                maxLength={80}
                className="h-10 sm:max-w-sm"
              />
              <Button
                type="submit"
                disabled={create.isPending || name.trim() === ""}
                className="h-10 rounded-xl"
              >
                {create.isPending ? (
                  <LoaderCircleIcon aria-hidden className="animate-spin" />
                ) : (
                  <PlusIcon aria-hidden />
                )}
                Add
              </Button>
            </div>

            <FormMessage>
              {create.error ? errorMessage(create.error) : null}
            </FormMessage>
          </form>
        </Panel>
      </Rise>

      {categories.isError && (
        <Rise>
          <ErrorState error={categories.error} onRetry={() => categories.refetch()} />
        </Rise>
      )}

      <Rise>
        <Panel title="Your categories" bodyClassName="p-0">
          {!categories.isError && all.length > 0 && (
            <div className="flex flex-col gap-3 border-b border-border/60 p-4 sm:flex-row sm:items-center">
              <div className="relative flex-1 sm:max-w-xs">
                <SearchIcon
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  type="search"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setLingering(null);
                  }}
                  placeholder="Search categories"
                  aria-label="Search categories"
                  className="h-10 pr-9 pl-9"
                />
                {searching && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Clear search"
                    onClick={() => setQuery("")}
                    className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-lg text-muted-foreground"
                  >
                    <XIcon aria-hidden />
                  </Button>
                )}
              </div>

              <Segmented
                layoutId="category-filter"
                label="Filter categories"
                value={filter}
                onChange={(next) => {
                  setFilter(next);
                  setLingering(null);
                }}
                className="sm:ml-auto"
                options={[
                  { value: "active", label: "Active", count: activeCount },
                  { value: "archived", label: "Archived", count: archivedCount },
                  { value: "all", label: "All", count: matches.length },
                ]}
              />
            </div>
          )}

          {loading && <LoadingRows rows={4} className="p-4" />}

          {!loading && all.length === 0 && (
            <EmptyState
              icon={<FolderPlusIcon aria-hidden className="size-6" />}
              title="No categories yet"
              description="Add your first category above. Plans and actuals both hang off these, so this is the place to start."
            />
          )}

          {!loading && all.length > 0 && visible.length === 0 && (
            <EmptyState
              icon={<SearchXIcon aria-hidden className="size-6" />}
              title={searching ? `No match for “${query.trim()}”` : "Nothing here"}
              description={
                searching
                  ? "No category name contains that. Check the spelling, or widen the filter to include archived ones."
                  : "No category is in this state right now. Try another filter."
              }
              action={
                searching && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => setQuery("")}
                  >
                    Clear search
                  </Button>
                )
              }
            />
          )}

          {visible.length > 0 && (
            <ul className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
              <AnimatePresence initial={false} mode="popLayout">
                {visible.map((category) => (
                  <CategoryCard
                    key={category.id}
                    category={category}
                    justArchived={category.id === lingering}
                    onArchivedChange={(archived) =>
                      setLingering(archived ? category.id : null)
                    }
                  />
                ))}
              </AnimatePresence>
            </ul>
          )}
        </Panel>
      </Rise>

      <Rise>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Archiving hides a category from the plans grid and the entry form but
          leaves every historical plan and actual intact, so past reports keep
          the same numbers they always had.
        </p>
      </Rise>
    </Stagger>
  );
}
