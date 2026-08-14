# Product specifications

What the product does, from the outside. Screens, flows, and the rules a user
can observe.

---

## The model in one paragraph

A user owns **categories**. Against each category they set a monthly **plan** —
one target per category per month. They log **actuals** — as many entries per
category and month as they like, because three invoices against Marketing in
January are three entries and only the sum matters. The **report** joins the two
across a range and shows the gap. A **period lock** freezes a month so neither
side can change.

## Sign-in and accounts

| Flow | Behaviour |
|---|---|
| Sign up | First name, last name, email, password, optional username. Sends a verification link. |
| Verify | Single-use token. Firing twice cannot flip a verified account to "expired" — the page guards against React's double-mount. |
| Sign in | Refuses an unverified account, **re-sends the link**, and says so in a success tone rather than an error one — the password was right. |
| Forgot password | Answers identically whether or not the account exists, so the page cannot be used to discover registered addresses. |
| Reset | Single-use token. Arriving without one shows "request a new link" rather than a form that cannot succeed. |
| Google | Links to an existing account **only if that account's email is already verified** — otherwise anyone able to obtain a Google token for the address could take it over. |

After signing in, users land on `/auth/callback`, which reads their role and
routes to `/client/dashboard` or `/admin/dashboard`. It exists because role is
only knowable by asking the server — the session cookie is `httpOnly` — and
sending everyone to the client dashboard would bounce an admin through the route
guard twice with a visible flash.

## Screens

### Landing · `/`

The signed-out page. A hero whose backdrop is the product's one rule drawn at
wall size — a plan line, an actual line, and the area between them tinted by its
own sign — then the four steps, the reporting rules, an interactive locking
demo, CSV import, and the FAQ.

The locking section lets a visitor **try** the rule rather than read it: pick a
month, press Save, and a closed month answers with the same `PERIOD_LOCKED`
refusal the API gives. It is the page's one claim that can be demonstrated
instead of asserted.

No link leaves for a live report. The figures shown are fixed sample data, so a
signed-out visitor sees a real report shape with no database behind it.

### Dashboard · `/client/dashboard`

This month against plan, the categories furthest from it, and the trailing six
months as a trend.

One figure is the headline — this month's variance, with a track showing actual
against the target — and three tiles support it. A row of equal tiles makes the
reader rank them, which is work the screen should have done.

**Furthest from plan** ranks this month's categories by *absolute* variance. The
biggest saving is as much a planning miss as the biggest overspend, so a signed
sort would bury it. Categories with neither a plan nor an actual are dropped:
they are on plan by arithmetic, and a needs-attention list topped by untouched
categories is not one.

Six months rather than one because a single month's variance says nothing about
whether it is a blip or a trend, and the trend is why anyone opens this.

First run shows an empty state that names the next action — plan vs actual needs
both halves, so it points at categories and plans rather than saying "no data".

### Categories · `/client/categories`

A searchable grid of cards, filtered by **Active / Archived / All**. Create,
rename, archive, restore.

Each card carries a colour chip keyed to the category's **id**, not its name, so
renaming does not repaint it — a colour that changes cannot be learned. The same
chip identifies the category on the actuals ledger and the dashboard.

Renaming is a button that becomes an input. The previous inline field looked
like plain text until hovered, which is an edit affordance only a mouse user
ever discovers.

Archiving keeps the card in place for a few seconds with an **Undo** beside it.
The action is reversible, and a row that vanishes silently does not look it.

Renaming changes future reports but **not stored ones** — a report is a
statement about a moment, so `ReportRow` copies the category name rather than
joining to it.

### Plans · `/client/plans`

A month picker and one row per active category with an editable target. Saves on
blur, reverts on Escape, with a tick on success.

Inline rather than behind a dialog: setting a quarter of targets is a dozen small
numbers, and a modal per number turns five minutes of typing into five minutes of
clicking.

**Clearing a cell deletes the target.** Blank means "no target" — the report
shows `N/A`. A target of `$0` is a real plan, and anything spent against it is
fully over.

A locked month disables every input and shows a notice naming the month.

### Actuals · `/client/actuals`

A two-column workspace. The left rail sticks: month picker, the month's total,
the quick-add form, and CSV import behind a disclosure. The right side is the
ledger — a category breakdown and the month's entries with editable amount and
note, plus delete.

Side by side rather than stacked because logging an entry and checking what it
did to the month are two halves of one task. Stacked, you scrolled past the form
to see the result and back up to add the next one.

**Where it went** ranks categories by share of the month's spend, as bars. A
ranking read off a donut is a comparison of arc lengths, which is the least
accurate judgement the eye makes.

Import is folded away by default. It is the month-end path, not the daily one,
and a file picker sitting open above the ledger implies the CSV is the expected
way in.

The form keeps the chosen category after a submit — logging three entries against
the same category is the common shape, and re-picking it each time is the
friction that makes people batch into a spreadsheet instead.

**CSV import** takes a header row naming `month`, `category`, `amount` in any
order. Rejected rows are listed with their file line number and the reason:

```
Line 7   2026-13,Marketing,10       "2026-13" is not a month like 2026-01
Line 12  2026-01,Advertising,500    no active category named "Advertising"
Line 19  2026-01,Payroll,abc        "abc" is not an amount
Line 24  2026-01,Payroll,900        2026-01 is locked
```

The good rows still land. A file refused whole makes the user hunt for a problem
we already located.

### Report · `/client/report`

A range builder, the headline variance, the chart, and the detail table grouped
by month.

**The range is presets first.** `Quarter · Last quarter · Year · Custom`, with
the from/to month fields appearing only under Custom. Nearly every run is a
quarter or a year; offering two date fields first implies assembling one by hand
is the expected answer. A footer states what is about to be generated —
`Jan – Mar 2026 · 3 months · all categories`.

**The chart reads two ways**, switched by a toggle that keeps the selected month
across the change:

| View | Shows | Answers |
|---|---|---|
| **Trend** | Plan and actual as two lines, the gap between them shaded by its sign | what happened |
| **Variance** | The gap alone, as bars either side of the plan line | by how much |

Neither subsumes the other. Plan is dashed and actual is solid, so the two
series separate without colour, and the over-plan region is hatched as well as
tinted.

The detail table carries a **month subtotal** in each group header and an inline
variance meter per row, scaled against the largest variance in the table so the
marks are comparable down the column.

**Previously generated** draws the ranges already run as bars on one shared
timeline, each positioned and sized by the months it covers. A run is a claim
about a span of time, and a column of text labels throws that away — "Jan – Mar"
and "Feb – Aug" read as two strings when they are really two overlapping
intervals. On a common axis the overlap, the gaps and the relative reach are
visible without reading a date, and a "now" line marks today when it falls
inside the span.

Each bar carries its state in its own treatment — faded and dash-outlined when
out of date, pulsing while running, outlined when failed — with the word beside
it, since a texture is a reinforcement and not a label. Net variance is always
shown as text. Selecting a bar moves the range and category filter to match, and
the stored run loads from there.

It is **one entry per range, not per generation.** A run is keyed by its query,
so regenerating Q1 updates the Q1 entry rather than stacking a second one beside
it. The list answers "what have I looked at", not "how many times did I press
the button" — the model has no room for the second question, since a second run
of the same range would collide on
`@@unique([userId, fromMonth, toMonth, categoryId])`.

Generation is queued, so the first request usually answers "generating" and the
numbers arrive on a poll. A stale report is never served — a variance figure one
write behind is a wrong number wearing the authority of a right one.

**Export CSV** computes on demand rather than reading the stored run: the caller
is waiting on a download, and a browser can do nothing with a 202. It writes one
row per category × month with month, category, plan, actual, variance, variance %
and whether the month was locked. A missing actual and an undefined variance %
are **empty cells**, not zeros, so a spreadsheet averages what is really there.

### Periods · `/client/periods`

A calendar year, three months to a row under `Q1`–`Q4` labels, with year
navigation and a bar showing how much of the year is closed.

A calendar rather than a list because months are a calendar, and "is Q1 closed?"
is the question people arrive with — a table of rows asked them to rebuild one
in their head to answer it.

**The note belongs to the month.** Pressing Close expands a note field on that
tile with confirm and cancel. A single shared field elsewhere on the page left
no way to tell which month it was about to be attached to.

Future months are lockable on purpose — freezing a signed-off budget is
legitimate, and a list stopping at today would make it impossible. They are
dimmed rather than blocked: closing one early is unusual, not wrong.

## Rules a user can observe

### Variance

```
variance = actual − plan
```

**Negative means under plan.** That inverts the usual "red for negative"
instinct, which is why every variance carries an arrow and a word as well as a
colour — colour alone reads backwards to anyone who has not been told.

| Case | Variance | Variance % | Shown |
|---|---|---|---|
| Plan 5,000 · actual 4,800 | −200 | −4.00% | green, arrow down |
| Plan 20,000 · actual 20,500 | +500 | +2.50% | red, arrow up |
| Plan 5,000 · nothing logged | −5,000 | −100.00% | green, Actual cell shows **—** |
| Plan 0 · actual 500 | +500 | **N/A** | red, with a tooltip explaining |
| Plan 5,000 · actual 5,000 | 0 | 0.00% | neutral |

### Missing actuals

Counted as **0**, displayed as **—**. The arithmetic treats them as zero so
totals and the chart stay additive; the dash preserves the difference between
"nothing was logged" and "someone logged zero".

### Locking

Granularity is the **month**. A locked month refuses:

- creating, editing or deleting a plan
- creating, editing or deleting an actual
- moving an actual *into or out of* it
- CSV rows targeting it

and answers **HTTP 423** with a message naming the month. Reports still read
locked months and mark their rows.

## Accessibility

- Variance is never colour alone — arrow, sign and word carry it too.
- The chart's diverging palette was re-stepped for a wide lightness gap and
  validated for colour-vision deficiency in both themes. Even so, over and under
  are a red/green pair, so the trend chart **also** separates them by line style
  (plan dashed, actual solid) and hatches the over-plan region. Every data mark
  was measured at ≥3:1 against the card in both themes.
- Charts carry a screen-reader data table of the months they plot, and a
  one-sentence summary of the shape. A chart with only a label tells a
  screen-reader user the shape and withholds the numbers.
- The chart's month selection is **buttons**, not arrow keys on the plot. A
  keyboard affordance that has to be announced in placeholder text is one most
  people never find, and a plot is not an interactive element.
- Category chips are decoration, never the only identifier — the name is always
  beside them, and the archived state carries a pill and a label.
- Money uses tabular figures so columns align.
- Month inputs are the native control, so they are keyboard- and
  screen-reader-complete and open the platform month wheel on mobile.
- Entrance animation is decorative only; nothing depends on it to become
  readable, and every chart respects `prefers-reduced-motion` by rendering its
  final state immediately.
