import { baseApi } from "@/lib/api/baseApi";
import type { ApiEnvelope, PeriodLock } from "@/lib/api/types";

/**
 * Period locks.
 *
 * Granularity is the month — the finest the data model supports. Closing a
 * quarter is three calls, which is deliberate: a coarser lock would make it
 * impossible to reopen a single bad month.
 */

export type LockPeriodInput = {
  month: string;
  note?: string;
};

export async function getLocks(): Promise<ApiEnvelope<PeriodLock[]>> {
  const res = await baseApi.get<ApiEnvelope<PeriodLock[]>>("/locks");
  return res.data;
}

export async function lockPeriod(
  input: LockPeriodInput
): Promise<ApiEnvelope<PeriodLock>> {
  const res = await baseApi.post<ApiEnvelope<PeriodLock>>("/locks", input);
  return res.data;
}

export async function unlockPeriod(
  month: string
): Promise<ApiEnvelope<undefined>> {
  const res = await baseApi.delete<ApiEnvelope<undefined>>(`/locks/${month}`);
  return res.data;
}
