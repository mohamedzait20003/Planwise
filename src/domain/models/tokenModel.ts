import "server-only";

import { Model, toDTO } from "../decorators/model";
import type {
  EmailVerification as PrismaEmailVerification,
  PasswordReset as PrismaPasswordReset,
} from "../../../generated/prisma/client";

/** Shared shape: both tables are `[userId, tokenHash, expiresAt]` with stamps. */
abstract class SingleUseToken {
  readonly Id: string;
  readonly userId: string;
  readonly tokenHash: string;
  readonly expiresAt: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  protected constructor(row: {
    Id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.Id = row.Id;
    this.userId = row.userId;
    this.tokenHash = row.tokenHash;
    this.expiresAt = row.expiresAt;
    this.createdAt = row.createdAt;
    this.updatedAt = row.updatedAt;
  }

  isExpired(now: Date = new Date()): boolean {
    return this.expiresAt < now;
  }
}

@Model<EmailVerificationModel>({
  name: "EmailVerification",
  exclude: ["tokenHash"],
})
export class EmailVerificationModel extends SingleUseToken {
  constructor(row: PrismaEmailVerification) {
    super(row);
  }

  toJSON() {
    return toDTO(this);
  }
}

@Model<PasswordResetModel>({
  name: "PasswordReset",
  exclude: ["tokenHash"],
})
export class PasswordResetModel extends SingleUseToken {
  constructor(row: PrismaPasswordReset) {
    super(row);
  }

  toJSON() {
    return toDTO(this);
  }
}
