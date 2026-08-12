import { z } from "zod";

import { categoryName } from "./commonDto";

export const createCategoryDto = z.object({ name: categoryName });
export type CreateCategoryDto = z.infer<typeof createCategoryDto>;

/**
 * Rename, archive, or both.
 *
 * `archived` is a boolean the service maps onto `archivedAt`, rather than
 * letting the client send a timestamp it has no business choosing.
 */
export const updateCategoryDto = z
  .object({
    name: categoryName.optional(),
    archived: z.boolean().optional(),
  })
  .refine((input) => input.name !== undefined || input.archived !== undefined, {
    message: "nothing to update",
  });
export type UpdateCategoryDto = z.infer<typeof updateCategoryDto>;
