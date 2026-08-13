# Architecture

How a request moves through the system, and why the layers are drawn where they
are.

---

## Layers

```
browser
  page / component          "use client"
  hooks        (lib/hooks)  TanStack Query — cache, invalidation, polling
  handlers     (lib/handlers)  request functions, React-free
  axios        (lib/api)    one instance, withCredentials, ApiError interceptor
        │  HTTP
route handler (app/api)     Endpoint(Auth, Body, Require, handler)
  service     (domain/services)   business rules, @Transactional
  repository  (domain/repositories)  the only place Prisma is touched
  Prisma → Postgres
```

Each layer knows only the one below it. A component never imports a repository;
a service never learns it is behind HTTP.

## The endpoint pipeline

Route handlers are composed, not decorated. The original shape —
`@POST() @Response() function signUp() {}` — is a syntax error: TypeScript
rejects decorators on functions in both legacy and stage-3, because TC39 never
shipped them. Composition reads in the same top-to-bottom order:

```ts
export const POST = Endpoint<UpsertPlanDto, Deps>(
  Auth(),                                  // 401/403 before anything else runs
  Body(upsertPlanDto),                     // Zod in, typed ctx.body out
  Require({ plans: PlanServiceProvider }), // providers resolved onto ctx.deps
  async ({ user, body, deps }) => ({
    message: "Target saved",
    data: toPlan(await deps.plans.upsert(user!.id, body)),
  })
);
```

Steps enrich a context or throw to abort. The handler returns an envelope, a raw
`Response` (CSV export), or nothing for a 204.

**Error mapping is always on and cannot be opted out of.** An endpoint that
forgot it would answer a locked-period write with an opaque 500 and an empty
body. One table maps error class to status; a service throws
`PeriodLockedError` and never mentions 423.

**`Require` over module singletons.** A `Provider` can be overridden, so a test
swaps in a stub without touching the route or reaching for module mocking.
Resolution happens per request, so an override in a `beforeEach` is picked up
rather than baked in at import time. This is what lets
`tests/unit/report-service.test.ts` assert the whole aggregation with no
database.

## Transactions

`@Transactional()` runs the method inside `prisma.$transaction` and puts the
transaction client in an `AsyncLocalStorage`. Repositories call `db()`, which
returns that client when one is active and the global otherwise.

Two consequences worth knowing:

- A repository that imported `prisma` directly would **silently escape the
  transaction** and survive a rollback. `db()` is not a style preference.
- A `@Transactional` method calling another joins the existing transaction
  rather than opening a second connection whose writes escape the outer
  rollback.

## Authentication

next-auth v4, JWT strategy, no adapter — deliberately. An adapter would make
next-auth own the user and account tables, which this schema already models with
its own naming and its own linking rules. Without one it touches the database not
at all, and the `signIn` callback is where persistence happens, through the same
`AuthService` the endpoints use.

```
credentials → authorize() → signInDto → AuthService.signIn()
google      → signIn callback → googleSignDto → AuthService.signInWithGoogle()
                     ↓
              jwt callback: id + role onto the token
                     ↓
    ┌────────────────┼────────────────┐
 proxy.ts        currentUser()     useSession()
 token.role      token.id/role     session.user.role
```

The one cost: next-auth answers a rejected sign-in with `?error=<one string>`,
not the `{ message, error }` envelope. So `authorize` throws the **error class
name** and `authError()` rebuilds the wording client-side, producing an
`ApiError` so the form's `isUnverified` branch works against one shape whichever
transport failed.

## Route protection, in two places

| | `proxy.ts` (Edge) | `Auth()` (Node) |
|---|---|---|
| Guards | pages under `/client`, `/admin` | every `/api/client` route |
| On failure | redirect with `callbackUrl` | 401 or 403 JSON |
| Why | a redirect is useless to `fetch` | hiding a button proves nothing |

Both read the same JWT. The middleware is UX; the endpoint check is the
enforcement.

## Report generation

The one asynchronous path. Cost scales with the range — ten years is 120 months
across every category — so it does not hold an HTTP connection.

```
GET /api/client/report
  │
  ├─ stored run, current?  ──────────────► 200 with the report
  ├─ run in flight, current?  ───────────► 202 (leave it alone)
  ├─ run failed, data unchanged?  ───────► 200 { status: "failed" }
  └─ missing or stale
        claim run (upsert → PENDING)
        send("planwise-report", { runId, userId })
                                          ► 202 { status: "pending" }

POST /api/queues/report   ← Vercel Queues
  handleCallback → ReportService.fulfil() → ReportRun + rows + months
```

**Staleness is one integer compare.** Every write bumps `User.dataVersion`; a run
records the version it computed against. No scan of plans or actuals is needed to
know a report is behind.

**The GET is idempotent**, which is what makes the client's 2-second poll safe —
without it, each poll would queue another message and the report would never
settle.

Coarse invalidation is the accepted trade: one counter per user means an actual
logged in January invalidates a report covering last year. Working out which
ranges a write touches costs a scan of every run, and recomputing an unwanted
report is cheaper at this scale than the bookkeeping to avoid it.

## Client data layer

```
useReport(params) ──► getReport(params) ──► GET /api/client/report
   refetchInterval        outcomeOf()          ApiError interceptor
   while pending
```

Handlers are kept free of React so request logic is callable from a script or a
test without a query client. Hooks own caching and invalidation; query keys are
hierarchical so one mutation invalidates a whole branch:

```ts
invalidateQueries({ queryKey: reportKeys.all })  // every range, without listing them
```

`staleTime` is 0 for the report and generous for everything else. Any write makes
the stored run stale, so a cached report is the one thing that must never be
served without asking.

## Charts

One boundary, and it is the reason d3 is here at all:

```
components/client/variance-chart.tsx   knows what a report is
  ├─ holds the selected month and the view toggle
  └─ components/charts/                knows points, scales and marks
       trend-chart    d3-shape line/area + clip paths for the signed band
       variance-bars  d3-scale band/linear, zeroed and symmetric
       chart-kit      axes, grid, legend, readout, screen-reader table
```

**d3 computes; React renders.** `d3-scale`, `d3-shape` and `d3-array` are used
for scales, path strings and tick values. `d3-selection` and `d3-transition` are
not used at all — they would put a second library in charge of nodes React is
already reconciling.

Charts take `points` and a `width` and return SVG. They do no fetching and know
nothing about queries, which is what lets the same pair render on the dashboard's
six-month window and the report's arbitrary range with no branching.

Width comes from a `ResizeObserver` rather than a `viewBox`. An SVG that scales
itself scales its type and stroke widths too, so 11px axis labels become 7px on a
narrow card — the difference between a resized picture and a responsive chart.

## Where the rules live

Each product rule has exactly one home:

| Rule | Home |
|---|---|
| Variance and the two edge cases | `ReportService.compute` (authoritative), mirrored for display in `lib/utils/variance.ts` |
| Lock enforcement | `LockService.assertOpen`, called by every plan and actual write |
| Ownership | the `WHERE` clause of every repository method |
| Category usable? | `CategoryService.requireWritable` |
| CSV shape | `readHeader` + `parseImportRow` |
| Category identity colour | `lib/utils/category-color.ts`, keyed on id |

The variance rule is the one duplication, and it is deliberate: the client
formats without a round trip, the server computes what it stores. Both are
asserted against the brief's figures in separate suites, so a drift turns one red
while the other stays green.
