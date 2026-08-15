# Product requirements

The assignment, restated as testable requirements with their current status.

**Legend** — ✅ done · 🟡 partial · ⛔ not started

---

## 1. Authentication

| # | Requirement | Status | Where |
|---|---|---|---|
| 1.1 | Sign up with email and password | ✅ | `/auth/sign-up` → `POST /api/auth/sign-up` |
| 1.2 | Log in with email and password | ✅ | `/auth/sign-in` → next-auth credentials provider |
| 1.3 | A user sees and modifies only their own data | ✅ | every repository takes `userId` as its first argument and puts it in the `WHERE` clause |

**Beyond the brief.** Email verification with single-use hashed tokens, password
reset, and Google OAuth. The brief said "email + password is sufficient"; these
were added because an unverified-email flow changes the sign-in contract, and
retrofitting it later would have meant rewriting the form.

**Ownership is enforced per query, not per session.** Reaching a `/client` page
proves only that a caller is *someone*. `findFirst({ where: { id, userId } })`
rather than `findUnique({ where: { id } })` is what makes a guessed id return
nothing.

**Requirement 1.3 survives the admin console**, which is the one place it could
have quietly stopped being true. `/admin/*` reads users, counts and queue state;
no endpoint there returns another account's categories, targets, entries or
report figures. An operator can see that an account holds 412 entries and when
the last one landed, and cannot see what any of them were for. See
[PRODUCT-SPECIFICATIONS](PRODUCT-SPECIFICATIONS.md#users--adminusers).

## 2. Categories

| # | Requirement | Status | Where |
|---|---|---|---|
| 2.1 | Create spending categories | ✅ | `/client/categories` |
| 2.2 | Assign categories to plans and actuals | ✅ | both reference `Category` by composite FK |
| 2.3 | Full CRUD, or a documented seed list | ✅ | create, rename, archive |

**No delete.** Plans and actuals reference a category with `onDelete: Restrict`,
so a delete would either be refused by the database or take history with it.
Archiving hides the category from the pickers and leaves every past report
reading exactly as it did.

## 3. Plans (targets)

| # | Requirement | Status | Where |
|---|---|---|---|
| 3.1 | A monthly target amount per category | ✅ | `Plan`, unique on `[userId, categoryId, periodMonth]` |
| 3.2 | Create and edit targets for open months | ✅ | `/client/plans`, inline, saves on blur |
| 3.3 | Targets in locked periods cannot be edited | ✅ | `LockService.assertOpen` → HTTP 423 |

**Upsert, not create-then-update.** One plan per category per month is a schema
invariant, so "set the target" and "change the target" are the same request. A
separate create would only be a way to get a 409 on the second save.

**Blank is not zero.** Clearing the input deletes the plan, so the report shows
`N/A`. A target of `$0` is a real plan that all spending exceeds.

## 4. Actuals

| # | Requirement | Status | Where |
|---|---|---|---|
| 4.1 | Log spend with category, month, amount, optional note | ✅ | `/client/actuals` |
| 4.2 | CSV import | ✅ | `POST /api/client/actuals/import` |
| 4.3 | Validate category names and month format on import | ✅ | per row, with line numbers |

**Import format** — a header row naming `month`, `category`, `amount`, in any
order, then one row per entry:

```csv
month,category,amount
2026-01,Marketing,4800
2026-01,Payroll,20500
2026-02,Payroll,19800
```

The header is **required and read by name**. A positional parser that accepted
`category,month,amount` would load every row with the two swapped and the first
symptom would be a report full of categories named "2026-01".

**Partial success is the contract.** Forty rows with two bad ones lands
thirty-eight and reports the two, with real file line numbers — correct even
when a quoted field contains a newline.

## 5. Report

| # | Requirement | Status | Where |
|---|---|---|---|
| 5.1 | Select a date range | ✅ | `/client/report`, with quarter and year presets |
| 5.2 | Category, Month, Plan, Actual, Variance, Variance % | ✅ | grouped by month, then category |
| 5.3 | Plan = 0 does not crash or show NaN | ✅ | `variancePct: null` → **N/A** |
| 5.4 | Missing actual handled consistently | ✅ | summed as 0, displayed as **—** |
| 5.5 | At least one chart | ✅ | net variance by month, diverging around a zero baseline |

Both edge cases are asserted against the brief's own figures in
`tests/unit/report-service.test.ts`.

**Chart form.** A diverging bar chart where the baseline *is* the plan: above it
overspent, below it underspent. Position carries the answer and colour is
redundant reinforcement — which matters because the two tones are red and green,
and deuteranopia flattens exactly that axis. The palette was re-stepped for a
wide lightness gap and validated in both themes.

## 6. Locking

| # | Requirement | Status | Where |
|---|---|---|---|
| 6.1 | Lock a month or quarter | ✅ | month — `/client/periods` |
| 6.2 | Plans and actuals become read-only | ✅ | inputs disabled, writes refused |
| 6.3 | The API rejects edits with a clear error | ✅ | `423` + `PeriodLockedError` |
| 6.4 | Granularity documented | ✅ | month — README and `docs/DECISION.md` |

## Stretch goals

| Goal | Status | Note |
|---|---|---|
| Drill-down from a report cell | ✅ | clicking a category opens the entries behind the cell |
| Fiscal year selector | ✅ | start-month selector; every preset derives from it |
| Export report as CSV | ✅ | `GET /api/client/report/export` |

## Technical guidelines

| Requirement | Status | Note |
|---|---|---|
| Stack — free choice | ✅ | Next.js 16, Postgres, Prisma |
| **Deployment — required, live URL** | ✅ | **https://planwise-rouge.vercel.app** |
| Tests for aggregation, variance, lock enforcement | ✅ | all three, without a database — services take their repositories as parameters |
| README notes indexing and query at scale | ✅ | `docs/DATA-MODEL.md` |
| Migrations and seed scripts | ✅ | migrations, plus idempotent `npm run seed` and `npm run seed:admin` |

## Beyond the brief

Not asked for, and built because leaving them out would have made something else
worse.

| | Why |
|---|---|
| Email verification, password reset, Google OAuth | An unverified-email flow changes the sign-in contract; retrofitting it would have meant rewriting the form |
| Stored, queued reports | Cost scales with the range, and a ten-year query should not hold an HTTP connection |
| Soft-deleted actuals | A locked month has to be able to account for what it contained |
| **Admin console** | The `ADMIN` role and the `proxy.ts` guard already existed and pointed at pages that did not. A role that grants access to nothing is a claim the app makes and cannot honour |

---

## Summary

Every functional requirement and all three stretch goals are implemented, and
the app is deployed.

One gap remains, and it is a testing gap rather than a functional one:
**no automated test opens a Postgres connection.** Migrations, the ownership
`WHERE` clauses and Prisma's own query generation are verified by types and by
hand. The rules the brief grades — variance, aggregation, lock enforcement —
are each asserted directly against stubs, which is why they need no database;
ownership is the one that would.

See [ROADMAP.md](ROADMAP.md).
