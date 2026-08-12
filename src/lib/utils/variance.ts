/**
 * Variance rules for the plan-vs-actual report.
 *
 * Sign convention: variance = actual − plan, so a NEGATIVE variance means the
 * category came in UNDER plan (favorable) and a positive one means it went OVER.
 *
 * Two edge cases this has to survive:
 *
 *   Missing actual — treated as 0. A $5,000 plan with nothing logged reads
 *   −5,000 / −100%, not a blank row, so totals and charts stay additive and a
 *   forgotten entry is loud rather than quiet.
 *
 *   Plan = 0 — variance % has no denominator, so it is `null` and the UI shows
 *   "N/A". Never Infinity, never NaN.
 *
 * Client-side, which is why it lives here and not in `domain/`. The report
 * table, the chart and the stat tiles all format through it; the server never
 * imports it.
 *
 * That means the plan-of-0 rule is stated twice — here, and again as `pct()`
 * inside `ReportService`, which computes the stored report. They agree today.
 * Keeping them in step is a manual job, so a change to one is a prompt to check
 * the other; `tests/unit/variance.test.ts` and `tests/unit/report-service.test.ts`
 * assert the same brief figures on each side and will disagree loudly if they
 * ever drift.
 */

/** "+", a real minus sign, or nothing at all for exactly zero. */
function signOf(value: number): string {
  if (value > 0) return "+";
  return value < 0 ? "−" : "";
}

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
  const variance = (actual ?? 0) - plan;

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
  const sign = signOf(pct);
  return `${sign}${Math.abs(pct).toFixed(2)}%`;
}
