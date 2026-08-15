import { describe, expect, it, vi } from "vitest";

/**
 * The two rules that stop an admin locking everybody out of the console.
 *
 * Both failures are silent and total. Demoting yourself removes the screen that
 * would undo it; a change that leaves nobody an admin removes it for everyone.
 * Neither throws anything at the time, and nobody notices until the next person
 * needs the console — by which point no account can reach it and the only fix
 * is a hand-written `UPDATE` against production.
 *
 * The two are asserted differently on purpose, because they refuse at different
 * moments. Self-demotion is refused before any write, so the assertion is that
 * `setRole` was never called. The last-admin rule is checked *after* the write
 * and relies on the transaction rolling back — before the write it could never
 * fire, since an admin acting on a different admin always starts from two. So
 * its assertion is that the method threw, which is what triggers the rollback.
 *
 * Runnable without Postgres for the same two reasons the lock suite is:
 * `AdminService` takes its repositories as constructor parameters with provider
 * defaults, and `@Transactional` joins an existing transaction rather than
 * opening one, so mocking `$transaction` to invoke its callback runs the real
 * method body with no connection behind it.
 */

vi.mock("@/domain/infra/prisma", () => ({
  default: {
    $transaction: async (run: (tx: unknown) => Promise<unknown>) => run({}),
  },
}));

const { AdminService } = await import("@/domain/services/adminService");
const { ValidationError, NotFoundError } = await import(
  "@/domain/decorators/global"
);
const { Role } = await import("../../generated/prisma/client");

const ADMIN = "user_admin";
const OTHER_ADMIN = "user_admin_2";
const MEMBER = "user_member";

/** The fields `updateUser` reads off the stored row, as the model exposes them. */
function storedUser(id: string, role: "USER" | "ADMIN", verified = true) {
  return {
    Id: id,
    Role: role,
    isVerified: verified,
  };
}

/**
 * A `UserRepository` stub carrying only what this service touches.
 *
 * `adminsAfterWrite` is what `countByRole` returns, and it is named for when it
 * is read: the service counts admins only once, after applying a role change.
 * A test describing "this demotion emptied the console" sets it to zero.
 */
function repositories(options: {
  users: Record<string, ReturnType<typeof storedUser>>;
  adminsAfterWrite: number;
}) {
  const setRole = vi.fn(async () => null);
  const setEmailVerified = vi.fn(async () => null);

  const users = {
    findById: vi.fn(async (id: string) => options.users[id] ?? null),
    findWithFootprint: vi.fn(async (id: string) => options.users[id] ?? null),
    countByRole: vi.fn(async () => options.adminsAfterWrite),
    setRole,
    setEmailVerified,
  };

  return { users, setRole, setEmailVerified };
}

function service(stubs: ReturnType<typeof repositories>) {
  // Positional, matching the constructor: the second parameter is the
  // AdminRepository, which none of these paths reaches.
  return new AdminService(stubs.users as never, {} as never);
}

describe("AdminService.updateUser", () => {
  it("refuses to change the actor's own role, and writes nothing", async () => {
    const stubs = repositories({
      users: { [ADMIN]: storedUser(ADMIN, "ADMIN") },
      // Plenty of admins left, so the other rule is not what refuses this.
      adminsAfterWrite: 2,
    });

    await expect(
      service(stubs).updateUser(ADMIN, ADMIN, { role: Role.USER })
    ).rejects.toThrow(ValidationError);

    expect(stubs.setRole).not.toHaveBeenCalled();
  });

  it("refuses a demotion that would leave no admin at all", async () => {
    const stubs = repositories({
      users: { [OTHER_ADMIN]: storedUser(OTHER_ADMIN, "ADMIN") },
      // Nobody holds the role once this write lands.
      adminsAfterWrite: 0,
    });

    // Throwing is the assertion: it is what rolls the write back. Checking that
    // `setRole` was skipped would assert the opposite of how this rule works.
    await expect(
      service(stubs).updateUser(ADMIN, OTHER_ADMIN, { role: Role.USER })
    ).rejects.toThrow(ValidationError);
  });

  it("demotes an admin while another one remains", async () => {
    const stubs = repositories({
      users: { [OTHER_ADMIN]: storedUser(OTHER_ADMIN, "ADMIN") },
      adminsAfterWrite: 1,
    });

    await service(stubs).updateUser(ADMIN, OTHER_ADMIN, { role: Role.USER });

    expect(stubs.setRole).toHaveBeenCalledWith(OTHER_ADMIN, Role.USER);
  });

  it("promotes a member", async () => {
    const stubs = repositories({
      users: { [MEMBER]: storedUser(MEMBER, "USER") },
      adminsAfterWrite: 2,
    });

    await service(stubs).updateUser(ADMIN, MEMBER, { role: Role.ADMIN });

    expect(stubs.setRole).toHaveBeenCalledWith(MEMBER, Role.ADMIN);
  });

  it("ignores a role write that changes nothing", async () => {
    const stubs = repositories({
      users: { [OTHER_ADMIN]: storedUser(OTHER_ADMIN, "ADMIN") },
      // Re-sending the role somebody already holds is not a demotion, so it
      // must not be refused — and must not count admins to find that out.
      adminsAfterWrite: 0,
    });

    await service(stubs).updateUser(ADMIN, OTHER_ADMIN, { role: Role.ADMIN });

    expect(stubs.setRole).not.toHaveBeenCalled();
    expect(stubs.users.countByRole).not.toHaveBeenCalled();
  });

  it("clears a verification stamp, and can set one back", async () => {
    const stubs = repositories({
      users: { [MEMBER]: storedUser(MEMBER, "USER", true) },
      adminsAfterWrite: 2,
    });

    await service(stubs).updateUser(ADMIN, MEMBER, { verified: false });
    expect(stubs.setEmailVerified).toHaveBeenCalledWith(MEMBER, false);

    stubs.users.findById.mockResolvedValue(storedUser(MEMBER, "USER", false));
    await service(stubs).updateUser(ADMIN, MEMBER, { verified: true });
    expect(stubs.setEmailVerified).toHaveBeenLastCalledWith(MEMBER, true);
  });

  it("reports an unknown user as not found", async () => {
    const stubs = repositories({ users: {}, adminsAfterWrite: 2 });

    await expect(
      service(stubs).updateUser(ADMIN, "nobody", { role: Role.ADMIN })
    ).rejects.toThrow(NotFoundError);
  });
});
