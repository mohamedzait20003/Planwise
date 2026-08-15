import "server-only";

import { Service, Transactional } from "../decorators/service";
import { provide } from "../decorators/provider";
import { NotFoundError, ValidationError } from "../decorators/global";
import {
  UserRepositoryProvider,
  UserRepository,
  type UserSearch,
} from "../repositories/userRepository";
import {
  AdminRepositoryProvider,
  AdminRepository,
} from "../repositories/adminRepository";
import { dateToMonth, monthsBetween } from "../helpers/period";
import type { ListUsersDto, UpdateUserDto } from "../dtos/adminDto";
import { listUsersDto } from "../dtos/adminDto";
import type {
  PlatformOverview,
  SignupPoint,
  UserTotals,
} from "../models/adminModel";
import { Role } from "../../../generated/prisma/client";

/**
 * The operator's view of the platform.
 *
 * Two rules live here and nowhere else:
 *
 *   An admin cannot change their own role. Demoting yourself is a one-way door
 *   — the screen that would undo it is the one the demotion just took away.
 *
 *   The last admin cannot be demoted. Both rules exist because the failure is
 *   silent and total: nobody notices until the next time somebody needs the
 *   console, by which point no account can reach it.
 *
 * What is deliberately absent is as much of the design as what is here. There
 * is no endpoint that reads another user's plans, actuals or report figures.
 * The service can tell you an account has 412 entries and when the last one
 * landed; it cannot tell you what any of them were for or what they cost. The
 * product's first promise is that a user's data is theirs, and an admin screen
 * is exactly where that promise is most convenient to break.
 */

/** How far back the signups chart reaches. A year reads as a year. */
const SIGNUP_MONTHS = 12;

/** Recent failures are a worklist, not an archive. */
const FAILURE_LIMIT = 8;

/** The window "active" means, in days. */
const ACTIVE_WINDOW_DAYS = 30;

@Service({ name: "AdminService" })
export class AdminService {
  constructor(
    private readonly users: UserRepository = UserRepositoryProvider.get(),
    private readonly admin: AdminRepository = AdminRepositoryProvider.get()
  ) {}

  /**
   * Everything the dashboard renders.
   *
   * Issued together rather than one endpoint per tile: they are read at the
   * same moment by the same screen, and eight round trips to paint one page is
   * a waterfall the user pays for in blank cards.
   */
  async overview(): Promise<PlatformOverview & { activeUsers: number }> {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - ACTIVE_WINDOW_DAYS);

    const [
      total,
      verified,
      admins,
      newThisMonth,
      signupRows,
      workspace,
      queue,
      failures,
      activeUsers,
    ] = await Promise.all([
      this.users.count(),
      this.users.count({ emailVerifiedAt: { not: null } }),
      this.users.countByRole(Role.ADMIN),
      this.users.count({ createdAt: { gte: startOfMonthUtc() } }),
      this.users.signupsByMonth(SIGNUP_MONTHS),
      this.admin.workspaceTotals(),
      this.admin.queueTotals(),
      this.admin.recentFailures(FAILURE_LIMIT),
      this.admin.activeUsersSince(since),
    ]);

    const users: UserTotals = {
      total,
      verified,
      // Derived rather than counted: two queries could disagree, and one of
      // them would then be describing a user who verified in between.
      unverified: total - verified,
      admins,
      newThisMonth,
    };

    return {
      users,
      signups: fillSignupGaps(signupRows),
      workspace,
      queue,
      failures,
      activeUsers,
    };
  }

  /** One page of users. The raw query string is parsed here, against the DTO. */
  async listUsers(query: URLSearchParams | ListUsersDto) {
    const filters =
      query instanceof URLSearchParams
        ? listUsersDto.parse(Object.fromEntries(query))
        : query;

    const search: UserSearch = {
      query: filters.query || undefined,
      role: filters.role,
      verified: filters.verified,
      page: filters.page,
      perPage: filters.perPage,
    };

    return this.users.search(search);
  }

  async getUser(id: string) {
    const user = await this.users.findWithFootprint(id);
    if (!user) throw new NotFoundError("User");

    return user;
  }

  /**
   * Change a user's role or verification state.
   *
   * Transactional so the "somebody is still an admin" check below can undo the
   * write that broke it. Throwing inside the decorated method rolls the
   * transaction back, so a refusal leaves the role exactly as it was.
   */
  @Transactional()
  async updateUser(actorId: string, targetId: string, input: UpdateUserDto) {
    const target = await this.users.findById(targetId);
    if (!target) throw new NotFoundError("User");

    if (input.role !== undefined && input.role !== target.Role) {
      if (actorId === targetId) {
        throw new ValidationError(
          "You cannot change your own role. Ask another admin to do it."
        );
      }

      await this.users.setRole(targetId, input.role);
      await this.assertAnAdminRemains();
    }

    if (input.verified !== undefined && input.verified !== target.isVerified) {
      await this.users.setEmailVerified(targetId, input.verified);
    }

    // Re-read rather than patching the model in memory: the footprint is what
    // the screen shows, and the caller should get the row as it now stands.
    return this.getUser(targetId);
  }

  /**
   * Refuses a change that would leave the platform with no admin at all.
   *
   * Worth being exact about what this does and does not catch, because the
   * obvious reading is wrong. **One request from one admin can never trip it.**
   * `Auth("ADMIN")` means the actor holds the role and the rule above means the
   * target is somebody else, so the actor is still an admin after any demotion
   * they perform, and the count is never zero. A "last admin" check written the
   * usual way — counted *before* the write, refusing at one — is for that same
   * reason unreachable code that reads like a guard.
   *
   * Counting after the write is what makes the check state something true: the
   * invariant is that the platform ends with an admin, not that it started with
   * two. Two things can actually violate it. Overlapping transactions, where
   * two admins demote each other and the second to commit sees the role gone
   * from both — this catches whichever one commits second and rolls it back,
   * though at Read Committed a genuine tie can still slip through, and closing
   * that needs `SELECT … FOR UPDATE` over the admin rows or serializable
   * isolation. And any future caller not behind `Auth("ADMIN")`: a script, a
   * job, a support tool. Both are the cases where nobody is watching.
   */
  private async assertAnAdminRemains(): Promise<void> {
    if ((await this.users.countByRole(Role.ADMIN)) > 0) return;

    throw new ValidationError(
      "That would leave the platform with no admin. Promote someone else first."
    );
  }
}

/** Midnight UTC on the first of the current month. */
function startOfMonthUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/**
 * Turns the months that had signups into every month in the window.
 *
 * A quiet month is absent from a `GROUP BY`, and a bar chart that simply skips
 * it draws a narrower year with no gap in it — the axis lies about the shape of
 * the trend. The same reason `ReportService.compute` walks `monthsBetween`
 * rather than the months its rows happen to mention.
 */
function fillSignupGaps(rows: { month: Date; count: number }[]): SignupPoint[] {
  const counts = new Map(rows.map((row) => [dateToMonth(row.month), row.count]));

  const end = startOfMonthUtc();
  const start = new Date(end);
  start.setUTCMonth(start.getUTCMonth() - (SIGNUP_MONTHS - 1));

  return monthsBetween(dateToMonth(start), dateToMonth(end)).map((month) => ({
    month,
    count: counts.get(month) ?? 0,
  }));
}

export const AdminServiceProvider = provide(
  "AdminService",
  () => new AdminService()
);
