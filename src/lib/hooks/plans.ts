"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { deletePlan, getPlans, upsertPlan } from "@/lib/handlers/plans";
import { derivedKeys, planKeys } from "@/lib/api/keys";

export function usePlans(month?: string) {
  return useQuery({
    queryKey: planKeys.list(month),
    queryFn: () => getPlans(month),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    select: (res) => res.data ?? [],
  });
}

/** Invalidates plans and the report, which is computed from them. */
function usePlanMutation<TInput, TResult>(
  mutationFn: (input: TInput) => Promise<TResult>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () => {
      for (const queryKey of [planKeys.all, ...derivedKeys]) {
        queryClient.invalidateQueries({ queryKey });
      }
    },
  });
}

export function useUpsertPlan() {
  return usePlanMutation(upsertPlan);
}

export function useDeletePlan() {
  return usePlanMutation(deletePlan);
}
