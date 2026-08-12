import { z } from "zod";

import { cuid, money, month } from "./commonDto";

/**
 * Upsert, not create.
 *
 * There is one plan per category per month — the schema says so with
 * `@@unique([userId, categoryId, periodMonth])` — so "set the target" and
 * "change the target" are the same request. A separate create would just be a
 * way to get a 409 on the second save.
 */
export const upsertPlanDto = z.object({
  categoryId: cuid,
  month,
  amount: money,
});
export type UpsertPlanDto = z.infer<typeof upsertPlanDto>;

/** Optional month filter on the list. */
export const listPlansDto = z.object({ month: month.optional() });
export type ListPlansDto = z.infer<typeof listPlansDto>;
