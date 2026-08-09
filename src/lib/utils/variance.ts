/**
 * Variance rules for the plan-vs-actual report.
 *
 * Sign convention: variance = actual − plan, so a NEGATIVE variance means the
 * category came in UNDER plan (favorable) and a positive one means it went OVER
 * (unfavorable).
 *
 * Two edge cases the report has to survive:
 *
 * 1. Missing actual — treated as 0. A $5,000 plan with nothing logged reads as
 *    −5,000 / −100%, not as a blank row. Chosen over showing "—" so that totals
 *    and charts stay additive and a forgotten entry is loud rather than quiet.
 * 2. Plan = 0 — variance % has no denominator, so it is `null` and the UI shows
 *    "N/A". Never Infinity, never NaN.
 */

export type VarianceResult = {
  /** actual − plan. Negative = under plan. */
  variance: number;
  /** Percentage, or null when plan is 0 (undefined ratio). */
  variancePct: number | null;
};

export function computeVariance(
  plan: number,
  actual: number | null | undefined
): VarianceResult {
  const actualValue = actual ?? 0;
  const variance = actualValue - plan;

  return {
    variance,
    variancePct: plan === 0 ? null : (variance / plan) * 100,
  };
}

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function formatCurrency(value: number) {
  return currency.format(value);
}

/** Signed money, e.g. "+$500" / "−$200". Uses a real minus sign. */
export function formatSignedCurrency(value: number) {
  if (value === 0) return currency.format(0);
  const sign = value > 0 ? "+" : "−";
  return `${sign}${currency.format(Math.abs(value))}`;
}

/** Signed percentage to 2dp, or "N/A" when the plan was zero. */
export function formatVariancePct(pct: number | null) {
  if (pct === null) return "N/A";
  const sign = pct > 0 ? "+" : pct < 0 ? "−" : "";
  return `${sign}${Math.abs(pct).toFixed(2)}%`;
}
