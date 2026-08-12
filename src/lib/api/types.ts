/**
 * Wire types shared by handlers, hooks and components.
 *
 * These mirror what the endpoints return, not the Prisma rows: money arrives as
 * a number (Decimal is not JSON-serializable) and months as "YYYY-MM" strings,
 * both converted by the model layer before they cross the boundary.
 */

/** Every endpoint answers with this. `data` is absent when there is none. */
export type ApiEnvelope<T = undefined> = {
  message: string;
  data?: T;
};

/** Failure shape: the envelope plus a stable class name to branch on. */
export type ApiErrorBody = {
  message: string;
  error: string;
};

/* -------------------------------------------------------------------- auth */

/**
 * The five fields the API discloses about a user — deliberately narrower than
 * the User row, and narrower than the session, which carries only what the nav
 * and `proxy.ts` need.
 */
export type UserProfile = {
  FName: string;
  LName: string;
  Email: string;
  userName: string | null;
  AvatarUrl: string | null;
};

/* -------------------------------------------------------------- categories */

export type Category = {
  id: string;
  name: string;
  archivedAt: string | null;
  createdAt: string;
};

export type CreateCategoryInput = { name: string };
export type UpdateCategoryInput = { name?: string; archived?: boolean };

/* ------------------------------------------------------------------- plans */

export type Plan = {
  id: string;
  categoryId: string;
  /** "YYYY-MM" */
  month: string;
  amount: number;
};

/** Upsert: one plan per category per month, so create and edit are one call. */
export type UpsertPlanInput = {
  categoryId: string;
  month: string;
  amount: number;
};

/* ----------------------------------------------------------------- actuals */

export type Actual = {
  id: string;
  categoryId: string;
  month: string;
  amount: number;
  note: string | null;
  createdAt: string;
};

export type CreateActualInput = {
  categoryId: string;
  month: string;
  amount: number;
  note?: string | null;
};

export type UpdateActualInput = Partial<CreateActualInput>;

/** One rejected CSV row, with the reason, so the UI can list them. */
export type ImportRowError = {
  line: number;
  raw: string;
  reason: string;
};

export type ImportResult = {
  accepted: number;
  rejected: number;
  errors: ImportRowError[];
};

/* ------------------------------------------------------------------- locks */

export type PeriodLock = {
  id: string;
  /** "YYYY-MM" — locking granularity is the month. */
  month: string;
  lockedAt: string;
  note: string | null;
};

/* ------------------------------------------------------------------ report */

export type ReportRow = {
  categoryId: string;
  categoryName: string;
  month: string;
  plan: number;
  /** Missing actuals are summed as 0, so this is always a number. */
  actual: number;
  /** actual − plan. Negative means under plan. */
  variance: number;
  /** null when plan is 0 — there is no denominator. Render as "N/A". */
  variancePct: number | null;
  /** False when nothing was logged, so the UI can grey the row. */
  hasActual: boolean;
  /** True when the month is closed, so the UI can mark it read-only. */
  locked: boolean;
};

/** Net variance per month, for the chart. */
export type ReportMonthTotal = {
  month: string;
  plan: number;
  actual: number;
  variance: number;
};

export type ReportTotals = {
  plan: number;
  actual: number;
  variance: number;
  variancePct: number | null;
};

export type ReportResponse = {
  from: string;
  to: string;
  rows: ReportRow[];
  byMonth: ReportMonthTotal[];
  totals: ReportTotals;
};

export type ReportQuery = {
  /** Inclusive "YYYY-MM" bounds. */
  from: string;
  to: string;
  categoryId?: string;
};
