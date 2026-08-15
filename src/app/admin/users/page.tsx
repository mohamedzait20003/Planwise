"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { SearchIcon, SearchXIcon, UsersIcon, XIcon } from "lucide-react";

import { PageHeader, Panel } from "@/components/common/page-header";
import { Rise, Stagger } from "@/components/common/motion";
import { Segmented } from "@/components/common/segmented";
import { EmptyState, ErrorState, LoadingRows } from "@/components/common/states";
import { Pager, UserTable } from "@/components/admin/user-table";
import { UserDetail } from "@/components/admin/user-detail";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdminUsers } from "@/lib/hooks";
import { useDebounced } from "@/lib/utils/use-debounced";
import type { AdminUser } from "@/lib/api/types";

type RoleFilter = "all" | "ADMIN" | "USER";
type StateFilter = "all" | "verified" | "unverified";

const PER_PAGE = 25;

export default function AdminUsersPage() {
  const { data: session } = useSession();

  const [query, setQuery] = useState("");
  const [role, setRole] = useState<RoleFilter>("all");
  const [state, setState] = useState<StateFilter>("all");
  const [page, setPage] = useState(1);

  // One request when typing stops, rather than one per character.
  const needle = useDebounced(query.trim());

  /**
   * The account the sheet is open on, held by id rather than by value.
   *
   * A copy would go stale the moment a role changed: the mutation invalidates
   * the list, the row re-renders with the new role, and the sheet would still
   * be showing the old one with a button offering to make the change again.
   */
  const [managing, setManaging] = useState<string | null>(null);

  const users = useAdminUsers({
    query: needle || undefined,
    role: role === "all" ? undefined : role,
    verified: state === "all" ? undefined : state === "verified",
    page,
    perPage: PER_PAGE,
  });

  const data = users.data;
  const items = data?.items ?? [];
  const selected = items.find((user) => user.id === managing) ?? null;

  const searching = needle !== "";
  const filtered = searching || role !== "all" || state !== "all";
  const loading = users.isPending && !users.isError;

  /**
   * Every filter change also returns to page one.
   *
   * Done in the handlers rather than an effect watching the filters: narrowing
   * a list while on page 4 leaves the page past the end of the results, which
   * renders empty and reads as a bug. Resetting where the change is made means
   * the new page number and the new filter reach the query together, so there
   * is no render in between showing the old page against the new filter.
   */
  function changeQuery(next: string) {
    setQuery(next);
    setPage(1);
  }

  function changeRole(next: RoleFilter) {
    setRole(next);
    setPage(1);
  }

  function changeState(next: StateFilter) {
    setState(next);
    setPage(1);
  }

  function clearFilters() {
    changeQuery("");
    setRole("all");
    setState("all");
  }

  return (
    <Stagger className="space-y-8">
      <Rise>
        <PageHeader
          title="Users"
          description="Every account on the platform. Roles and email verification are changed here; what an account holds stays with its owner."
        />
      </Rise>

      {users.isError && (
        <Rise>
          <ErrorState error={users.error} onRetry={() => users.refetch()} />
        </Rise>
      )}

      <Rise>
        <Panel title="Accounts" bodyClassName="p-0">
          <div className="flex flex-col gap-3 border-b border-border/60 p-4 lg:flex-row lg:items-center">
            <div className="relative flex-1 lg:max-w-xs">
              <SearchIcon
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                type="search"
                value={query}
                onChange={(event) => changeQuery(event.target.value)}
                placeholder="Search name or email"
                aria-label="Search users by name or email"
                className="h-10 pr-9 pl-9"
              />
              {query !== "" && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Clear search"
                  onClick={() => changeQuery("")}
                  className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-lg text-muted-foreground"
                >
                  <XIcon aria-hidden />
                </Button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
              <Segmented
                layoutId="admin-role-filter"
                label="Filter by role"
                value={role}
                onChange={changeRole}
                options={[
                  { value: "all", label: "All" },
                  { value: "ADMIN", label: "Admins" },
                  { value: "USER", label: "Members" },
                ]}
              />

              <Segmented
                layoutId="admin-state-filter"
                label="Filter by email verification"
                value={state}
                onChange={changeState}
                options={[
                  { value: "all", label: "Any" },
                  { value: "verified", label: "Verified" },
                  { value: "unverified", label: "Unverified" },
                ]}
              />
            </div>
          </div>

          {loading && <LoadingRows rows={6} className="p-4" />}

          {!loading && items.length === 0 && (
            <EmptyState
              icon={
                filtered ? (
                  <SearchXIcon aria-hidden className="size-6" />
                ) : (
                  <UsersIcon aria-hidden className="size-6" />
                )
              }
              title={filtered ? "No account matches" : "No accounts yet"}
              description={
                filtered
                  ? "Nothing here fits those filters. Widen them, or check the spelling of the search."
                  : "Nobody has signed up. The first account to register will appear here."
              }
              action={
                filtered && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={clearFilters}
                  >
                    Clear filters
                  </Button>
                )
              }
            />
          )}

          {!loading && items.length > 0 && (
            <>
              <UserTable
                users={items}
                onManage={(user: AdminUser) => setManaging(user.id)}
              />
              <Pager
                page={data?.page ?? 1}
                perPage={data?.perPage ?? PER_PAGE}
                total={data?.total ?? 0}
                busy={users.isFetching}
                onPageChange={setPage}
              />
            </>
          )}
        </Panel>
      </Rise>

      <UserDetail
        user={selected}
        actorId={session?.user?.id}
        open={selected !== null}
        onOpenChange={(open) => !open && setManaging(null)}
      />
    </Stagger>
  );
}
