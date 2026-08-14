# Decisions

The choices worth recording: what was decided, what it costs, and what would
change it. Newest last.

---

## 1 · Months are strings, not Dates

**Decision.** `"YYYY-MM"` everywhere it crosses a boundary — URL, API, CSV,
component props. Conversion to `@db.Date` happens only in
`domain/helpers/period.ts`, in UTC.

**Why.** A `Date` is a point in time and carries a zone. `"2026-01"` built with
local-time constructors in UTC−5 is `2026-01-01T05:00Z`; read back off a DATE
column it becomes `2025-12-31`. Keeping the string whole removes the entire bug
class rather than fixing instances of it.

**Cost.** String comparison for ordering (fine — the format sorts
lexicographically) and two modules that overlap on `isMonth`/`monthsBetween`.

**Guarded by.** The unit suite runs in `America/New_York`, not UTC. Every one of
those tests passes trivially in UTC; the bug only exists west of Greenwich.

---

## 2 · Missing actuals count as 0

**Decision.** A plan with nothing logged reads `−plan / −100%`, not a blank. The
cell shows **—** and the row carries `hasActual: false`.

**Why.** The brief allows either. Blanking Actual, Variance and Variance % makes
the column totals stop reconciling with the rows above them, and makes the chart
non-additive. A forgotten entry should be loud.

**Cost.** A reader could mistake "nothing logged" for "logged as zero" — which is
what the dash and `hasActual` exist to prevent.

---

## 3 · A plan of zero gives a null percentage

**Decision.** `variancePct: null`, rendered **N/A** with an explanatory tooltip.
The amount is still reported.

**Why.** There is no denominator. `Infinity` renders as "∞%"; `0` reads as
"exactly on plan", the opposite of what happened. Null is the only honest answer.

**Cost.** Every consumer must handle a nullable number — enforced by the type.

---

## 4 · Locking granularity is the month

**Decision.** `PeriodLock` is unique on `[userId, periodMonth]`. A quarter is
three locks.

**Why.** A coarser lock makes it impossible to reopen one bad month without
reopening the two either side.

**Cost.** Closing a quarter is three clicks. A "lock quarter" button would fix
that without changing the model.

---

## 5 · Categories archive, never delete

**Decision.** No `DELETE` endpoint. `archivedAt` hides the category from pickers.

**Why.** Plans and actuals reference it `onDelete: Restrict`, so a delete is
either refused or takes history with it. A report of last quarter that silently
loses a line is worse than a list with one greyed entry.

**Cost.** A typo'd category is permanent clutter. Renaming covers most of it.

---

## 6 · The lock is enforced in the service, not the route

**Decision.** `LockService.assertOpen` is called by every plan and actual write,
inside the service. The UI's disabled inputs are a courtesy.

**Why.** The brief asks specifically that the API reject edits rather than the UI
hide buttons. Putting the check in the service means a second caller — an import,
a seed script, a future endpoint — cannot skip it by not knowing it exists.

**Subtlety.** Delete and edit read the month off the **stored row**, not the
request; and moving an entry checks **both** months. Checking only the request's
month would let a closed month be emptied by moving its rows out.

---

## 7 · next-auth owns the session; `AuthService` owns the rules

**Decision.** next-auth v4, JWT strategy, **no adapter**. The credentials
provider's `authorize` and the Google `signIn` callback both delegate to the
existing `AuthService`.

**Why.** Sign-in previously verified the password correctly and set no cookie, so
a "successful" sign-in left the caller with no session and the route guard
bounced them straight back. An adapter would have made next-auth own the user and
account tables, which this schema already models with its own naming and its own
linking rules. Without one it touches the database not at all.

**Cost.** next-auth answers a rejected sign-in with `?error=<one string>`, not
the `{ message, error }` envelope. So `authorize` throws the error **class name**
and `authError()` rebuilds the wording client-side. The messages now live on the
client.

**Considered and rejected.** Minting the cookie ourselves with `jose` and
dropping next-auth entirely — cleaner for this codebase, which already has its
own DI, error envelope and query client, but it means hand-rolling the Google
OAuth exchange. Reconsider if next-auth v4 becomes a problem on Next 16.

---

## 8 · `ReportRun.categoryId` is `""`, not `null`

**Decision.** The "every categories" sentinel is an empty string.

**Why.** **Postgres treats NULLs as distinct in a unique index.** A nullable
column would have allowed unlimited duplicate "all categories" runs under the
`@@unique([userId, fromMonth, toMonth, categoryId])` constraint meant to prevent
exactly that. Prisma also refuses `null` in a compound-unique selector, so the
upsert could not address the row.

**Cost.** A sentinel is less expressive than null and needs a comment. It has one.

---

## 9 · Reports are queued and stored

**Decision.** `GET /api/client/report` returns a stored run when current,
otherwise claims one and enqueues. A Vercel Queue consumer computes and persists.

**Why.** Cost scales with the range — ten years is 120 months across every
category — and a user should not hold an HTTP connection open for it.

**Cost.** The client contract gains a pending state and a poll, and there is a
whole materialised layer (`ReportRun`, `ReportRow`, `ReportMonth`) to keep
consistent. For the dataset this app will realistically see, computing per
request would have been simpler and could not go stale.

**What forced two follow-on decisions.**

- **The GET is idempotent.** The first cut claimed a run whenever nothing was
  fresh, so the client's 2-second poll would have enqueued a message every 2
  seconds. It now leaves a job already in flight alone.
- **A stale run is never served.** A variance figure one write behind is a wrong
  number wearing the authority of a right one.

---

## 10 · Staleness is one counter per user

**Decision.** `User.dataVersion` increments on every write that can move a
number. A run stores the version it computed against.

**Why.** One integer compare instead of scanning plans, actuals and locks to
decide whether a report is behind.

**Cost.** Coarse. An actual logged in January invalidates a report covering last
year. Working out which ranges a write touches means scanning every run;
recomputing an unwanted report is currently cheaper than that bookkeeping. The
trade reverses once reports are large or numerous.

---

## 11 · The CSV header is required and read by name

**Decision.** Exactly `month`, `category`, `amount` — any order, case-insensitive,
no extras. A bad header refuses the whole file.

**Why.** A positional parser silently accepts `category,month,amount` and loads
every row with the two swapped; the first symptom is a report full of categories
named "2026-01". Reading by name makes that impossible.

**Cost.** A file without a header is rejected. Sniffing was the earlier behaviour
and was replaced deliberately.

**Rows are different.** Forty rows with two bad ones lands thirty-eight and
reports the two. A bad header means every row is wrong, which is why it is the one
whole-file refusal.

---

## 12 · `csv-parse` over a hand-rolled splitter

**Decision.** Replaced ~30 lines of character-by-character state machine with
`csv-parse`.

**Why.** Not line count. A hand-rolled splitter must break the file on newlines
before it can split on commas, which silently corrupts a quoted note containing a
line break — a limitation the old code documented rather than fixed. Parsing the
document as a document also makes reported line numbers truthful, rather than a
record index wearing a line number's clothes.

**Verified.** A record spanning lines 4–5 reports the next row as line 6.

---

## 13 · The chart palette was re-stepped, not reused

**Decision.** Separate `--mark-*` tokens for chart fills, distinct from the
`--favorable`/`--unfavorable` badge tokens.

**Why.** The badge steps sit at nearly identical lightness (0.56 vs 0.575), which
measures **ΔE 5.6 under deuteranopia simulation** — a full collapse. A red bar
and a green bar would be indistinguishable to a deuteranope. Lightness is the
axis deuteranopia preserves, so the chart pair was pushed apart on it and
validated in both themes.

**Also.** The chart is diverging around a zero baseline, so **position** carries
the answer and colour is redundant reinforcement rather than the only channel.

**Cost.** Two palettes to keep in step. The badge tokens are correct for their own
job and were left alone.

---

## 14 · The queue consumer sits outside `/api/client`

**Decision.** `/api/queues/report`, not `/api/client/queues/report`.

**Why.** `/api/client/*` means "session-authenticated browser endpoint guarded by
`Auth()`". The worker carries no cookie and is authorised by the callback
signature, so grouping it there put a route with no session check behind a prefix
implying one.

**Cost.** The topic string is now load-bearing in two files — `queue.ts` and
`vercel.json`. Changing one alone stops delivery silently, so both carry a
comment saying so.

---

## 15 · `lib/utils` for formatting, `domain/helpers` for the server

**Decision.** `month.ts` and `variance.ts` live in `src/lib/utils`. Everything in
`src/domain/helpers` is `server-only`.

**Why.** These two are formatting and picker mechanics — labels, `addMonths` for
the arrows, quarter presets, `formatCurrency`. Nothing on the server imports
either. Briefly moving them into `domain/helpers` put client-only code in the
server layer and created a directory where adding `import "server-only"` for
consistency would have broken every screen.

**Cost.** The plan-of-0 rule is stated twice — here, and as `pct()` inside
`ReportService`. Keeping them in step is manual.

**Guarded by.** `variance.test.ts` and `report-service.test.ts` assert the same
brief figures against the two implementations independently, so a drift turns one
suite red while the other stays green.

---

## 16 · d3 computes, React renders

**Decision.** `d3-scale`, `d3-shape` and `d3-array` for the maths. **No
`d3-selection`, no `d3-transition`.** React owns every node.

**Why.** Three things are genuinely hard to hand-roll and easy to get subtly
wrong:

- **`curveMonotoneX` cannot overshoot.** A Catmull-Rom or cardinal spline bulges
  between points, and an overshoot on a spend chart draws a month that costs
  more than any month cost. Monotone interpolation is bounded by the data it
  joins.
- **`.nice()` and `.ticks()`** put axis labels on round numbers when the domain
  is 19,431–24,908.
- **`area().y0().y1()`** gives the plan-against-actual band directly.

The DOM half of d3 is the part that fights React — two libraries reconciling the
same nodes — and none of the above needs it.

**Cost.** 29.3 kB minified, 11.0 kB gzipped, measured with esbuild over exactly
these imports. A full charting library was the alternative and is roughly an
order of magnitude larger before it is themed.

**Considered and rejected.** Recharts and Chart.js. Both would have replaced the
existing chart wholesale and neither takes the design tokens without a fight.

---

## 17 · Two charts, two baseline rules

**Decision.** The trend chart's y axis does **not** start at zero. The variance
bar chart's does.

**Why.** A line encodes position and slope, so a truncated axis reads
accurately. A bar encodes magnitude as length from a baseline, so moving that
baseline rescales every bar into a lie.

Zeroing the trend axis would flatten a $200 variance against a $20,000 plan into
nothing — which is the one thing the chart exists to show. Not zeroing the bar
axis would make a $500 saving and a $500 overspend draw different lengths.

**Also.** The bar domain is made symmetric around zero, so the two directions
stay comparable when one month is an outlier.

**Cost.** Two rules to remember, and the trend axis has to be read rather than
eyeballed. The axis labels carry real values for exactly that reason.

---

## 18 · Category colours avoid the semantic hues

**Decision.** Category chips draw from `--cat-1`…`--cat-6`, confined to hues
195–330. Assigned by hashing the category **id**.

**Why.** Emerald 162, rose 22 and amber 65 already mean favorable, unfavorable
and locked. A category tinted emerald reads as "under plan" before its name is
read. Hashing the id rather than the name means renaming does not repaint it —
a colour that changes cannot be learned.

**Cost.** Six slots, so categories collide past six. Collision is cosmetic: the
name is always beside the chip and the chip is `aria-hidden`.

**Guarded by.** Lightness is set per hue rather than shared — cyan and teal are
light enough that a common step lands near 3.5:1. Each value is the lightest
step that still clears 4.8:1 as text on its own 12% chip; all twelve
combinations were measured in both themes.

---

## 19 · The chart's month stepper is buttons

**Decision.** Selecting a month on the chart is two real `<button>`s beside the
readout. Not arrow keys on the plot.

**Why.** The first cut put `tabIndex` and a key handler on the plot container
with `role="img"`. That is a non-interactive element carrying interactive
behaviour, and the affordance was invisible enough that the placeholder text had
to announce it — which is the tell that nobody would find it. Touch users had no
way to step through months at all.

**Cost.** Two more controls on screen. The readout is `aria-live`, so the figures
are announced as the selection moves either way.

**Also.** The plot itself is `aria-hidden`; the numbers reach assistive tech
through a screen-reader data table of the plotted months, which is the honest
non-visual equivalent of a chart rather than a label describing one.

---

## 20 · Report history is one entry per range, not per generation

**Decision.** `GET /api/client/report/runs` returns the stored runs as
summaries. Regenerating a range updates its entry rather than adding a second.

**Why.** It is not a design choice so much as a consequence of one already made.
`ReportRun` is unique on `[userId, fromMonth, toMonth, categoryId]` — decision 9,
the constraint that makes the GET idempotent and the client's 2-second poll safe.
There is nowhere in the model for a second run of the same range to live.

**Cost.** No audit trail. "Q1 was generated four times, here is each" is
unanswerable, and would need a separate append-only table. Nothing asks for it
today, and adding one would mean either dropping the uniqueness that makes
polling cheap or maintaining two records of the same event.

**Consequence for the UI.** The list answers "what have I looked at", so it is
drawn as coverage — bars on a shared timeline, positioned and sized by the
months each run spans. Overlap and gaps are the information a set of intervals
actually carries, and a column of date strings discards it.

**Selecting an entry sets the range and filter; it does not fetch.** The report
query is already keyed on exactly those parameters, so the run arrives through
the path that was always there — no second way to load a report, and re-picking
the range you are on is a no-op rather than a refetch.
