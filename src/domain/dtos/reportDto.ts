import { z } from "zod";

import { cuid, month } from "./commonDto";

/**
 * A report request.
 *
 * These three fields are also the run's identity — `ReportRun` is unique on
 * `[userId, fromMonth, toMonth, categoryId]` — so asking twice for the same
 * range reuses the run rather than queueing a second identical job.
 */
export const reportQueryDto = z
  .object({
    from: month,
    to: month,
    /** Omitted means every category. */
    categoryId: cuid.optional(),
  })
  .refine((query) => query.from <= query.to, {
    message: "the start month must not be after the end month",
    path: ["from"],
  })
  // A decade of months is 120 rows per category and a job nobody is waiting
  // for. Bounded here rather than in the worker, so the caller is told.
  .refine((query) => Number(query.to.slice(0, 4)) - Number(query.from.slice(0, 4)) <= 10, {
    message: "the range must span at most ten years",
    path: ["to"],
  });
export type ReportQueryDto = z.infer<typeof reportQueryDto>;

/**
 * The queue message.
 *
 * Carries the run id rather than the query: the run row already holds the
 * range, and re-deriving it from a payload that could disagree with the row is
 * how a worker ends up writing the wrong numbers under the right key.
 */
export const reportJobDto = z.object({
  runId: cuid,
  userId: cuid,
});
export type ReportJobDto = z.infer<typeof reportJobDto>;
