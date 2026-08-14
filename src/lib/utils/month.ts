/**
 * Month helpers, for the browser.
 *
 * Labels, picker arithmetic and the range presets — the month equivalents of
 * `variance.ts`'s formatters. Client-side, and it lives here rather than in
 * `domain/` for that reason: nothing on the server imports it.
 *
 * It overlaps `domain/helpers/period.ts` on `isMonth` and `monthsBetween`, and
 * that is not an accident waiting to be tidied. This module works in the user's
 * own zone, which is right for a picker labelled "this quarter"; `period.ts`
 * works in UTC because it converts to a DATE column. Merging them means one of
 * the two starts lying about which zone it is in.
 *
 * The app's unit of time is a calendar month, written "YYYY-MM" everywhere it
 * crosses a boundary — URL, API, CSV. It is deliberately a string and not a
 * Date: a Date is a point in time and carries a timezone, so "2026-01" parsed
 * as a Date in UTC and rendered in UTC−5 becomes December. Keeping the string
 * whole until the database (which stores a `@db.Date`) removes that class of
 * bug entirely.
 */

/** "2026-01" and nothing else — not "2026-1", not "2026-13". */
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isMonth(value: string): boolean {
  return MONTH_PATTERN.test(value);
}

/** Splits into numbers. Assumes `isMonth` already passed. */
function parts(month: string): [year: number, monthIndex: number] {
  const [year, monthNumber] = month.split("-").map(Number);
  return [year, monthNumber - 1];
}

export function toMonth(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  return `${year}-${month}`;
}

export function currentMonth(): string {
  return toMonth(new Date());
}

/** Shifts by whole months; `delta` may be negative. Rolls the year over. */
export function addMonths(month: string, delta: number): string {
  const [year, monthIndex] = parts(month);
  // Day 1 rather than today's date: the 31st plus one month is not a date, and
  // Date silently rolls it into the month after the one asked for.
  return toMonth(new Date(year, monthIndex + delta, 1));
}

/** Every month from `from` to `to`, inclusive. Empty when the range is inverted. */
export function monthsBetween(from: string, to: string): string[] {
  if (!isMonth(from) || !isMonth(to) || from > to) return [];

  const out: string[] = [];
  for (let month = from; month <= to; month = addMonths(month, 1)) {
    out.push(month);
    // A malformed input that somehow slips past the guard must not spin here.
    if (out.length > 600) break;
  }
  return out;
}

const LONG = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });
const SHORT = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" });
const TERSE = new Intl.DateTimeFormat("en-US", { month: "short" });

function asDate(month: string): Date {
  const [year, monthIndex] = parts(month);
  return new Date(year, monthIndex, 1);
}

/** "January 2026" */
export function monthLong(month: string): string {
  return isMonth(month) ? LONG.format(asDate(month)) : month;
}

/** "Jan 2026" */
export function monthShort(month: string): string {
  return isMonth(month) ? SHORT.format(asDate(month)) : month;
}

/** "Jan" — for axis ticks, where the year is already established. */
export function monthTerse(month: string): string {
  return isMonth(month) ? TERSE.format(asDate(month)) : month;
}

export type MonthRange = { from: string; to: string };

/** The quarter containing `month`, e.g. "2026-02" → 2026-01..2026-03. */
export function quarterOf(month: string): MonthRange {
  const [year, monthIndex] = parts(month);
  const firstMonth = Math.floor(monthIndex / 3) * 3;
  return {
    from: toMonth(new Date(year, firstMonth, 1)),
    to: toMonth(new Date(year, firstMonth + 2, 1)),
  };
}

export function yearOf(month: string): MonthRange {
  const [year] = parts(month);
  return { from: `${year}-01`, to: `${year}-12` };
}

/** The `n` months ending at `month`, inclusive. */
export function lastMonths(month: string, n: number): MonthRange {
  return { from: addMonths(month, -(n - 1)), to: month };
}

/* fiscal years */

/**
 * The month a fiscal year opens on, 1–12.
 *
 * `1` is January, which makes the fiscal year the calendar year — so the
 * calendar behaviour is not a special case in any of the functions below, it is
 * what they already do when nobody has changed the setting.
 */
export const CALENDAR_YEAR_START = 1;

/**
 * Which fiscal year a month falls in, named for the calendar year the fiscal
 * year *opens* in.
 *
 * April start: 2026-04 through 2027-03 are all FY2026. That convention is not
 * universal — US federal practice names a fiscal year for the year it closes —
 * so nothing in the UI shows "FY2026" without the span beside it.
 */
export function fiscalYearNumber(month: string, start: number): number {
  const [year, monthIndex] = parts(month);
  return monthIndex >= start - 1 ? year : year - 1;
}

/** The twelve months of the fiscal year containing `month`. */
export function fiscalYearOf(month: string, start: number): MonthRange {
  const from = `${fiscalYearNumber(month, start)}-${String(start).padStart(2, "0")}`;
  return { from, to: addMonths(from, 11) };
}

/**
 * The fiscal quarter containing `month`, counting from the fiscal year's own
 * opening month rather than from January.
 */
export function fiscalQuarterOf(month: string, start: number): MonthRange {
  const { from: yearStart } = fiscalYearOf(month, start);

  // How far into the fiscal year this month sits, 0–11.
  const [year, monthIndex] = parts(month);
  const [fyYear, fyMonthIndex] = parts(yearStart);
  const offset = (year - fyYear) * 12 + (monthIndex - fyMonthIndex);

  const quarterStart = addMonths(yearStart, Math.floor(offset / 3) * 3);
  return { from: quarterStart, to: addMonths(quarterStart, 2) };
}

/** 1–4 — which quarter of its fiscal year `month` falls in. */
export function fiscalQuarterNumber(month: string, start: number): number {
  const { from } = fiscalYearOf(month, start);
  const [year, monthIndex] = parts(month);
  const [fyYear, fyMonthIndex] = parts(from);

  return Math.floor(((year - fyYear) * 12 + (monthIndex - fyMonthIndex)) / 3) + 1;
}

/**
 * "2026" on a calendar year, "FY2026" otherwise.
 *
 * The prefix only appears when it carries information: with a January start
 * the fiscal year *is* the calendar year, and labelling it "FY" would imply a
 * distinction that is not there.
 */
export function fiscalYearLabel(month: string, start: number): string {
  const year = fiscalYearNumber(month, start);
  return start === CALENDAR_YEAR_START ? `${year}` : `FY${year}`;
}
