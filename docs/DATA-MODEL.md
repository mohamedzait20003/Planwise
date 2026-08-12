# Data model

The schema, and why it is shaped this way. Source of truth is
[`prisma/schema.prisma`](../prisma/schema.prisma).

---

## Shape

```
User ─┬─< Category ─┬─< Plan
      │             └─< Actual
      ├─< Plan
      ├─< Actual
      ├─< PeriodLock
      ├─< ReportRun ─┬─< ReportRow
      │              └─< ReportMonth
      ├─< OAuthAccount
      ├── PasswordReset        (0..1)
      └── EmailVerification    (0..1)
```

Every table that holds user data carries `userId` directly, including `Plan` and
`Actual` which could reach it through `Category`. That denormalisation is what
lets a query filter by owner without a join, and it is what the composite foreign
key below depends on.

## Core tables

### `User`

`Id` cuid, `Email` unique, `passwordHash` nullable — a Google-only account has
none, which is what `hasPassword` tests. `emailVerifiedAt` nullable: verification
is a timestamp, not a boolean, so "when" is not lost.

`dataVersion` is an integer bumped by every write that can move a report number.
A `ReportRun` records the version it computed against, so staleness is one
compare rather than a scan.

### `Category`

```prisma
@@unique([userId, name])     // no two categories with one name, per user
@@unique([id, userId])       // the target of the composite FK below
@@index([userId, archivedAt])
```

`archivedAt` nullable rather than a boolean — again, "when" is worth keeping.
There is no delete; see [DECISION](DECISION.md).

### `Plan`

```prisma
@@unique([userId, categoryId, periodMonth])
@@index([userId, periodMonth])
category Category @relation(fields: [categoryId, userId], references: [id, userId], onDelete: Restrict)
```

The unique constraint **is** the "one target per category per month" rule, which
is why writes are an upsert: two saves racing on the same cell would both see no
row, and the second would fail on the constraint.

The relation is **composite** — `[categoryId, userId]` → `[id, userId]`. A plain
`categoryId` FK would let a user attach their plan to someone else's category if
they guessed an id. The database refuses it structurally.

### `Actual`

```prisma
@@index([userId, periodMonth, categoryId])
```

**No unique constraint, on purpose.** Many entries can share a category and
month; three invoices against Marketing in January are three rows, and only the
sum matters to the report. Collapsing them would lose the notes, which is the
only place detail lives.

### `PeriodLock`

```prisma
@@unique([userId, periodMonth])
```

**A lock is a row's presence, not a flag.** "Open" is the absence of a decision
rather than a state something must be moved into, and unlocking is a delete with
nothing left behind. Granularity is the month; a quarter is three rows.

## Report tables

A report is computed off the queue, so it is stored rather than derived per
request.

### `ReportRun`

```prisma
@@unique([userId, fromMonth, toMonth, categoryId])
@@index([userId, status])
categoryId String @default("")   // "" = every category
```

The unique key **is** the query, which is what makes asking twice cheap.

`categoryId` is `""` rather than `null`, and that is not a typing workaround.
**Postgres treats NULLs as distinct in a unique index**, so a nullable column
would allow unlimited duplicate "all categories" runs under the very constraint
meant to prevent them. Prisma also refuses `null` in a compound-unique selector,
so the upsert could not address them.

Totals are denormalised onto the run so the summary tiles need no aggregate over
rows.

### `ReportRow` / `ReportMonth`

`ReportRow` copies `categoryName` rather than joining. **A report is a statement
about a moment**: renaming a category later must not rewrite what last quarter's
report said.

`variancePct` is `Decimal(10,4)` and **nullable** — null when plan was 0. Storing
0 would make "no plan" indistinguishable from "exactly on plan".

`hasActual` is what lets the UI show "—" without changing the arithmetic. The
amount is 0 either way.

Both cascade from the run, and a recompute replaces them wholesale — a new answer
rather than a diff, so a partly-old, partly-new state is never readable.

## Types

| Concept | Type | Why |
|---|---|---|
| Money | `Decimal(14, 2)` | Float cannot represent cents; a variance column would drift |
| Month | `Date @db.Date` | A DATE has no time and no zone, which is what a month is |
| Ids | `cuid()` | Sortable, non-guessable, no coordination |
| Tokens | `tokenHash` unique | Only the hash is stored; the raw value exists in the email |

**Months never cross a boundary as a `Date`.** `"YYYY-MM"` end to end, converted
in UTC in exactly one module. A `Date` built with local-time constructors in
UTC−5 turns `2026-01` into December.

## Ownership

There is no row-level security. Every repository method takes `userId` first and
puts it in the `WHERE`:

```ts
// findFirst, not findUnique — the id alone is unique, but scoping is what
// stops one user reading another's row by guessing an id.
db().category.findFirst({ where: { id, userId } })

// updateMany so userId can join the filter; `update` accepts only a unique
// selector, which would leave the scope check to a separate read.
db().category.updateMany({ where: { id, userId }, data })
```

A method that forgets it is the failure mode. Taking `userId` as the first
parameter rather than reading it from ambient state makes forgetting it a type
error.

## Performance at scale

The dataset here is small. What would matter as it grows:

**The indexes that already carry the load.** `Actual`'s
`[userId, periodMonth, categoryId]` serves the report's range scan and its
`groupBy` in one; `Plan`'s `[userId, periodMonth]` does the same. Both lead with
`userId`, so every query is a scoped range read rather than a filtered table scan.

**Aggregate in the database.** `sumInRange` uses `groupBy` rather than fetching
rows and reducing in JS. A year of daily entries is thousands of rows the report
never needs individually.

**What I would add next.**

1. **Covering indexes.** `Actual (userId, periodMonth, categoryId) INCLUDE
   (amount)` lets the aggregate come from the index alone.
2. **Partial index for the common case** — `WHERE archivedAt IS NULL` on
   `Category`, since almost every read wants only active ones.
3. **Partitioning `Actual` by year** once it passes tens of millions of rows.
   Every query already carries a month range, so pruning would be automatic.
4. **Drop the stored-report tables if they stop earning their keep.** They exist
   because generation is queued. If aggregation stays this cheap, computing per
   request is simpler and cannot go stale.
5. **A `sessionVersion` column on `User`**, checked in `Auth()` — the price of
   revocation is one indexed read per authenticated request.

**The known inefficiency.** `dataVersion` invalidates every stored report for a
user, so an actual logged in January marks a report covering last year stale. It
is one integer compare instead of a scan, and recomputing an unwanted report is
currently cheaper than the bookkeeping to avoid it. That reverses once reports
are large or numerous.
