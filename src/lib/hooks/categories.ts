"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createCategory,
  getCategories,
  updateCategory,
} from "@/lib/handlers/categories";
import { categoryKeys, derivedKeys } from "@/lib/api/keys";
import type { UpdateCategoryInput } from "@/lib/api/types";

/**
 * Categories change rarely and are read by every other screen, so they are
 * cached generously — the picker on the actuals form should not refetch each
 * time it opens.
 */
export function useCategories() {
  return useQuery({
    queryKey: categoryKeys.list(),
    queryFn: getCategories,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    select: (res) => res.data ?? [],
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...input }: UpdateCategoryInput & { id: string }) =>
      updateCategory(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
      // Renaming or archiving changes what the report shows, so its cached
      // rows cannot survive this.
      for (const queryKey of derivedKeys) {
        queryClient.invalidateQueries({ queryKey });
      }
    },
  });
}
