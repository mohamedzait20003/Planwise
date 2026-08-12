import { z } from "zod";

import { month, note } from "./commonDto";

/**
 * Locking granularity is the month.
 *
 * `PeriodLock` is unique on `[userId, periodMonth]`, so closing a quarter is
 * three calls. Deliberate: a coarser lock would make it impossible to reopen a
 * single bad month without reopening the two either side of it.
 */
export const lockPeriodDto = z.object({
  month,
  note: note.nullish(),
});
export type LockPeriodDto = z.infer<typeof lockPeriodDto>;

/** The month comes from the path on unlock, so it is validated on its own. */
export const unlockPeriodDto = z.object({ month });
export type UnlockPeriodDto = z.infer<typeof unlockPeriodDto>;
