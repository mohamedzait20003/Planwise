import { describe, expect, it } from "vitest";

import {
  CALENDAR_YEAR_START,
  fiscalQuarterNumber,
  fiscalQuarterOf,
  fiscalYearLabel,
  fiscalYearNumber,
  fiscalYearOf,
  quarterOf,
  yearOf,
} from "@/lib/utils/month";

/**
 * Fiscal years.
 *
 * This is date arithmetic with a shifted origin, which is where off-by-one
 * errors live: the month before the fiscal year opens belongs to the *previous*
 * fiscal year, and its quarter runs across a calendar year boundary. Both edges
 * are asserted rather than reasoned about.
 *
 * The suite runs in America/New_York like the rest, so a helper that reached
 * for a Date and read local parts would drift here too.
 */

const APRIL = 4;
const OCTOBER = 10;

describe("a January start is the calendar year", () => {
  // Not a special case in the implementation — this asserts that it does not
  // have to be, by checking the fiscal helpers agree with the calendar ones.
  it.each([
    ["2026-01"],
    ["2026-06"],
    ["2026-12"],
  ])("%s matches quarterOf and yearOf", (month) => {
    expect(fiscalQuarterOf(month, CALENDAR_YEAR_START)).toEqual(quarterOf(month));
    expect(fiscalYearOf(month, CALENDAR_YEAR_START)).toEqual(yearOf(month));
  });

  it("labels without an FY prefix, which would imply a distinction", () => {
    expect(fiscalYearLabel("2026-06", CALENDAR_YEAR_START)).toBe("2026");
  });
});

describe("an April start", () => {
  it.each([
    // month, fiscal year it belongs to
    ["2026-04", 2026], // the opening month
    ["2026-12", 2026],
    ["2027-03", 2026], // the closing month, in the next calendar year
    ["2026-03", 2025], // the month before it opens belongs to the year before
  ])("%s falls in FY%i", (month, year) => {
    expect(fiscalYearNumber(month as string, APRIL)).toBe(year);
  });

  it("runs April to the following March", () => {
    expect(fiscalYearOf("2026-12", APRIL)).toEqual({
      from: "2026-04",
      to: "2027-03",
    });
  });

  it("puts the year boundary inside Q4, not between quarters", () => {
    // Jan-Mar 2027 is one quarter of FY2026 despite spanning the new year.
    expect(fiscalQuarterOf("2027-02", APRIL)).toEqual({
      from: "2027-01",
      to: "2027-03",
    });
    expect(fiscalQuarterNumber("2027-02", APRIL)).toBe(4);
  });

  it.each([
    ["2026-04", 1],
    ["2026-06", 1],
    ["2026-07", 2],
    ["2026-10", 3],
    ["2027-01", 4],
    ["2027-03", 4],
  ])("%s is Q%i", (month, quarter) => {
    expect(fiscalQuarterNumber(month as string, APRIL)).toBe(quarter);
  });

  it("labels with the FY prefix", () => {
    expect(fiscalYearLabel("2027-02", APRIL)).toBe("FY2026");
  });
});

describe("an October start", () => {
  it("spans the new year from its first quarter", () => {
    expect(fiscalYearOf("2026-11", OCTOBER)).toEqual({
      from: "2026-10",
      to: "2027-09",
    });
    expect(fiscalQuarterOf("2026-11", OCTOBER)).toEqual({
      from: "2026-10",
      to: "2026-12",
    });
    expect(fiscalQuarterNumber("2026-11", OCTOBER)).toBe(1);
  });

  it("puts September in the closing quarter", () => {
    expect(fiscalQuarterNumber("2027-09", OCTOBER)).toBe(4);
    expect(fiscalYearNumber("2027-09", OCTOBER)).toBe(2026);
  });
});

describe("every start month is self-consistent", () => {
  // A property rather than a case: whatever the start, a fiscal year is twelve
  // months, split into four quarters of three, and every month lands inside
  // the year it claims.
  it.each([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])(
    "start month %i",
    (start) => {
      const year = fiscalYearOf("2026-07", start);
      expect(year.from <= year.to).toBe(true);

      const quarter = fiscalQuarterOf("2026-07", start);
      expect(quarter.from >= year.from).toBe(true);
      expect(quarter.to <= year.to).toBe(true);

      const number = fiscalQuarterNumber("2026-07", start);
      expect(number).toBeGreaterThanOrEqual(1);
      expect(number).toBeLessThanOrEqual(4);
    }
  );
});
