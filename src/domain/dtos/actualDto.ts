import { z } from "zod";

import { cuid, money, month, note } from "./commonDto";

/**
 * Actuals, unlike plans, are not unique per category and month.
 *
 * Several entries can share both — three invoices against Marketing in January
 * are three rows, and the report sums them. Collapsing them into one would lose
 * the notes, which is the only place the detail lives.
 */
export const createActualDto = z.object({
  categoryId: cuid,
  month,
  amount: money,
  note: note.nullish(),
});
export type CreateActualDto = z.infer<typeof createActualDto>;

export const updateActualDto = z
  .object({
    categoryId: cuid.optional(),
    month: month.optional(),
    amount: money.optional(),
    note: note.nullish(),
  })
  .refine((input) => Object.values(input).some((value) => value !== undefined), {
    message: "nothing to update",
  });
export type UpdateActualDto = z.infer<typeof updateActualDto>;

export const listActualsDto = z.object({
  month: month.optional(),
  categoryId: cuid.optional(),
});
export type ListActualsDto = z.infer<typeof listActualsDto>;
