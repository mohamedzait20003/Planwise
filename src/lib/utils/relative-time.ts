/**
 * "3m ago", "2h ago", "Aug 11, 2026, 12:41 AM".
 *
 * Elapsed time is floored at every step, never rounded. Rounding reports more
 * time than has actually passed — 91 minutes becomes "2h ago", which is a
 * statement about the future — and it lets a stamp 23h 40m old print "24h ago",
 * a bucket that should have rolled over into days.
 *
 * `now` is injectable so the boundaries can be asserted rather than waited for.
 */

const absolute = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Past a week the relative form stops helping and the date itself is shorter. */
const RELATIVE_LIMIT_DAYS = 7;

export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const then = new Date(iso);

  // A malformed timestamp would otherwise render "NaNm ago", which reads as a
  // rendering bug rather than as missing data.
  if (Number.isNaN(then.getTime())) return "unknown";

  const seconds = (now - then.getTime()) / 1000;

  // Also catches a stamp from the future. A server clock a few seconds ahead of
  // the browser is not news, and "in 4 seconds" would read as one.
  if (seconds < MINUTE) return "just now";

  const minutes = Math.floor(seconds / MINUTE);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(seconds / HOUR);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(seconds / DAY);
  if (days < RELATIVE_LIMIT_DAYS) return `${days}d ago`;

  return absolute.format(then);
}
