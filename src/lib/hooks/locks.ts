"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getLocks, lockPeriod, unlockPeriod } from "@/lib/handlers/locks";
import { actualKeys, derivedKeys, lockKeys, planKeys } from "@/lib/api/keys";

export function useLocks() {
  return useQuery({
    queryKey: lockKeys.list(),
    queryFn: getLocks,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    select: (res) => res.data ?? [],
  });
}

/**
 * Locking or unlocking invalidates plans and actuals as well as the report.
 *
 * Not because their values changed — they did not — but because their
 * *editability* did. Without this the table keeps rendering enabled inputs for
 * a period the API will now reject, and the user discovers the lock by being
 * refused mid-edit.
 */
function useLockMutation<TInput, TResult>(
  mutationFn: (input: TInput) => Promise<TResult>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () => {
      for (const queryKey of [
        lockKeys.all,
        planKeys.all,
        actualKeys.all,
        ...derivedKeys,
      ]) {
        queryClient.invalidateQueries({ queryKey });
      }
    },
  });
}

export function useLockPeriod() {
  return useLockMutation(lockPeriod);
}

export function useUnlockPeriod() {
  return useLockMutation(unlockPeriod);
}
