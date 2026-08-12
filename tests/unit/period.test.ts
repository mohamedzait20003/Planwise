import { describe, expect, it } from "vitest";

import {
  dateToMonth,
  isMonth,
  monthToDate,
  monthsBetween,
  toNumber,
} from "@/domain/helpers/period";

/**
 * The "YYYY-MM" ↔ `@db.Date` boundary.
 *
 * The suite runs in America/New_York (see vitest.config.ts). That is the whole
 * point: every assertion below passes trivially in UTC, and the bug this guards
 * against only exists west of Greenwich.
 */
describe("monthToDate", () => {
  it("returns UTC midnight on the first, regardless of local zone", () => {
    expect(monthToDate("2026-01").toISOString()).toBe("2026-01-01T00:00:00.000Z");
  });

  it("does not slip into the previous month in a negative-offset zone", () => {
    // The failure mode: `new Date(2026, 0, 1)` in UTC−5 is 2026-01-01T05:00Z,
    // and the reverse trip off a DATE column lands on 2025-12-31.
    const date = monthToDate("2026-01");

    expect(date.getUTCFullYear()).toBe(2026);
    expect(date.getUTCMonth()).toBe(0);
    expect(date.getUTCDate()).toBe(1);
  });
});

describe("dateToMonth", () => {
  it("round-trips every month of a year", () => {
    for (let month = 1; month <= 12; month++) {
      const key = `2026-${String(month).padStart(2, "0")}`;
      expect(dateToMonth(monthToDate(key))).toBe(key);
    }
  });

  it("reads a Postgres DATE as the month it stores", () => {
    expect(dateToMonth(new Date("2026-02-01T00:00:00.000Z"))).toBe("2026-02");
  });
});

describe("isMonth", () => {
  it.each(["2026-01", "2026-12", "1999-09"])("accepts %s", (value) => {
    expect(isMonth(value)).toBe(true);
  });

  it.each([
    ["2026-13", "month 13"],
    ["2026-00", "month 0"],
    ["2026-1", "unpadded month"],
    ["26-01", "two-digit year"],
    ["2026-01-01", "a full date"],
    ["", "empty"],
    ["not-a-month", "prose"],
  ])("rejects %s (%s)", (value) => {
    expect(isMonth(value)).toBe(false);
  });
});

describe("monthsBetween", () => {
  it("is inclusive of both ends", () => {
    expect(monthsBetween("2026-01", "2026-03")).toEqual([
      "2026-01",
      "2026-02",
      "2026-03",
    ]);
  });

  it("returns the single month when both ends match", () => {
    expect(monthsBetween("2026-05", "2026-05")).toEqual(["2026-05"]);
  });

  it("crosses a year boundary", () => {
    expect(monthsBetween("2025-11", "2026-02")).toEqual([
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
    ]);
  });

  it("returns nothing for an inverted range rather than looping", () => {
    expect(monthsBetween("2026-03", "2026-01")).toEqual([]);
  });
});

describe("toNumber", () => {
  it("converts a Decimal-like value without losing cents", () => {
    // Prisma hands back a Decimal, which is not JSON-serializable. Only its
    // `toString` is relied on, which is what the signature takes.
    expect(toNumber({ toString: () => "20500.00" })).toBe(20_500);
    expect(toNumber({ toString: () => "4800.55" })).toBe(4_800.55);
  });
});
