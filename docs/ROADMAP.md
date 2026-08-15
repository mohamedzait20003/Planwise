# Roadmap

Ordered by what unblocks the most, not by size.

---

## Now — closing the brief

### 1 · ~~Seed script~~ — done

`npm run seed` creates a verified demo account holding the brief's figures,
including the deliberately missing Marketing actual for February and one locked
month. Idempotent, so a half-loaded database can be re-seeded safely.

`npm run seed:admin` is separate, and grants the admin console. Loading sample
data and handing out the run of every account are different acts, so bundling
them would have meant every environment wanting the demo figures also got an
operator account with a published password.

It also unblocks the database-backed tests below, which needed a fixture.

**Both had a latent defect until recently: neither could run.** The generated
Prisma client's internal imports were extensionless, which a bundler resolves
and raw Node ESM does not, so `node scripts/seed.ts` died with
`ERR_MODULE_NOT_FOUND` before reaching a query. `importFileExtension = "ts"` on
the generator fixes it.

### 2 · ~~Deploy~~ — done, with one thread left

Live at **https://planwise-rouge.vercel.app**, shipped from the CLI. Migrations
applied, categories and actuals imported, reports generated against the real
database.

Vercel's Git integration is disconnected — `git.deploymentEnabled: false` in
`vercel.json` — so `deploy.yml` is the only path to production and migrations
always precede the code.

**Still open: which branch is production.** `deploy.yml` triggers on `main`;
the work is on `feat/landing-redesign`. Until that merges, nothing deploys
automatically and every release is a manual `vercel --prod`. Either merge, or
change the trigger — but not both.

`experimentalTriggers` in `vercel.json` is still pinned to `queue/v2beta` and
remains the piece most likely to need adjusting.

### 3 · Database-backed tests

**Lock enforcement is no longer on this list.** It was, on the assumption that
asserting it needed a real database — which was wrong. Services take their
repositories as constructor parameters, and `@Transactional` joins an existing
transaction rather than opening one, so `tests/unit/lock-enforcement.test.ts`
runs the real service bodies against stubs. What remains here genuinely does
need Postgres.


With a seeded database, the tests that cannot exist today:

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

Drill-down and fiscal years have both shipped; what is left here is genuinely
not started.

| | Note |
|---|---|
| **Lock a quarter** | Three locks behind one button. The model already allows it. |
| **Recurring plans** | Copy a month's targets forward, or set a default that months inherit. |
| **Multi-currency** | A currency column and a rate table. Everything assumes one currency today. |

**Admin screens have shipped.** `/admin/dashboard` and `/admin/users`, over four
`Auth("ADMIN")` endpoints. What is left on them is narrower than the original
entry:

| | Note |
|---|---|
| **An audit trail** | Role and verification changes are applied and not recorded. Who demoted whom, and when, is currently only in the database's current state. This is the first thing a second operator would ask for. |
| **Suspending an account** | There is no `suspendedAt`, so the only lever is clearing verification, which is a verification control being used as a ban. A column and a migration. |
| **Serialized role writes** | `assertAnAdminRemains` catches the sequential case and rolls back. Two admins demoting each other in overlapping transactions can still tie; closing it needs `SELECT … FOR UPDATE` or serializable isolation. |

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

## Previously not planned, since reversed

All three of these were argued against here. Each argument is recorded with what
actually happened, because two of them were half right and one was wrong.

- **Per-user timezones.** *Was:* months are calendar months, and zones would
  reintroduce the bug the string format removes. *Still true of storage* — and
  the implementation respects it. A zone answers only "which month is now",
  which is a different question, and `timezone.test.ts` asserts that a stored
  month means the same thing in every zone.
- **Soft-deleting actuals.** *Was:* they are entries, not records of record.
  That is wrong once a month can be locked: a closed month has to be able to
  account for what it contained, and a hard delete takes that with it. The lock
  now guards restore as well as delete, since restoring changes a month's total
  just as surely.
- **A component test layer.** *Was:* it would assert what components say rather
  than what users need. Fair as a risk, so the layer only tests promises a user
  depends on — and it immediately found `MoneyInput` **committing the edit that
  Escape was meant to discard**, plus a `Segmented` option announcing itself as
  "Active12". Neither was reachable from the domain suite or from Playwright.
