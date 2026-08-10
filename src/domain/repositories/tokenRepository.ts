import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { db } from "../decorators/service";
import { provide } from "../decorators/provider";
import { Repository } from "../decorators/repository";

export type IssuedToken = {
  raw: string;
  expiresAt: Date;
};

const TOKEN_BYTES = 32;

export function hashToken(raw: string): string {
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

export function tokensMatch(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
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

export const tokenRepository = provide(
  "TokenRepository",
  () => new TokenRepository()
);
