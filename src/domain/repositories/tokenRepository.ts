import "server-only";
import { createHash, randomBytes } from "node:crypto";

import { db } from "../decorators/service";
import { provide } from "../decorators/provider";
import { Repository } from "../decorators/repository";

/** Returned to the caller so it can be mailed. Only the hash is persisted. */
export type IssuedToken = {
  raw: string;
  expiresAt: Date;
};

const TOKEN_BYTES = 32;

// Module-private: nothing outside this file hashes or mints a token, and
// exporting them invited a second, subtly different implementation elsewhere.
// (`tokensMatch` was removed outright — it had no callers. Lookup is by the
// unique `tokenHash` column, so the database does the comparison and there is
// nothing to compare in constant time here.)
function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function newToken(ttlMinutes: number): IssuedToken & { hash: string } {
  const raw = randomBytes(TOKEN_BYTES).toString("base64url");
  return {
    raw,
    hash: hashToken(raw),
    expiresAt: new Date(Date.now() + ttlMinutes * 60_000),
  };
}

@Repository({ name: "TokenRepository" })
export class TokenRepository {
  async issueEmailVerification(
    userId: string,
    ttlMinutes = 60 * 24
  ): Promise<IssuedToken> {
    const { raw, hash, expiresAt } = newToken(ttlMinutes);

    await db().emailVerification.upsert({
      where: { userId },
      create: { userId, tokenHash: hash, expiresAt },
      update: { tokenHash: hash, expiresAt },
    });

    return { raw, expiresAt };
  }

  async consumeEmailVerification(raw: string): Promise<string | null> {
    const row = await db().emailVerification.findUnique({
      where: { tokenHash: hashToken(raw) },
    });

    if (!row || row.expiresAt < new Date()) return null;

    await db().emailVerification.delete({ where: { Id: row.Id } });
    return row.userId;
  }

  async issuePasswordReset(
    userId: string,
    ttlMinutes = 30
  ): Promise<IssuedToken> {
    const { raw, hash, expiresAt } = newToken(ttlMinutes);

    await db().passwordReset.upsert({
      where: { userId },
      create: { userId, tokenHash: hash, expiresAt },
      update: { tokenHash: hash, expiresAt },
    });

    return { raw, expiresAt };
  }

  async consumePasswordReset(raw: string): Promise<string | null> {
    const row = await db().passwordReset.findUnique({
      where: { tokenHash: hashToken(raw) },
    });

    if (!row || row.expiresAt < new Date()) return null;

    await db().passwordReset.delete({ where: { Id: row.Id } });
    return row.userId;
  }
}

export const TokenRepositoryProvider = provide(
  "TokenRepository",
  () => new TokenRepository()
);
