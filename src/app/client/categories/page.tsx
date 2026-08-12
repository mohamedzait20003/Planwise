"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  FolderPlusIcon,
  LoaderCircleIcon,
  PlusIcon,
  TagsIcon,
} from "lucide-react";

import { PageHeader, Panel } from "@/components/client/page-header";
import { Rise, Stagger, rowMotion } from "@/components/client/motion";
import { EmptyState, ErrorState, LoadingRows } from "@/components/client/states";
import { FormMessage, errorMessage } from "@/components/auth/form-message";
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
import { Input } from "@/components/ui/input";
import { useCategories, useCreateCategory, useUpdateCategory } from "@/lib/hooks";
import { cn } from "@/lib/utils/utils";

function NameCell({
  id,
  name,
  disabled,
}: Readonly<{ id: string; name: string; disabled: boolean }>) {
  const update = useUpdateCategory();
  const [draft, setDraft] = useState<string | null>(null);

  function commit() {
    const next = draft?.trim();
    setDraft(null);
    if (!next || next === name) return;
    update.mutate({ id, name: next });
  }

  return (
    <div className="flex items-center gap-2">
      <input
        value={draft ?? name}
        disabled={disabled}
        aria-label={`Rename ${name}`}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") {
            setDraft(null);
            event.currentTarget.blur();
          }
        }}
        className={cn(
          "h-9 w-full max-w-xs rounded-lg border border-transparent bg-transparent px-2 text-sm font-medium transition-colors",
          "hover:border-border focus-visible:border-ring focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
          disabled && "cursor-not-allowed text-muted-foreground line-through"
        )}
      />
      {update.isPending && (
        <LoaderCircleIcon className="size-3.5 animate-spin text-muted-foreground" />
      )}
    </div>
  );
}

export default function CategoriesPage() {
  const categories = useCategories();
  const create = useCreateCategory();
  const update = useUpdateCategory();

  const [name, setName] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const all = categories.data ?? [];
  const visible = showArchived ? all : all.filter((c) => c.archivedAt === null);
  const archivedCount = all.filter((c) => c.archivedAt !== null).length;

  function onCreate(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    create.mutate({ name: trimmed }, { onSuccess: () => setName("") });
  }

  return (
    <Stagger className="space-y-8">
      <Rise>
        <PageHeader
          title="Categories"
          description="What you plan and spend against. Marketing, Payroll, Tools — whatever your months are actually made of."
          actions={
            archivedCount > 0 && (
              <Button
                variant="ghost"
                className="rounded-xl"
                onClick={() => setShowArchived((shown) => !shown)}
              >
                <ArchiveIcon />
                {showArchived ? "Hide" : "Show"} archived ({archivedCount})
              </Button>
            )
          }
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
                className="sm:max-w-sm"
              />
              <Button
                type="submit"
                disabled={create.isPending || name.trim() === ""}
                className="rounded-xl"
              >
                {create.isPending ? (
                  <LoaderCircleIcon className="animate-spin" />
                ) : (
                  <PlusIcon />
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
          {categories.isPending && !categories.isError && (
            <LoadingRows rows={4} className="p-5" />
          )}

          {!categories.isPending && visible.length === 0 && (
            <EmptyState
              icon={<FolderPlusIcon className="size-6" />}
              title={all.length === 0 ? "No categories yet" : "Nothing to show"}
              description={
                all.length === 0
                  ? "Add your first category above. Plans and actuals both hang off these, so this is the place to start."
                  : "Every category is archived. Show them to bring one back."
              }
            />
          )}

          {visible.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence initial={false}>
                    {visible.map((category) => {
                      const archived = category.archivedAt !== null;

                      return (
                        <motion.tr
                          key={category.id}
                          {...rowMotion}
                          className="border-b transition-colors hover:bg-muted/40"
                        >
                          <TableCell>
                            <NameCell
                              id={category.id}
                              name={category.name}
                              disabled={archived}
                            />
                          </TableCell>
                          <TableCell>
                            {archived ? (
                              <Badge variant="secondary">Archived</Badge>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                                <TagsIcon className="size-3.5" />
                                Active
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="rounded-xl"
                              disabled={update.isPending}
                              onClick={() =>
                                update.mutate({
                                  id: category.id,
                                  archived: !archived,
                                })
                              }
                            >
                              {archived ? (
                                <>
                                  <ArchiveRestoreIcon />
                                  Restore
                                </>
                              ) : (
                                <>
                                  <ArchiveIcon />
                                  Archive
                                </>
                              )}
                            </Button>
                          </TableCell>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          )}
        </Panel>
      </Rise>

      <Rise>
        <FormMessage>{update.error ? errorMessage(update.error) : null}</FormMessage>
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
