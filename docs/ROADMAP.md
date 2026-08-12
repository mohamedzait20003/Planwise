# Roadmap

Ordered by what unblocks the most, not by size.

---

## Now — closing the brief

### 1 · Seed script

```bash
npx prisma db seed
```

Two categories and the brief's exact figures, including the deliberately missing
Marketing actual for February, plus one locked month so the read-only path is
visible.

It is first because it unblocks everything below it: the first real query against
Postgres, a way to actually look at the screens, and the fixture the
database-backed tests need. Roughly two hours.

### 2 · Deploy

The outstanding deliverable — the brief requires a live URL.

```bash
vercel link
# add DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL in the dashboard
# add VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID as GitHub secrets
```

Two things to decide at the same time: whether `main` or `feat/landing-redesign`
is the production branch (`deploy.yml` assumes `main`, `origin/HEAD` currently
says otherwise), and whether to disconnect Vercel's own Git integration — left
on, it races the workflow with migrations landing in between.

`experimentalTriggers` in `vercel.json` is the piece most likely to need
adjusting when the queue is provisioned for real.

### 3 · Database-backed tests

With a seeded database, the tests that cannot exist today:

- **Lock enforcement** — every write to a closed month answers 423. The brief
  names this explicitly and it is the only untested product rule.
- **Ownership** — user B cannot read or write user A's rows through a guessed id.
- **The signed-in journey** — create a category, set a target, log an actual,
  read the report, lock the month, watch a write fail. `playwright.config.ts`
  already takes `E2E_BASE_URL` for exactly this.

---

## Next — production readiness

### Session revocation

A `sessionVersion` integer on `User`, embedded in the JWT and checked in
`Auth()`. Today a token is valid for its full 30 days and **a password reset does
not sign out an attacker who already has one** — which is the main reason people
reset passwords.

Checked in `Auth()` (Node, has the database) and not in `proxy.ts` (Edge,
doesn't). The existing comment at `controller.ts` already draws that line.

### Rate limiting

Sign-in, sign-up and password reset. The timing-safe compare stops
enumeration by response time; nothing currently stops volume.

### Observability

`console.error` in the endpoint wrapper is the whole story. Structured logs with
a request id, and error tracking. Queue failures are the blind spot: a run marked
FAILED tells the user, but nobody is told.

### Migration safety

`deploy.yml` runs migrations before shipping code, which is right for additive
changes and wrong for destructive ones. Worth a documented expand-then-contract
process before the first column is dropped.

---

## Later — product

| | Note |
|---|---|
| **Drill-down** | Click a report cell to see the entries behind it. The data supports it; only UI is missing. It is also the natural answer to "why is this number wrong?" |
| **Fiscal year** | A start-month setting, then the quarter presets derive from it. |
| **Lock a quarter** | Three locks behind one button. The model already allows it. |
| **Recurring plans** | Copy a month's targets forward, or set a default that months inherit. |
| **Multi-currency** | A currency column and a rate table. Everything assumes one currency today. |
| **Admin screens** | `proxy.ts` and the role claim exist; `/admin/*` has no pages. |

---

## Technical debt, with triggers

Each of these is a deliberate trade that becomes wrong at a knowable point.

| Debt | Cost today | Revisit when |
|---|---|---|
| **Coarse report invalidation** — one counter per user | An actual in January invalidates a report covering last year | Reports get large, or a user keeps many ranges |
| **The variance rule exists twice** — `lib/utils/variance.ts` and `ReportService.pct` | Manual synchronisation; two test suites guard it | A third consumer appears |
| **Stored reports** — a whole materialised layer | Consistency to maintain, a pending state in the client | If aggregation stays this cheap, deleting it and computing per request is simpler and cannot go stale |
| **next-auth v4 on Next 16** | Works; the version predates the framework | It breaks, or v5 stabilises. `jose` + `arctic` was the considered alternative |
| **No `note` on CSV import** | Imported entries carry no note | Users ask; it is one more column and one line in `parseImportRow` |
| **`month.ts` / `period.ts` overlap** | Two `isMonth`, two `monthsBetween` | Never, unless zone-explicit names (`monthToUtcDate`) make one module viable |

---

## Explicitly not planned

- **Per-user timezones.** Months are calendar months; the app is zone-free by
  design and adding zones would reintroduce the bug class the string format
  removes.
- **Soft-deleting actuals.** They are entries, not records of record. Categories
  archive because history references them; actuals do not have that problem.
- **A component test layer.** The logic worth testing is in the domain, and
  Playwright covers the rest against a real browser. A jsdom layer between them
  would assert that components do what they say rather than what users need.
