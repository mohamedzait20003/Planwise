import "server-only";

/**
 * The boundary between "YYYY-MM" and the `@db.Date` columns.
 *
 * Every conversion here is UTC, and that is the whole point. `periodMonth` is a
 * DATE, so Postgres hands back midnight with no zone; construct that with the
 * local-time `Date` constructor on a machine west of Greenwich and January
 * becomes the previous December. `Date.UTC` and the `getUTC*` readers keep the
 * value the same number it went in as, on every host.
 */

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isMonth(value: string): boolean {
  return MONTH_PATTERN.test(value);
}

/** "2026-01" → 2026-01-01T00:00:00Z. Assumes the pattern already matched. */
export function monthToDate(month: string): Date {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber - 1, 1));
}

/** 2026-01-01T00:00:00Z → "2026-01". */
export function dateToMonth(date: Date): string {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * Every month from `from` to `to`, inclusive.
 *
 * The report needs this to emit a row for a month with no data at all — a plan
 * with nothing logged against it has to appear, or a forgotten entry silently
 * vanishes from the range instead of showing as fully under plan.
 */
export function monthsBetween(from: string, to: string): string[] {
  if (from > to) return [];

  const out: string[] = [];
  const end = monthToDate(to);

  for (
    let cursor = monthToDate(from);
    cursor <= end;
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1))
  ) {
    out.push(dateToMonth(cursor));
  }

  return out;
}

/**
 * Prisma `Decimal` → number, for the wire.
 *
 * Decimal is not JSON-serializable and would cross the boundary as an object
 * the client cannot do arithmetic on. Money in this app is bounded by
 * `Decimal(14, 2)`, comfortably inside the range a double represents exactly at
 * cent precision, so the conversion is lossless here — it would not be for a
 * schema with more scale, which is why it lives in one place.
 */
export function toNumber(value: { toString(): string }): number {
  return Number(value.toString());
}
