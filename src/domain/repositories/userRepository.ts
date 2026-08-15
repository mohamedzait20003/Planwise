import "server-only";

import { db } from "../decorators/service";
import { UserModel, UserWithFootprintModel } from "../models/userModel";
import { provide } from "../decorators/provider";
import { Repository } from "../decorators/repository";
import type { Page } from "../models/adminModel";
import type { AuthProvider, Prisma, Role } from "../../../generated/prisma/client";

/** Relation counts every footprint query selects, declared once. */
const FOOTPRINT_COUNTS = {
  categories: true,
  plans: true,
  // The live ledger, matching what the user's own report counts.
  actuals: { where: { deletedAt: null } },
  periodLocks: true,
  reportRuns: true,
} as const;

/** Filters the admin user list accepts. All optional; all combine with AND. */
export type UserSearch = {
  /** Matched against first name, last name and email, case-insensitively. */
  query?: string;
  role?: Role;
  verified?: boolean;
  page: number;
  perPage: number;
};

/**
 * The only place that reads or writes the users table.
 *
 * Note `db()` rather than an imported `prisma`: inside a `@Transactional()`
 * service method this returns the transaction client, so these queries enlist
 * automatically. Importing the client directly would silently escape the
 * transaction and survive a rollback.
 *
 * The admin methods at the bottom are the one group here not scoped to a single
 * user — that is the whole of what makes them admin methods, and why they are
 * only ever reached through `AdminService`, which is behind `Auth("ADMIN")`.
 */
@Repository({ name: "UserRepository" })
export class UserRepository {
  async findById(id: string): Promise<UserModel | null> {
    const row = await db().user.findUnique({ where: { Id: id } });
    return row ? new UserModel(row) : null;
  }

  async findByEmail(email: string): Promise<UserModel | null> {
    const row = await db().user.findUnique({ where: { Email: email } });
    return row ? new UserModel(row) : null;
  }

  /* Resolves a Google sign-in to a local user. */
  async findByOAuthAccount(
    provider: AuthProvider,
    providerAccountId: string
  ): Promise<UserModel | null> {
    const account = await db().oAuthAccount.findUnique({
      where: { provider_providerAccountId: { provider, providerAccountId } },
      include: { user: true },
    });

    return account ? new UserModel(account.user) : null;
  }

  async create(input: {
    FName: string;
    LName: string;
    Email: string;
    passwordHash?: string | null;
    Role?: Role;
    emailVerifiedAt?: Date | null;
  }): Promise<UserModel> {
    const row = await db().user.create({ data: input });
    return new UserModel(row);
  }

  async linkOAuthAccount(input: {
    userId: string;
    provider: AuthProvider;
    providerAccountId: string;
  }): Promise<void> {
    await db().oAuthAccount.create({ data: input });
  }

  async setPasswordHash(userId: string, passwordHash: string): Promise<void> {
    await db().user.update({ where: { Id: userId }, data: { passwordHash } });
  }

  async markEmailVerified(userId: string): Promise<void> {
    await db().user.update({
      where: { Id: userId },
      data: { emailVerifiedAt: new Date() },
    });
  }

  /* ------------------------------------------------------------------ admin */

  /**
   * One page of users, newest first, with their footprint.
   *
   * The count and the page are one `$transaction` so the total cannot describe
   * a different set of rows than the page it sizes — without it a signup landing
   * between the two queries shows a pager one row out of step with its list.
   *
   * `lastEntryAt` is filled by a single `groupBy` over the page's ids rather
   * than a per-row query, so the cost is two statements regardless of page size.
   */
  async search(search: UserSearch): Promise<Page<UserWithFootprintModel>> {
    const where: Prisma.UserWhereInput = {};

    if (search.query) {
      const contains = search.query;
      where.OR = [
        { FName: { contains, mode: "insensitive" } },
        { LName: { contains, mode: "insensitive" } },
        { Email: { contains, mode: "insensitive" } },
      ];
    }

    if (search.role) where.Role = search.role;
    // `emailVerifiedAt` is the column; `verified` is the question asked of it.
    if (search.verified !== undefined) {
      where.emailVerifiedAt = search.verified ? { not: null } : null;
    }

    const [total, rows] = await db().$transaction([
      db().user.count({ where }),
      db().user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (search.page - 1) * search.perPage,
        take: search.perPage,
        include: {
          _count: { select: FOOTPRINT_COUNTS },
          oauthAccounts: { select: { provider: true } },
        },
      }),
    ]);

    const lastEntries = await this.lastEntryByUser(rows.map((row) => row.Id));

    return {
      items: rows.map(
        (row) => new UserWithFootprintModel(row, lastEntries.get(row.Id) ?? null)
      ),
      total,
      page: search.page,
      perPage: search.perPage,
    };
  }

  async findWithFootprint(id: string): Promise<UserWithFootprintModel | null> {
    const row = await db().user.findUnique({
      where: { Id: id },
      include: {
        _count: { select: FOOTPRINT_COUNTS },
        oauthAccounts: { select: { provider: true } },
      },
    });

    if (!row) return null;

    const lastEntries = await this.lastEntryByUser([id]);
    return new UserWithFootprintModel(row, lastEntries.get(id) ?? null);
  }

  /** Most recent live actual per user, for the ids given. */
  private async lastEntryByUser(userIds: string[]): Promise<Map<string, Date>> {
    if (userIds.length === 0) return new Map();

    const groups = await db().actual.groupBy({
      by: ["userId"],
      where: { userId: { in: userIds }, deletedAt: null },
      _max: { createdAt: true },
    });

    const byUser = new Map<string, Date>();
    for (const group of groups) {
      if (group._max.createdAt) byUser.set(group.userId, group._max.createdAt);
    }

    return byUser;
  }

  async countByRole(role: Role): Promise<number> {
    return db().user.count({ where: { Role: role } });
  }

  async count(where?: Prisma.UserWhereInput): Promise<number> {
    return db().user.count({ where });
  }

  /**
   * Signups per month for the last `months` months, oldest first.
   *
   * Raw SQL because the grouping is `date_trunc`: `groupBy: ["createdAt"]` would
   * group by the exact timestamp and return one bucket per user. Truncating in
   * Postgres also means the whole series is one indexed scan rather than every
   * user's timestamp crossing the wire to be bucketed in JavaScript.
   *
   * UTC is named explicitly. The column is `timestamptz`, so without it the
   * bucket boundary would follow the database session's zone and a signup could
   * land in a different month than `createdAt` reads as everywhere else.
   */
  async signupsByMonth(months: number): Promise<{ month: Date; count: number }[]> {
    const rows = await db().$queryRaw<{ month: Date; count: bigint }[]>`
      SELECT date_trunc('month', "createdAt" AT TIME ZONE 'UTC') AS month,
             count(*) AS count
        FROM users
       WHERE "createdAt" >= date_trunc('month', now() AT TIME ZONE 'UTC')
                            - make_interval(months => ${months - 1}::int)
       GROUP BY month
       ORDER BY month ASC
    `;

    // `count(*)` comes back as bigint, which JSON cannot serialize — it throws
    // rather than rounding, so the conversion has to happen here.
    return rows.map((row) => ({ month: row.month, count: Number(row.count) }));
  }

  async setRole(id: string, role: Role): Promise<UserModel | null> {
    const { count } = await db().user.updateMany({
      where: { Id: id },
      data: { Role: role },
    });

    return count > 0 ? this.findById(id) : null;
  }

  /** Sets or clears the verification stamp. Clearing is what makes it reversible. */
  async setEmailVerified(id: string, verified: boolean): Promise<UserModel | null> {
    const { count } = await db().user.updateMany({
      where: { Id: id },
      data: { emailVerifiedAt: verified ? new Date() : null },
    });

    return count > 0 ? this.findById(id) : null;
  }
}

export const UserRepositoryProvider = provide(
  "UserRepository",
  () => new UserRepository()
);
