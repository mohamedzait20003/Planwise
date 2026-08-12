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

### Dashboard · `/client/dashboard`

This month against plan, and the trailing six months as a trend. Four stat tiles
(plan, actual, variance this month, net over the window), the variance chart, and
quick links.

Six months rather than one because a single month's variance says nothing about
whether it is a blip or a trend, and the trend is why anyone opens this.

First run shows an empty state that names the next action — plan vs actual needs
both halves, so it points at categories and plans rather than saying "no data".

### Categories · `/client/categories`

Create, rename in place, archive, restore. Archived categories are hidden by
default behind a count.

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

A month picker, an entry form, a CSV import panel, and the month's entries with
editable amount and note, plus delete.

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

A month range with **This quarter / Last quarter / This year** presets, an
optional category filter, four totals, the chart, and the detail table grouped by
month.

Generation is queued, so the first request usually answers "generating" and the
numbers arrive on a poll. A stale report is never served — a variance figure one
write behind is a wrong number wearing the authority of a right one.

**Export CSV** computes on demand rather than reading the stored run: the caller
is waiting on a download, and a browser can do nothing with a 202.

### Periods · `/client/periods`

The last twelve months and the next three, each with its lock state, note, and a
lock/unlock button.

Future months are lockable on purpose — freezing a signed-off budget is
legitimate, and a list stopping at today would make it impossible.

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
  validated for colour-vision deficiency in both themes; the table beside it is
  the equivalent non-visual view.
- Money uses tabular figures so columns align.
- Month inputs are the native control, so they are keyboard- and
  screen-reader-complete and open the platform month wheel on mobile.
- Entrance animation is decorative only; nothing depends on it to become
  readable.
