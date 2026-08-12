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
  const sign = pct > 0 ? "+" : pct < 0 ? "−" : "";
  return `${sign}${Math.abs(pct).toFixed(2)}%`;
}
