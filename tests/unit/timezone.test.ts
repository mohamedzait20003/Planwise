import { describe, expect, it } from "vitest";

import {
  currentMonth,
  isTimeZone,
  monthIn,
  monthsBetween,
  quarterOf,
} from "@/lib/utils/month";

/**
 * Which month "now" falls in, read in a named zone.
 *
 * The whole risk of adding zones to this app is that they leak into stored
 * months, which are calendar months and must mean the same thing everywhere.
 * So these assert two things: that the zone changes the answer to "what month
 * is it" — the only question it should answer — and that it changes nothing
 * about a month string once one exists.
 *
 * The suite runs in America/New_York, so "local" below is UTC−4/−5.
 */

describe("the same instant is a different month in different zones", () => {
  // 1 Sept 02:00 UTC: already September in Auckland, still August in LA.
  const instant = new Date("2026-09-01T02:00:00.000Z");

  it.each([
    ["UTC", "2026-09"],
    ["Pacific/Auckland", "2026-09"],
    ["America/Los_Angeles", "2026-08"],
    ["America/New_York", "2026-08"],
    ["Asia/Dubai", "2026-09"],
  ])("%s reads %s", (zone, expected) => {
    expect(monthIn(instant, zone as string)).toBe(expected);
  });

  it("is the point of the feature: a boundary is not global", () => {
    expect(monthIn(instant, "Pacific/Auckland")).not.toBe(
      monthIn(instant, "America/Los_Angeles")
    );
  });
});

describe("month strings stay zone-free once they exist", () => {
  // The guarantee the string format was chosen for. A zone preference must not
  // reintroduce the bug it removes.
  it.each(["Pacific/Auckland", "America/Los_Angeles", "UTC"])(
    "quarterOf and monthsBetween ignore the zone (%s)",
    () => {
      expect(quarterOf("2026-02")).toEqual({ from: "2026-01", to: "2026-03" });
      expect(monthsBetween("2026-11", "2027-02")).toEqual([
        "2026-11",
        "2026-12",
        "2027-01",
        "2027-02",
      ]);
    }
  );

  it("a month is the same month whichever zone asked for it", () => {
    // monthIn takes an instant; the string it produces carries no zone with it.
    const august = monthIn(new Date("2026-08-15T12:00:00.000Z"), "Asia/Tokyo");
    expect(august).toBe("2026-08");
    expect(quarterOf(august)).toEqual({ from: "2026-07", to: "2026-09" });
  });
});

describe("currentMonth", () => {
  it("falls back to the host zone when none is given", () => {
    expect(currentMonth()).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
    expect(currentMonth(null)).toBe(currentMonth());
  });

  it("answers in the zone it is given", () => {
    expect(currentMonth("UTC")).toBe(monthIn(new Date(), "UTC"));
  });
});

describe("isTimeZone", () => {
  it.each(["UTC", "Europe/London", "Australia/Sydney"])("accepts %s", (zone) => {
    expect(isTimeZone(zone)).toBe(true);
  });

  it.each(["", "Mars/Olympus_Mons", "not a zone"])("rejects %s", (zone) => {
    // The store validates on the way in because the value round-trips through
    // localStorage: an unrecognised zone would make every Intl call downstream
    // throw, and it arrives from somewhere anyone can edit.
    expect(isTimeZone(zone)).toBe(false);
  });
});
