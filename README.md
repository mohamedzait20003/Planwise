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
npm test               # vitest — 90 unit tests
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
npm test           # 90 unit tests — variance, months, aggregation, CSV
npm run test:e2e   # 20 end-to-end tests — public pages and the route guard
```

The unit suite runs in **America/New_York**, not UTC. Month handling is where
this app is most likely to break, and the bug only appears west of Greenwich: a
`DATE` read as local time turns `2026-01-01` into `2025-12-31`. Running in UTC
would let those tests pass while the bug shipped.

No test has yet run against a real database — see
[ROADMAP](docs/ROADMAP.md).
