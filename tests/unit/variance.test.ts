import { describe, expect, it } from "vitest";

import {
  computeVariance,
  formatCurrency,
  formatSignedCurrency,
  formatVariancePct,
} from "@/lib/utils/variance";

/**
 * The variance rules, asserted against the brief's own worked example.
 *
 * These four rows are copied from the assignment table rather than invented, so
 * a change that breaks the agreed arithmetic fails here by name.
 */
describe("computeVariance", () => {
  it.each([
    // label, plan, actual, variance, variancePct
    ["2026-01 Marketing", 5_000, 4_800, -200, -4],
    ["2026-01 Payroll", 20_000, 20_500, 500, 2.5],
    ["2026-02 Marketing (nothing logged)", 5_000, null, -5_000, -100],
    ["2026-02 Payroll", 20_000, 19_800, -200, -1],
  ])("%s", (_label, plan, actual, variance, variancePct) => {
    expect(computeVariance(plan, actual)).toEqual({ variance, variancePct });
  });

  it("treats a missing actual as 0 rather than skipping the row", () => {
    // The documented choice. Undefined and null both mean "nothing logged", and
    // both have to land on the same number as an explicit zero, or totals stop
    // being additive.
    expect(computeVariance(5_000, null).variance).toBe(-5_000);
    expect(computeVariance(5_000, undefined).variance).toBe(-5_000);
    expect(computeVariance(5_000, 0).variance).toBe(-5_000);
  });

  describe("when the plan is 0", () => {
    it("has no percentage rather than Infinity or NaN", () => {
      // The denominator does not exist. Anything numeric here would be a lie —
      // Infinity renders as "∞%", and 0 would read as "exactly on plan".
      expect(computeVariance(0, 500).variancePct).toBeNull();
      expect(computeVariance(0, 0).variancePct).toBeNull();
    });

    it("still reports the amount spent", () => {
      expect(computeVariance(0, 500).variance).toBe(500);
    });
  });

  it("reports 0 variance when actual matches plan exactly", () => {
    expect(computeVariance(5_000, 5_000)).toEqual({ variance: 0, variancePct: 0 });
  });
});

describe("formatting", () => {
  it("formats plain money without a sign", () => {
    expect(formatCurrency(5_000)).toBe("$5,000");
  });

  it("uses a real minus sign, not a hyphen", () => {
    // U+2212. A hyphen next to a currency symbol reads as a dash rather than a
    // negative, which is exactly the wrong ambiguity in a variance column.
    expect(formatSignedCurrency(-200)).toBe("−$200");
    expect(formatSignedCurrency(500)).toBe("+$500");
  });

  it("shows zero unsigned", () => {
    expect(formatSignedCurrency(0)).toBe("$0");
  });

  it("renders a null percentage as N/A", () => {
    expect(formatVariancePct(null)).toBe("N/A");
  });

  it("formats percentages to two places with a sign", () => {
    expect(formatVariancePct(-4)).toBe("−4.00%");
    expect(formatVariancePct(2.5)).toBe("+2.50%");
    expect(formatVariancePct(0)).toBe("0.00%");
  });
});
