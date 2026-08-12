import { describe, expect, it } from "vitest";

import {
  addMonths,
  currentMonth,
  isMonth,
  lastMonths,
  monthLong,
  monthShort,
  monthsBetween,
  quarterOf,
  toMonth,
  yearOf,
} from "@/lib/utils/month";

/**
 * The client-side month helpers.
 *
 * A separate module from `domain/helpers/period` on purpose — this one never
 * touches a Date column and works in the user's own zone, which is right for a
 * picker labelled "this quarter". The two are tested apart so a change to one
 * cannot quietly be justified by the other.
 */
describe("addMonths", () => {
  it("steps forward and back within a year", () => {
    expect(addMonths("2026-05", 1)).toBe("2026-06");
    expect(addMonths("2026-05", -1)).toBe("2026-04");
  });

  it("rolls the year over in both directions", () => {
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
  });

  it("handles multi-year jumps", () => {
    expect(addMonths("2026-03", 24)).toBe("2028-03");
    expect(addMonths("2026-03", -15)).toBe("2024-12");
  });

  it("does not overflow off a 31-day month", () => {
    // Built on day 1 rather than today's date: 31 January plus one month is not
    // a date, and `Date` silently rolls it into March.
    expect(addMonths("2026-01", 1)).toBe("2026-02");
  });
});

describe("quarterOf", () => {
  it.each([
    ["2026-01", "2026-01", "2026-03"],
    ["2026-02", "2026-01", "2026-03"],
    ["2026-03", "2026-01", "2026-03"],
    ["2026-04", "2026-04", "2026-06"],
    ["2026-11", "2026-10", "2026-12"],
  ])("puts %s in %s..%s", (month, from, to) => {
    expect(quarterOf(month)).toEqual({ from, to });
  });

  it("matches the brief's Q1 2026 example", () => {
    expect(quarterOf("2026-02")).toEqual({ from: "2026-01", to: "2026-03" });
  });
});

describe("yearOf", () => {
  it("spans January to December", () => {
    expect(yearOf("2026-07")).toEqual({ from: "2026-01", to: "2026-12" });
  });
});

describe("lastMonths", () => {
  it("is inclusive of the anchor", () => {
    // Six months ending in June starts in January, not December.
    expect(lastMonths("2026-06", 6)).toEqual({ from: "2026-01", to: "2026-06" });
  });

  it("crosses a year boundary", () => {
    expect(lastMonths("2026-02", 4)).toEqual({ from: "2025-11", to: "2026-02" });
  });
});

describe("labels", () => {
  it("formats long and short forms", () => {
    expect(monthLong("2026-01")).toBe("January 2026");
    expect(monthShort("2026-01")).toBe("Jan 2026");
  });

  it("passes a malformed value straight through rather than showing NaN", () => {
    expect(monthLong("nonsense")).toBe("nonsense");
  });
});

describe("toMonth and currentMonth", () => {
  it("reads a local Date as its own month", () => {
    expect(toMonth(new Date(2026, 1, 15))).toBe("2026-02");
  });

  it("produces a value the rest of the module accepts", () => {
    const now = currentMonth();

    expect(isMonth(now)).toBe(true);
    expect(monthsBetween(now, now)).toEqual([now]);
  });
});
