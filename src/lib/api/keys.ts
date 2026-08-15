import type { AdminUserQuery, ReportQuery } from "./types";

/**
 * Query keys, in one place.
 *
 * Keys are hierarchical so a mutation can invalidate a whole branch:
 * `invalidateQueries({ queryKey: reportKeys.all })` catches every date range
 * without knowing which ones are cached. Scattering keys across files is how a
 * mutation ends up invalidating four of the five queries it affected.
 */

export const authKeys = {
  all: ["auth"] as const,
  profile: () => [...authKeys.all, "profile"] as const,
};

export const categoryKeys = {
  all: ["categories"] as const,
  list: () => [...categoryKeys.all, "list"] as const,
};

export const planKeys = {
  all: ["plans"] as const,
  list: (month?: string) => [...planKeys.all, "list", month ?? "any"] as const,
};

export const actualKeys = {
  all: ["actuals"] as const,
  list: (month?: string, categoryId?: string) =>
    [...actualKeys.all, "list", month ?? "any", categoryId ?? "any"] as const,
};

export const lockKeys = {
  all: ["locks"] as const,
  list: () => [...lockKeys.all, "list"] as const,
};

export const reportKeys = {
  all: ["report"] as const,
  query: (params: ReportQuery) =>
    [...reportKeys.all, params.from, params.to, params.categoryId ?? "all"] as const,
  // Under `all`, so generating a report invalidates the history that lists it
  // without the mutation having to name a second key.
  history: () => [...reportKeys.all, "history"] as const,
};

/**
 * The admin console.
 *
 * `list` carries every filter, so typing in the search box caches each result
 * separately and going back to a previous needle is instant. `overview` sits
 * under the same root, which is what lets a role change invalidate both the
 * list it happened in and the counts on the dashboard with one call.
 */
export const adminKeys = {
  all: ["admin"] as const,
  overview: () => [...adminKeys.all, "overview"] as const,
  users: () => [...adminKeys.all, "users"] as const,
  list: (params: AdminUserQuery) =>
    [
      ...adminKeys.users(),
      params.query ?? "",
      params.role ?? "any",
      params.verified ?? "any",
      params.page ?? 1,
      params.perPage ?? 25,
    ] as const,
  detail: (id: string) => [...adminKeys.users(), "detail", id] as const,
};

export const derivedKeys = [reportKeys.all];
