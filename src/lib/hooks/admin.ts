"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { getOverview, getUsers, updateUser } from "@/lib/handlers/admin";
import { adminKeys } from "@/lib/api/keys";
import type { AdminUserQuery, UpdateAdminUserInput } from "@/lib/api/types";

/**
 * The dashboard's figures.
 *
 * A short stale time rather than zero: the queue counts are the reason to keep
 * this page open, and a stuck run should surface without a reload. Not so short
 * that leaving the tab open bills a query every few seconds.
 */
export function useAdminOverview() {
  return useQuery({
    queryKey: adminKeys.overview(),
    queryFn: getOverview,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
}

/**
 * A page of users.
 *
 * `keepPreviousData` is what makes the table usable while typing: without it
 * every keystroke unmounts the rows for a skeleton, and the list flickers
 * through empty on the way to each new answer.
 */
export function useAdminUsers(params: AdminUserQuery) {
  return useQuery({
    queryKey: adminKeys.list(params),
    queryFn: () => getUsers(params),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

/**
 * Change a role or a verification state.
 *
 * Invalidates `adminKeys.all` rather than the one page it happened on: a
 * promotion changes the admin count on the dashboard and the role filter's
 * membership as surely as it changes the row, and naming those individually is
 * how one of them gets forgotten.
 */
export function useUpdateAdminUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...input }: UpdateAdminUserInput & { id: string }) =>
      updateUser(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}
