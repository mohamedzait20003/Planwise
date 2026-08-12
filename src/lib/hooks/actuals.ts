"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createActual,
  deleteActual,
  getActuals,
  importActuals,
  updateActual,
} from "@/lib/handlers/actuals";
import { actualKeys, derivedKeys } from "@/lib/api/keys";
import type { UpdateActualInput } from "@/lib/api/types";

export function useActuals(month?: string, categoryId?: string) {
  return useQuery({
    queryKey: actualKeys.list(month, categoryId),
    queryFn: () => getActuals(month, categoryId),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    select: (res) => res.data ?? [],
  });
}

/** Invalidates actuals and the report, which sums them. */
function useActualMutation<TInput, TResult>(
  mutationFn: (input: TInput) => Promise<TResult>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () => {
      for (const queryKey of [actualKeys.all, ...derivedKeys]) {
        queryClient.invalidateQueries({ queryKey });
      }
    },
  });
}

export function useCreateActual() {
  return useActualMutation(createActual);
}

export function useUpdateActual() {
  return useActualMutation(
    ({ id, ...input }: UpdateActualInput & { id: string }) =>
      updateActual(id, input)
  );
}

export function useDeleteActual() {
  return useActualMutation(deleteActual);
}

/**
 * CSV import.
 *
 * Succeeds even when rows were rejected — read `data.rejected` and
 * `data.errors` to list what was skipped, rather than treating a partial
 * import as a failure.
 */
export function useImportActuals() {
  return useActualMutation(importActuals);
}
