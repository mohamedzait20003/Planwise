# Technical specifications

Stack, contracts, environment, conventions.

---

## Stack

| Layer | Choice | Version |
|---|---|---|
| Framework | Next.js (App Router, Turbopack) | 16.3.0 |
| Runtime | Node | 24.x |
| Language | TypeScript, strict | 5.x |
| UI | React, Tailwind CSS v4, Base UI, framer-motion | 19.2 |
| Charts | `d3-scale`, `d3-shape`, `d3-array` — maths only | 4.0 / 3.2 / 3.2 |
| Server state | TanStack Query | 5.x |
| HTTP | axios, `withCredentials` | 1.19 |
| Database | Postgres via Prisma + `@prisma/adapter-pg` | 7.9.1 |
| Auth | next-auth v4, JWT strategy | 4.24 |
| Validation | Zod | 4.x |
| Queue | `@vercel/queue` | 0.4 |
| CSV | `csv-parse` | 7.0.2 |
| Mail | nodemailer + Handlebars | |
| Unit tests | Vitest | 4.x |
| E2E | Playwright | 1.62 |

## Environment

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | **yes** | Postgres connection |
| `NEXTAUTH_SECRET` | **yes** | Signs and encrypts the session cookie |
| `NEXTAUTH_URL` | in production | Callback origin; also decides the cookie's `__Secure-` prefix |
| `GOOGLE_CLIENT_ID` / `_SECRET` | no | Google sign-in; button fails on click without them |
| `EMAIL_USER` / `EMAIL_PASSWORD` / `MAIL_FROM` | no | SMTP; unset logs mail instead of sending |
| `REPORTS_INLINE` | no | `"1"` computes reports on the request instead of queueing |

`NEXTAUTH_URL` starting `https://` switches next-auth to the `__Secure-` cookie
prefix. Pointing it at `http://` in production ships sessions over plaintext.

## API

Two prefixes, and the split is the point.

- **`/api/auth/*`** and **`/api/client/*`** — browser endpoints. Session cookie,
  guarded by `Auth()`.
- **`/api/queues/*`** — machine-to-machine. No cookie; authorised by the queue
  callback signature.

### Envelope

Every JSON response:

```jsonc
{ "message": "Report", "data": { /* omitted when there is none */ } }
```

Failures add a stable class name to branch on:

```jsonc
{ "message": "2026-01 is locked and cannot be modified", "error": "PeriodLockedError" }
```

`message` is written for a human and safe to show. `error` stays stable when the
wording changes. Unexpected errors are logged and replaced with a generic
message — the raw text can carry SQL, file paths or column names.

### Status codes

| Code | Meaning |
|---|---|
| 200 / 201 | Success |
| 202 | Report is being generated; poll |
| 204 | Success, no body |
| 400 | Validation — `ValidationError`, `BadRequestError`, `InvalidTokenError` |
| 401 | Not signed in, or bad credentials |
| 403 | Signed in but not permitted; unverified email |
| 404 | Not found, **or not yours** |
| 409 | Uniqueness or reference conflict |
| **423** | **Period locked** |
| 500 | Our bug |

404-for-not-yours is deliberate: a 403 would confirm the row exists.

### Endpoints

| Method | Path | Notes |
|---|---|---|
| `POST` | `/api/auth/sign-up` | |
| `POST` | `/api/auth/email-verify` | single-use token |
| `POST` | `/api/auth/pass-forget` | answers identically whether or not the account exists |
| `POST` | `/api/auth/pass-reset` | |
| `*` | `/api/auth/[...nextauth]` | session, csrf, signin, signout, Google callback |
| `GET` `POST` | `/api/client/categories` | list, create |
| `PATCH` | `/api/client/categories/[id]` | rename, archive — no delete |
| `GET` `PUT` | `/api/client/plans` | list, upsert — PUT because it is idempotent |
| `DELETE` | `/api/client/plans/[id]` | |
| `GET` `POST` | `/api/client/actuals` | `?month=&categoryId=` |
| `PATCH` `DELETE` | `/api/client/actuals/[id]` | |
| `POST` | `/api/client/actuals/import` | multipart, ≤2 MB, ≤5,000 rows |
| `GET` `POST` | `/api/client/locks` | list, lock |
| `DELETE` | `/api/client/locks/[month]` | unlock |
| `GET` | `/api/client/report` | `?from=&to=&categoryId=` — 200 or 202 |
| `GET` | `/api/client/report/runs` | `?limit=` — stored runs as summaries, newest first |
| `GET` | `/api/client/report/export` | CSV, computed on demand |
| `POST` | `/api/queues/report` | queue consumer |

### The report contract

`GET /api/client/report` answers one of three ways, and the client branches on
the payload rather than the code — a failure returns 200, because the request
was fine and the answer is "this run failed".

```jsonc
// 200 — a stored run exists and matches the current data version
{ "message": "Report", "data": { "from": "...", "rows": [...], "byMonth": [...], "totals": {...} } }

// 202 — queued
{ "message": "Report is being generated", "data": { "status": "pending", "runId": "..." } }

// 200 — failed against unchanged data; retrying would fail identically
{ "message": "…", "data": { "status": "failed", "runId": "...", "error": "…" } }
```

**The endpoint is idempotent**, which is what makes polling it safe: a job
already in flight against current data is left alone rather than claimed again.
Without that, a 2-second poll would enqueue a message every 2 seconds.

## Wire types

Money crosses as a `number` — Prisma `Decimal` is not JSON-serializable and
would arrive as an object the client cannot add up. Months cross as `"YYYY-MM"`
strings, never `Date`.

Both conversions happen in the **model layer**, `src/domain/models/`, which is
what every repository returns. `src/domain/helpers/wire.ts` then maps a model to
the wire type — picking the fields the client is promised and rendering
timestamps as ISO strings, with no arithmetic left to do.

The wire types are imported from `src/lib/api/types.ts` rather than redeclared,
so the compiler catches drift between the two sides. Keeping models and wire
types separate is what stops a new column widening the API by accident: it lands
on the model, and the wire type has to be changed on purpose.

## Conventions

**Months are strings.** `"YYYY-MM"` end to end. A `Date` is a point in time and
carries a zone, so `"2026-01"` parsed in UTC and rendered in UTC−5 becomes
December. Conversion to `@db.Date` happens only in `domain/helpers/period.ts`,
in UTC.

**Money is `Decimal(14,2)`.** Sums round to cents at every step, so a variance
column cannot show `−0.30000000000000004`.

**Ownership is a parameter.** Every repository method takes `userId` first and
puts it in the `WHERE`. Reads use `findFirst`, not `findUnique`, so an id alone
is never enough.

**Errors are classes.** Services throw `PeriodLockedError`, not a status code.
The controller maps class to status in one table, so a service never has to know
it is behind HTTP.

## Layout

```
src/
  app/
    api/{auth,client,queues}/   route handlers
    auth/                       sign-in, sign-up, verify, reset, callback
    client/                     dashboard, categories, plans, actuals, report, periods
  components/
    {auth,client,common,landing,ui}/
    charts/                     scales, axes, marks — no data fetching, no domain
  domain/
    decorators/                 Endpoint, Auth, Body, Require; Service, Transactional; Repository
    dtos/                       Zod schemas — the DTO *is* the schema
    helpers/                    period.ts, wire.ts   (server-only)
    infra/                      prisma, mail, auth, queue
    models/ repositories/ services/
  lib/
    api/                        axios instance, ApiError, wire types, query keys
    handlers/                   request functions, React-free
    hooks/                      TanStack Query wrappers
    utils/                      month.ts, variance.ts, category-color.ts,
                                use-chart-size.ts, utils.ts   (client-side)
  proxy.ts                      route guard (Next 16's middleware)
prisma/
  schema.prisma
  migrations/                   generated; `migrate deploy` applies them
scripts/
  seed.ts                       the brief's worked example, as a demo account
tests/{unit,e2e}/
```

`domain/helpers` is server-only; `lib/utils` is client-side. Nothing crosses.
`month.ts` and `period.ts` overlap on `isMonth`/`monthsBetween` deliberately —
one works in the user's zone for pickers, the other in UTC for the database.

`components/charts` knows scales and marks and nothing else — it takes points
and a width and returns SVG. The composition that knows what a report is
(`components/client/variance-chart.tsx`) sits a layer up, which is why the two
are not in the same folder.

## CI/CD

`ci.yml` on every push and PR: install → lint → typecheck → unit → build → e2e.
`deploy.yml` on `main`: verify, then `prisma migrate deploy`, then
`vercel build` and `vercel deploy --prebuilt --prod`.

Built in CI rather than on Vercel so the artifact that ships is the one that
passed. Migrations run before the code — correct for additive changes, wrong for
destructive ones, which need expand-then-contract across two deploys.

**`git.deploymentEnabled` is `false` in `vercel.json`**, which is what makes that
true. Linking the project connects the GitHub repository, and Vercel's own Git
integration would then deploy on every push — a second production deployment per
push, built from source rather than from the verified artifact, and without
`prisma migrate deploy` having run first. Turning it off leaves `deploy.yml` as
the only path to production.

The consequence is that **nothing deploys without the workflow**. A green build
on a branch produces no preview URL; use `vercel` from the CLI for one.
