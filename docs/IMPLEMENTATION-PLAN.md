# Implementation plan

What was built, in what order, and what remains. Written from the actual commit
history rather than an intended plan.

---

## Approach

Built in horizontal layers, bottom-up, each one complete before the next started:

```
schema → domain (repositories, services) → API → client data layer → screens
```

Bottom-up because the product rules — variance, the two edge cases, lock
enforcement — are what the brief grades, and they belong in the layer furthest
from the framework. A screen built first would have pulled them upward into
components, where they cannot be tested without a browser.

The visible cost: for a stretch the client data layer existed against endpoints
that did not, and the screens rendered error states. That was accepted
deliberately and flagged at the time.

## What was built

### 1 · Foundation

Prisma schema for the whole domain — users, categories, plans, actuals, period
locks — with the composite foreign keys and the ownership columns in place from
the start. Decorator layer: `Endpoint`/`Auth`/`Body`/`Require`,
`@Service`/`@Transactional` with `AsyncLocalStorage`, `@Repository` with Prisma
error translation.

### 2 · Auth domain

`AuthService` with timing-safe credential comparison, single-use hashed
verification and reset tokens, and the Google linking rule that refuses to link
into an unverified local account. Mailables over Gmail SMTP with a
non-escaping Handlebars environment.

### 3 · Auth screens

Five pages on a shared `AuthShell`. Enumeration-safe wording on forget-password.
Email verification guarded against React's double-mount, which would otherwise
flip a verified account to "expired".

### 4 · Session

**Where a real defect was found.** Sign-in verified the password and set no
cookie, so a "successful" sign-in left the caller with no session and `proxy.ts`
bounced them back to the form. Nothing worked end to end.

Fixed by wiring next-auth as the session layer with `AuthService` behind it, and
deleting `/api/auth/sign-in` and `/api/auth/google-sign` — the latter was also
exploitable, taking `providerAccountId` and `Email` from the request body with
nothing proving Google issued them.

### 5 · Client screens

Six screens, shared components, and the variance chart. The chart palette was
validated for colour-vision deficiency and re-stepped; checking the geometry
against the brief's own sample figures caught a label collision before it
rendered.

### 6 · API and report generation

DTOs, repositories, services and routes for categories, plans, actuals, locks and
the report. Lock enforcement threaded through every write. Report generation
moved onto a Vercel Queue with a materialised `ReportRun`.

### 7 · CI/CD

**Where a second real defect was found.** `generated/prisma` is gitignored, so
Vercel would have checked out a repo with no Prisma client and the build would
have failed on the first import. Fixed by adding `prisma generate` to both
`postinstall` and the build command — the latter because Vercel's dependency
cache can skip `postinstall` entirely.

### 8 · Tests

90 unit tests and 20 end-to-end. The aggregation is asserted against the brief's
figures with stubbed repositories, which is the first time those numbers were
verified rather than reasoned about.

### 9 · Interface pass

The screens rebuilt around information hierarchy rather than uniform tiles:
a report chart that reads two ways (plan-against-actual as lines with the gap
shaded by its sign, or the gap alone as diverging bars), a searchable category
grid, actuals as a two-column ledger, periods as a calendar year, and a landing
page whose hero backdrop is the product's one rule drawn at wall size.

`d3-scale`, `d3-shape` and `d3-array` were added for the maths only — 29.3 kB
min, 11.0 kB gzipped, measured. `d3-selection` and `d3-transition` are
deliberately absent so React keeps the DOM.

### 10 · Deployment and report history

Deployed. Then the gap that only shows once there is data in it: a report is
expensive to generate and there was no way back to one you had already run.
`GET /api/client/report/runs` lists the stored runs, drawn on the screen as a
shared timeline.

## What is not done

| | Why it matters | Effort |
|---|---|---|
| **No seed script** | Listed under deliverables. Still the fastest way to get a new environment to a demonstrable state. | ~2h |
| **No automated test touches Postgres** | Production exercises the queries by hand; CI still verifies them by types alone. | ~2h |
| **Lock enforcement untested** | The rule most likely to be probed; its test needs a database. | ~1h |
| **No session revocation** | A password reset does not invalidate an existing session. | ~2h |
| **Production branch undecided** | `deploy.yml` triggers on `main`; the work is on `feat/landing-redesign`, so releases are manual. | ~0 |

## The honest status

Every functional requirement in the brief is implemented, and the app is live at
**https://planwise-rouge.vercel.app**. Migrations have been applied to the
production database, categories and actuals have been created and imported, and
reports have been generated through the queue against real rows — so the claim
that used to sit here, that nothing had ever reached Postgres, no longer holds.

What is verified automatically:

- typecheck, lint and production build pass
- 90 unit tests, including the brief's exact figures through the real
  aggregation
- 20 end-to-end tests against a real browser and a real build

What is verified **by hand only**: everything that touches the database. The
happy path has been walked in production, but no test asserts it, so a
regression in lock enforcement or ownership scoping would not turn anything red.
That gap and a seed script are the same piece of work, and it is the top of
[ROADMAP.md](ROADMAP.md).
