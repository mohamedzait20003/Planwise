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

---

## 21 · Repositories return models, not rows

**Decision.** Every repository read and write hands back a model. `Decimal` to
`number` and `@db.Date` to `"YYYY-MM"` happen there, once. `wire.ts` keeps
existing but only reshapes a model into the wire type.

**Why.** The two conversions were being repeated at every call site — `compute`
alone did `toNumber(plan.amount)` and `dateToMonth(plan.periodMonth)` per row,
and the month conversion has a UTC trap in it that is silent when you get it
wrong. Moving both to the boundary makes the number of places that can get it
wrong equal to the number of models, not the number of queries.

It also settled a duplication the codebase already had. Models existed and were
used for `User`; the four in `budgetModel.ts` were imported by nothing while
`wire.ts` did the same conversions on raw rows. Two layers were claiming the
same job and only one was doing it.

**Three shapes stay raw, on purpose.** `sumInRange` is a `groupBy` — the sum of
many actuals is not an actual, and a model would have to invent an id and a note
for it. `isLocked` returns a boolean, because the question is whether a row
exists. Counts from `createMany` are counts.

**Cost.** Repositories are wordier — a `findMany` becomes a `findMany` plus a
`.map`. And a model is a class, so a test stub has to construct one rather than
hand over a literal, which is what turned four lock-enforcement tests red until
their stubs were updated.

**That cost is also the guard.** The services read `existing.month`; a
row-shaped literal supplies `undefined`, and `assertOpen(userId, undefined)`
would pass every lock check silently. The type now refuses it, and the mutation
check still confirms the tests fail when the rule is removed.

**Every table gets a model, including the two that never leave the server.**
`PasswordReset` and `EmailVerification` were initially skipped on the grounds
that no caller sees one — `TokenRepository` returns a raw token or a `userId`
and deletes the row on read. They were added anyway, because a model earns its
place by owning a rule rather than by being serialized: "a token is dead once
`expiresAt` passes" was written inline at both consume sites, and `isExpired`
gives it one home. `tokenHash` is excluded from their DTOs so that nothing can
later hand out the lookup key for a live token by default.

---

## 22 · Actuals are soft-deleted, and restore is lock-checked

**Decision.** `Actual.deletedAt` replaces the hard delete. Every read filters on
it. Restoring is its own endpoint and passes the same `assertOpen` the delete
did.

**Why the earlier reasoning was wrong.** This was listed as not planned, on the
grounds that an actual is an entry rather than a record of record. That holds
right up until a month can be locked. A closed month has to be able to account
for what it contained, and a hard delete removes the evidence — the API refuses
to *edit* a locked month while a delete could empty it and leave nothing behind.

**Restore is the half that is easy to miss.** Putting an entry back changes what
a month totals just as surely as removing it, so a lock that guarded only the
delete would exist in one direction. `lock-enforcement.test.ts` asserts both,
and the mutation check confirms removing either guard turns a test red.

**Cost.** Every read of `actuals` now carries `deletedAt: null`, and forgetting
it in one place would let a deleted entry keep contributing to a report. The
index leads with the column so the common read stays a single scan.

---

## 23 · Timezones answer "which month is now", and nothing else

**Decision.** A browser-stored IANA zone decides which month the present moment
falls in. It never touches a stored month.

**Why this does not reopen decision 1.** That decision made months zone-free
strings so `"2026-01"` could not become December on the way through a `Date`.
Still true, and `timezone.test.ts` asserts it directly: `quarterOf` and
`monthsBetween` produce identical answers whatever zone asked. The zone is
consulted at exactly one boundary — turning *now* into a month — which is a
question the string format never answered and a real one for someone reporting
on a business in another country.

**Cost.** A screen holding a month in state has to *derive* it rather than seed
state with it, or the value captured before the preference rehydrates is the one
it keeps. Two screens were changed for that reason.

---

## 24 · A component test layer, scoped to promises rather than markup

**Decision.** jsdom and Testing Library, in a separate Vitest project from the
domain suite.

**Why the objection was reasonable and still wrong.** The argument against was
that such a layer asserts what components say rather than what users need. That
is a real failure mode, so the scope is narrow: every test names a promise a
user relies on — Escape abandons an edit, holding a stepper saves once, a
segmented control is one tab stop with arrows inside it — and every query is by
role and accessible name, so a restyle cannot break one and a semantic
regression cannot pass one.

**It paid for itself immediately.** `MoneyInput` was **committing the edit that
Escape was supposed to discard**: `blur()` dispatches synchronously, so the
handler ran before the state update meant to tell it to abandon. And a
`Segmented` option with a count announced itself as "Active12". Neither is
reachable from the domain suite, and neither is what an end-to-end test is for.

**Cost.** Four dev dependencies and a second Vitest project. The projects are
split so the domain suite keeps running in Node — a DOM there would be slower
and would let a domain test quietly depend on a browser global.

---

## 25 · The admin console sees counts, never amounts

**Decision.** No `/api/admin/*` endpoint returns another user's categories,
targets, entries or report figures. What an operator gets about an account is a
footprint — how many of each thing exists, and when the last entry landed.

**Why.** Requirement 1.3 is that a user sees and modifies only their own data.
Every other part of the app honours it structurally: `userId` is the first
argument of every repository method and lands in the `WHERE` clause. An admin
console is the one screen where that guarantee has to be upheld by choice
instead, because the whole point of the screen is to look at other people's
accounts.

So the boundary is drawn where it can be audited. `toAdminUser` in
`domain/helpers/wire.ts` lists its fields out by hand rather than spreading a
model, which means a column added to `User` next month lands on the model and
stops there — rather than arriving on an operator's screen because nobody
remembered to exclude it. `UserFootprint` is counts only, and there is no
endpoint that would return an amount even if the UI asked for one.

**What this costs.** Support questions of the form "why does this user's report
look wrong?" cannot be answered from the console. That is the intended trade:
the answer to that question is to ask the user, and a console that could answer
it is a console that can read everyone's finances.

**What it is not.** Not encryption, and not a claim that an operator cannot get
at the data — anyone with database access has it. It removes the *casual* path,
which is the one that gets used.

---

## 26 · `AdminRepository` is the one repository not scoped by `userId`

**Decision.** Platform-wide aggregates live in their own repository rather than
as `countAll()` methods on `CategoryRepository`, `PlanRepository` and the rest.

**Why.** Every other repository method takes `userId` as its first argument, and
that uniformity is load-bearing: it is what makes ownership a property of the
query rather than of the caller remembering to filter. Adding an unscoped
`countAll()` beside `list(userId)` would put a method that ignores ownership one
autocomplete away from every method that enforces it, on a class whose whole
contract is that it enforces it.

Keeping the unscoped reads in one file means they are one file to audit, and
they are reachable only through `AdminService`, which is reachable only through
`Auth("ADMIN")`.

**Cost.** Cross-table reads that a scoped repository could have answered now
live somewhere else, so "count categories" has two homes depending on whether it
is one user's or everyone's. That is the point, and the file header says so.

---

## 27 · The last-admin check counts after the write, not before

**Decision.** `AdminService.updateUser` applies a role change and *then* asks
whether any admin is left, throwing to roll the transaction back if none is.

**Why not before, which is how this is normally written.** Because before the
write it is unreachable code that reads like a guard. `Auth("ADMIN")` means the
actor holds the role; the self-demotion rule means the target is somebody else;
so a demotion always starts from at least two admins and a "refuse when the
count is one" check can never fire. It would have looked like protection, passed
a test written to match it, and protected nothing.

Counting afterwards states the invariant that is actually true — *this change
must not leave zero admins* — which is a different question with a different
answer.

**What it catches.** Overlapping transactions, where two admins demote each
other and the second to commit sees the role gone from both. And any future
caller not behind `Auth("ADMIN")`: a script, a job, a support tool.

**What it does not.** It is not a lock. At Read Committed a genuine tie can
still slip through; closing that needs `SELECT … FOR UPDATE` over the admin rows
or serializable isolation, and neither is worth its cost against a console with
two operators. The rule that does the real work in the single-request case is
the self-demotion refusal, which is why both exist.

**Asserted in** `tests/unit/admin-service.test.ts`, where the two rules are
checked differently on purpose: self-demotion asserts `setRole` was never
called, and the last-admin rule asserts the method threw — because throwing is
what rolls the write back.

---

## 28 · Seeding data and granting the console are two commands

**Decision.** `npm run seed` loads the brief's worked example and creates no
admin. `npm run seed:admin` grants the console and creates nothing else.

**Why.** They are different acts with different blast radii. One writes sample
rows into an account nobody minds; the other hands somebody the run of every
account on the platform. Bundled, every environment that wanted the demo
figures — a shared staging box, a reviewer's clone, CI — also got an operator
account whose password is published in the README. Splitting them makes granting
access something a person has to ask for by name.

It also matches how the two are actually used. Sample data is re-seeded freely
while developing; access is granted once and then left alone.

**`ADMIN_EMAIL` and `ADMIN_PASSWORD` override the defaults**, because the
defaults are in a public README and a password in a public README is a password
everybody has. The script says so on stdout when it is using them.

**An existing email is promoted, never re-passworded.** The common case is a
colleague who already signed up, and `update` carrying a password would silently
overwrite their credentials with this script's defaults — an account takeover
performed by a convenience feature. So `update` carries the role and nothing
else, which also makes this the documented way back in if the last admin is ever
demoted.

**Cost.** Two commands to remember instead of one, and a fresh clone that runs
only the first one reaches a console it cannot enter. The README lists them
together and the main seed's last line points at the other, which is the cheapest
version of that reminder.

---

## 29 · The generated Prisma client emits `.ts` on its own imports

**Decision.** `importFileExtension = "ts"` on the `prisma-client` generator,
`.ts` on the seed scripts' import of it, and `allowImportingTsExtensions` in
`tsconfig.json`.

**Why.** Without it the seeds could not run — and had never run. The generated
client's internal imports (`./enums`, `./internal/class`) were extensionless.
Next resolves that through Turbopack and `tsc` resolves it through
`moduleResolution: "bundler"`, so nothing in the normal workflow noticed. But
`prisma.config.ts` runs the seed as bare `node scripts/seed.ts`, and raw Node
ESM resolves specifiers literally: it threw `ERR_MODULE_NOT_FOUND` on `./enums`
before reaching a query.

The failure was invisible for exactly the reason it was worth fixing. Typecheck,
lint, build and the whole test suite all passed — none of them runs the seed —
while the README advertised it as the fastest way to see the app working.

**Why not run the seed through a bundler instead.** `tsx` or `ts-node` would
have worked and is one more dependency plus a second module resolver in the
project. Node 24 already strips types natively, which is why
`prisma.config.ts` invokes plain `node`; the only thing missing was that Node
wants the extension spelled out. Spelling it out is smaller than adding a
toolchain to avoid spelling it out.

**Cost.** The generated output changes app-wide, and `allowImportingTsExtensions`
permits `.ts` specifiers anywhere in the project — a style the rest of the code
does not use and should not start using. Both seeds, typecheck, lint, the build
and the full suite were run against the change.
