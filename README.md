# Planwise

Set a monthly spending target per category, log what you actually spent, and see
the variance the moment it happens. Close a month and the numbers stop moving.

**Live URL:** **https://planwise-rouge.vercel.app**

---

## Prerequisites

| | |
|---|---|
| Node | 24.x (the version CI runs; 20+ should work) |
| Postgres | 14+ — local, Supabase, or Neon |
| Vercel CLI | only for the report queue — `npm i -g vercel` |

## Setup

```bash
git clone https://github.com/mohamedzait20003/Planwise.git
cd Planwise
npm install                 # postinstall runs `prisma generate`

cp .env.example .env        # then fill DATABASE_URL and NEXTAUTH_SECRET
openssl rand -base64 32     # a value for NEXTAUTH_SECRET

npx prisma migrate deploy   # create the schema
npm run dev                 # http://localhost:3000
```

Every variable is documented inline in [`.env.example`](.env.example). Only two
are required to boot: `DATABASE_URL` and `NEXTAUTH_SECRET`.

**Mail is optional.** Leave `GMAIL_*` unset and verification and reset emails are
written to the server log with the links intact — which is how you complete a
sign-up locally without a Google account.

**Google sign-in is optional.** Leave `GOOGLE_CLIENT_*` unset and the button
renders but fails on click; email and password work regardless.

**Reports are optional to queue.** Set `REPORTS_INLINE="1"` to compute them on
the request instead. See [Running the report queue](#running-the-report-queue).

## Commands

```bash
npm run dev            # dev server
npm run build          # prisma generate && next build
npm run lint           # eslint
npm run typecheck      # tsc --noEmit
npm test               # vitest — 134 unit tests
npm run test:e2e       # playwright — 20 end-to-end tests
npm run migrate:deploy # apply migrations
```

## Running the report queue

Reports are generated off a [Vercel Queue](https://vercel.com/docs/queues)
rather than on the request, because the cost scales with the range. The topic is
bound to `src/app/api/queues/report/route.ts` in [`vercel.json`](vercel.json).

```bash
vercel login
vercel link
npm run dev            # the SDK discovers the handler from vercel.json
```

In development the SDK sends to the real queue service and then invokes the
handler in-process, so `npm run dev` exercises the same path as production. It
needs a linked project and network. Working offline, set `REPORTS_INLINE="1"`.

## Deploying

Production ships from [`deploy.yml`](.github/workflows/deploy.yml) on push to
`main`: verify, apply migrations, then `vercel build` and
`vercel deploy --prebuilt`. Building in CI rather than on Vercel means the
artifact that ships is the one that passed.

Vercel's own Git integration is **off** — `"git": { "deploymentEnabled": false }`
in [`vercel.json`](vercel.json). Left on it would deploy on every push in
parallel with the workflow, from source rather than the verified artifact, and
without migrations having run first. The cost is that branch pushes no longer
produce preview URLs; get one on demand with `vercel`.

```bash
vercel login && vercel link       # writes .vercel/project.json
vercel env add DATABASE_URL       # and NEXTAUTH_SECRET, NEXTAUTH_URL
npm run migrate:deploy            # schema before code, always
vercel --prod
```

`.vercel/project.json` holds the `orgId` and `projectId` that
`VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` need as GitHub secrets.

---

## The answers the brief asks for

### How variance % is calculated when plan is zero

It isn't — it is `null`, and the UI renders **N/A**.

The ratio has no denominator, so any number would be a lie: `Infinity` renders
as "∞%", and `0` reads as "exactly on plan", which is the opposite of what
happened. The amount is still reported, so $500 spent against no target shows as
`+$500 · N/A`.

```
variance    = actual − plan          # negative = UNDER plan
variancePct = plan === 0 ? null : (variance / plan) × 100
```

Asserted in [`tests/unit/variance.test.ts`](tests/unit/variance.test.ts) and
again server-side in
[`tests/unit/report-service.test.ts`](tests/unit/report-service.test.ts).

### Locking behaviour and granularity

**Granularity is the month.** `PeriodLock` is unique on `[userId, periodMonth]`,
so closing a quarter is three locks. Deliberately: a coarser lock would make it
impossible to reopen one bad month without reopening the two either side.

A closed month makes its plans and actuals read-only. **The API is what enforces
this** — every write passes `LockService.assertOpen`, which throws
`PeriodLockedError` and answers **HTTP 423**. The disabled inputs and the padlock
pills are a courtesy; a request built by hand is refused just the same.

Three cases the enforcement covers that a naive check misses:

- **Delete and edit read the month off the stored row**, not the request, so a
  payload naming an open month cannot remove one from a closed month.
- **Moving an entry checks both months** — the one it leaves and the one it
  enters. Checking only the target would let a closed month be emptied.
- **CSV import** rejects rows in locked months per-row, and still lands the rest.

All three are asserted in
[`tests/unit/lock-enforcement.test.ts`](tests/unit/lock-enforcement.test.ts),
which also checks the repository was never called — so "refused" means nothing
was written, not that an error was reported afterwards.

### How missing actuals are displayed

**Summed as 0, shown as an em dash.**

A $5,000 plan with nothing logged reads `−$5,000 / −100.00%`, not a blank row.
Totals and the chart stay additive, and a forgotten entry is loud rather than
quiet. The `Actual` cell shows **—** so a reader can still tell "nothing was
logged" from "someone logged zero", and the row carries `hasActual: false` to
make that distinction survive the wire.

This is the brief's first option, chosen because the alternative — blanking
Actual, Variance and Variance % — makes the column totals stop reconciling with
the rows above them.

### Stretch goals

All three are implemented.

**Drill-down.** Clicking a category in the report opens the actual entries
behind that cell — amount, note and date per entry. The panel reads the *live*
ledger rather than the stored run, so if the two disagree it says so: the report
is a snapshot with its own `computedAt`, and a mismatch means it predates a
write. Quietly reconciling them would hide exactly the thing worth seeing.

**Fiscal year.** A start-month selector sits beside the range summary. Every
preset derives from it, so an April start gives Q1 = Apr–Jun and labels the year
`FY2026`. January is the default and is not a special case in the code — the
fiscal helpers reduce to the calendar ones, which
[`fiscal.test.ts`](tests/unit/fiscal.test.ts) asserts directly by comparing them
against `quarterOf` and `yearOf`.

The naming convention is the ambiguous part: `FY2026` here means the fiscal year
that *opens* in 2026, where US federal practice names one for the year it
closes. Nothing in the UI shows `FY2026` without the month span beside it.

The setting is stored in the browser, not on the account. It changes how a range
is labelled and cut, and no stored figure — so it did not warrant a column and a
migration. The trade: it does not follow you to another browser.

**Export CSV.** Covered under the report above.

### Indexing and querying at scale

The dataset here is small. What carries the load as it grows:

**Every index leads with `userId`.** `Actual [userId, periodMonth, categoryId]`
and `Plan [userId, periodMonth]` mean the report's range scan is a scoped range
read rather than a filtered table scan, and the same index serves both the scan
and the `groupBy` that aggregates it.

**Aggregation happens in Postgres, not JavaScript.** `sumInRange` uses `groupBy`
rather than fetching rows and reducing them in the service. A year of daily
entries is thousands of rows the report never needs individually — only their
sums per category and month.

**Reports are computed once and stored.** Cost scales with the range, so a
ten-year query does not hold an HTTP connection open; a run is materialised into
`ReportRun`/`ReportRow`/`ReportMonth` and read back on subsequent requests.
Freshness is one integer compare — `User.dataVersion` — rather than a scan of
plans and actuals to decide whether the stored answer still holds.

What I would add next, in order:

1. **Covering index** — `Actual (userId, periodMonth, categoryId) INCLUDE
   (amount)`, so the aggregate is answered from the index without touching the
   heap.
2. **Partial index** — `WHERE archivedAt IS NULL` on `Category`. Nearly every
   read wants only the active ones.
3. **Partition `Actual` by year** past tens of millions of rows. Every query
   already carries a month range, so pruning would be automatic.
4. **Keyset pagination** on the actuals list, which is currently unbounded per
   month. Fine at a few hundred entries, not at a few hundred thousand.

**The known inefficiency, stated plainly.** `dataVersion` is one counter per
user, so an actual logged in January marks *every* stored report stale, including
one covering last year. It is a single integer compare instead of working out
which ranges a write touches, and recomputing an unwanted report is currently
cheaper than that bookkeeping. The trade reverses once reports get large or
numerous, and the fix is to invalidate by overlapping range instead.

Fuller reasoning, including the schema itself, is in
[docs/DATA-MODEL.md](docs/DATA-MODEL.md#performance-at-scale).

---

## Assumptions and trade-offs

| Assumption | Consequence |
|---|---|
| One currency, USD, no conversion | Amounts are `Decimal(14,2)`; a multi-currency workspace needs a currency column and a rate table |
| Categories are archived, never deleted | Plans and actuals reference them `onDelete: Restrict`, so deleting would take history with it |
| A user's data is scoped by `userId` in every query | There is no row-level security behind it; a repository that forgets the scope is the failure mode |
| Reports are recomputed on any write | `User.dataVersion` invalidates coarsely — every stored report, not the affected ranges |
| Sessions are stateless JWTs | No revocation: a password reset does not sign out an existing session |

Fuller reasoning for each significant choice is in
[docs/DECISION.md](docs/DECISION.md).

## What I would improve before production

1. **Session revocation.** A `sessionVersion` column on `User`, checked in
   `Auth()`. Today a stolen token stays valid for its full 30 days and a
   password reset does not invalidate it.
2. **A seed script and DB-backed e2e.** The aggregation is unit-tested against
   the brief's figures, but no test has run against Postgres.
3. **Per-range report invalidation.** One counter per user means an actual
   logged in January invalidates a report covering last year.
4. **Rate limiting** on sign-in, sign-up and password reset.
5. **Structured logging and error tracking.** `console.error` in the endpoint
   wrapper is the whole of the observability story.
6. **Index review at scale** — see
   [docs/DATA-MODEL.md](docs/DATA-MODEL.md#performance-at-scale).

---

## Documentation

| Document | Answers |
|---|---|
| [PRODUCT-REQUIREMENTS](docs/PRODUCT-REQUIREMENTS.md) | What was asked for, and whether it is done |
| [PRODUCT-SPECIFICATIONS](docs/PRODUCT-SPECIFICATIONS.md) | What the product does, screen by screen |
| [TECHNICAL-SPECIFICATIONS](docs/TECHNICAL-SPECIFICATIONS.md) | Stack, API contract, environment |
| [ARCHITECTURE](docs/ARCHITECTURE.md) | How a request flows through the layers |
| [DATA-MODEL](docs/DATA-MODEL.md) | The schema and why it is shaped that way |
| [IMPLEMENTATION-PLAN](docs/IMPLEMENTATION-PLAN.md) | What was built, in what order, what remains |
| [DECISION](docs/DECISION.md) | The significant choices, with their trade-offs |
| [ROADMAP](docs/ROADMAP.md) | What comes next |

## Testing

```bash
npm test           # 134 unit tests
npm run test:e2e   # 20 end-to-end tests — public pages and the route guard
```

The three rules the brief grades are each asserted directly:

| Rule | Suite | What it proves |
|---|---|---|
| **Variance calculation** | [`variance.test.ts`](tests/unit/variance.test.ts) | The sign convention, the plan-of-zero null, and formatting — against the brief's own figures |
| **Aggregation** | [`report-service.test.ts`](tests/unit/report-service.test.ts) | The plan/actual join, both edge cases and the totals, through the real `compute` with repositories stubbed |
| **Lock enforcement** | [`lock-enforcement.test.ts`](tests/unit/lock-enforcement.test.ts) | Every write path refuses a closed month — including the two a naive check misses |
| **Fiscal years** | [`fiscal.test.ts`](tests/unit/fiscal.test.ts) | Shifted-origin date maths, both edges: the month before the year opens, and the quarter that crosses the new year |

Lock enforcement gets the most attention because it is the rule most easily
implemented wrongly in a way that still looks right. Checking the month named in
the *request* is the obvious approach and it is not enough, so the suite asserts
that **delete and edit read the month off the stored row**, and that **moving an
entry checks both months** — otherwise a closed month can be emptied one row at a
time by a caller who simply never names it. Each case also asserts the
repository was never called, so "refused" means nothing was written rather than
an error being reported after the fact.

Those tests need no database. Services take their repositories as constructor
parameters, and `@Transactional` joins an existing transaction rather than
opening one, so the real service bodies run against stubs.

The suite was checked by breaking the rule it guards: removing the stored-month
check from `ActualService.update` turns exactly the two relevant tests red, and
restoring it turns them green.

The unit suite runs in **America/New_York**, not UTC. Month handling is where
this app is most likely to break, and the bug only appears west of Greenwich: a
`DATE` read as local time turns `2026-01-01` into `2025-12-31`. Running in UTC
would let those tests pass while the bug shipped.

**What is not covered.** No automated test opens a Postgres connection, so
migrations, the ownership `WHERE` clauses and Prisma's own query generation are
verified by types and by hand, not by CI. A seeded database and the end-to-end
journey behind it are the top of [ROADMAP](docs/ROADMAP.md).
