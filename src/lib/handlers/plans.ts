import { baseApi } from "@/lib/api/baseApi";
import type { ApiEnvelope, Plan, UpsertPlanInput } from "@/lib/api/types";

export async function getPlans(month?: string): Promise<ApiEnvelope<Plan[]>> {
  const res = await baseApi.get<ApiEnvelope<Plan[]>>("/client/plans", {
    params: month ? { month } : undefined,
  });
  return res.data;
}

/**
 * Creates or updates the target for a category-month.
 *
 * One call rather than a create/update pair, because the database allows
 * exactly one plan per (user, category, month) — a separate create would be an
 * upsert that fails half the time.
 *
 * Answers 423 when the month is locked. That check is server-side; the UI
 * hiding the field is a courtesy, not the rule.
 */
export async function upsertPlan(
  input: UpsertPlanInput
): Promise<ApiEnvelope<Plan>> {
  const res = await baseApi.put<ApiEnvelope<Plan>>("/client/plans", input);
  return res.data;
}

export async function deletePlan(id: string): Promise<ApiEnvelope<undefined>> {
  const res = await baseApi.delete<ApiEnvelope<undefined>>(`/client/plans/${id}`);
  return res.data;
}
