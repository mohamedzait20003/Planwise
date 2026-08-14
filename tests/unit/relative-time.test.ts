import { describe, expect, it } from "vitest";

import { formatRelativeTime } from "@/lib/utils/relative-time";

/**
 * Elapsed-time formatting.
 *
 * Every case here failed against the previous implementation, which rounded
 * instead of flooring. Rounding elapsed time is not a cosmetic choice: it
 * reports more time than has passed, so a report generated 91 minutes ago
 * claimed to be two hours old, and one 23h 40m old printed "24h ago" — a
 * bucket that should have become a day.
 *
 * `now` is fixed rather than read from the clock, so the boundaries are
 * assertions rather than a race.
 */

const NOW = Date.parse("2026-08-14T12:00:00.000Z");

/** A timestamp `seconds` before NOW. */
const ago = (seconds: number) =>
  new Date(NOW - seconds * 1000).toISOString();

describe("under a minute", () => {
  it.each([0, 1, 31, 59])("%i seconds reads as just now", (seconds) => {
    expect(formatRelativeTime(ago(seconds), NOW)).toBe("just now");
  });

  it("does not round 31 seconds up into a minute", () => {
    expect(formatRelativeTime(ago(31), NOW)).not.toBe("1m ago");
  });
});

describe("minutes and hours floor, never round", () => {
  it.each([
    [60, "1m ago"],
    [119, "1m ago"], // 1m59s is still one minute elapsed
    [59 * 60, "59m ago"],
    [60 * 60, "1h ago"],
    [91 * 60, "1h ago"], // the case that used to print "2h ago"
    [(23 * 60 + 59) * 60, "23h ago"],
  ])("%i seconds reads as %s", (seconds, expected) => {
    expect(formatRelativeTime(ago(seconds), NOW)).toBe(expected);
  });

  it("never prints 24h, which is a day", () => {
    // 23h 40m — the old implementation rounded this to "24h ago".
    expect(formatRelativeTime(ago((23 * 60 + 40) * 60), NOW)).toBe("23h ago");
  });
});

describe("days", () => {
  it.each([
    [24 * 3600, "1d ago"],
    [47 * 3600, "1d ago"],
    [3 * 24 * 3600, "3d ago"],
    [6 * 24 * 3600, "6d ago"],
  ])("%i seconds reads as %s", (seconds, expected) => {
    expect(formatRelativeTime(ago(seconds), NOW)).toBe(expected);
  });

  it("falls back to an absolute stamp past a week", () => {
    const result = formatRelativeTime(ago(8 * 24 * 3600), NOW);

    expect(result).not.toMatch(/ago$/);
    // Formatted in the runtime zone, which the suite pins to America/New_York.
    expect(result).toContain("2026");
  });
});

describe("inputs that should not render as a bug", () => {
  it("treats a future stamp as now rather than counting up", () => {
    // Clock skew between a server and a browser is ordinary; "in 30 seconds"
    // would read as a defect.
    expect(formatRelativeTime(ago(-30), NOW)).toBe("just now");
  });

  it("says unknown rather than NaN for a malformed timestamp", () => {
    expect(formatRelativeTime("not-a-date", NOW)).toBe("unknown");
    expect(formatRelativeTime("", NOW)).toBe("unknown");
  });
});
