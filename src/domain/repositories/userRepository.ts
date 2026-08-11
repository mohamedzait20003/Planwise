import "server-only";

import { db } from "../decorators/service";
import { UserModel } from "../models/userModel";
import { provide } from "../decorators/provider";
import { Repository } from "../decorators/repository";
import type { AuthProvider, Role } from "../../../generated/prisma/client";

/**
 * The only place that reads or writes the users table.
 *
 * Note `db()` rather than an imported `prisma`: inside a `@Transactional()`
 * service method this returns the transaction client, so these queries enlist
 * automatically. Importing the client directly would silently escape the
 * transaction and survive a rollback.
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
}

export const UserRepositoryProvider = provide(
  "UserRepository",
  () => new UserRepository()
);
