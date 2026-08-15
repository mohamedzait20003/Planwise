import "server-only";

import type { ReportStatus } from "../../../generated/prisma/client";

/**
 * The shapes the platform overview is made of.
 *
 * Plain types, not `@Model` classes, and for the reason already written down in
 * `docs/ARCHITECTURE.md`: a model wraps a row, and none of these is one. "How
 * many users are verified" has no id, no timestamps and nothing to hydrate — it
 * is the answer to a `count`, and wrapping it in a class would invent an entity
 * that does not exist. The same rule already keeps `sumInRange` and `isLocked`
 * raw.
 *
 * Every figure here is a count or a timestamp. No amount from any user's ledger
 * reaches this file, which is the boundary `UserFootprint` explains.
 */

/** Headline counts over the users table. */
export type UserTotals = {
    total: number;
    verified: number;
    unverified: number;
    admins: number;
    /** Registered since the first of the current month. */
    newThisMonth: number;
};

/** One bar of the signups chart. `month` is "YYYY-MM". */
export type SignupPoint = {
    month: string;
    count: number;
};

/**
 * What exists across every workspace.
 *
 * Deleted actuals are excluded, so this counts the live ledger rather than the
 * table — a soft delete should leave the platform figure as it leaves the
 * user's own report.
 */
export type WorkspaceTotals = {
    categories: number;
    plans: number;
    actuals: number;
    lockedMonths: number;
};

/** Report runs by status, so a stuck queue is visible without reading logs. */
export type QueueTotals = Record<Lowercase<ReportStatus>, number>;

/**
 * A run that failed, as an operator needs to see it.
 *
 * Carries the range because that is what makes a failure reproducible, and the
 * owner's email because that is who has to be told. It deliberately does not
 * carry the run's totals: a failed report's stored figures are both meaningless
 * and none of an operator's business.
 */
export type FailedRun = {
    id: string;
    userEmail: string;
    from: string;
    to: string;
    error: string | null;
    requestedAt: Date;
};

/** Everything the admin dashboard renders, in one round trip. */
export type PlatformOverview = {
    users: UserTotals;
    signups: SignupPoint[];
    workspace: WorkspaceTotals;
    queue: QueueTotals;
    failures: FailedRun[];
};

/** A page of users, with the total the pager needs to size itself. */
export type Page<T> = {
    items: T[];
    total: number;
    page: number;
    perPage: number;
};
