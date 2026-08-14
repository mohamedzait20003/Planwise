import "server-only";

import { Enum } from "../decorators/enum";
import { Model, toDTO } from "../decorators/model";
import { Role, AuthProvider } from "../../../generated/prisma/client";
import type { User as PrismaUser } from "../../../generated/prisma/client";

export type UserProfile = {
    FName: string;
    LName: string;
    Email: string;
    userName: string | null;
    AvatarUrl: string | null;
};

@Model<UserModel>({
    name: "User",
    exclude: ["passwordHash", "dataVersion"],
})
export class UserModel {
    readonly Id: string;
    readonly FName: string;
    readonly LName: string;
    readonly Email: string;
    readonly userName: string | null;
    readonly AvatarUrl: string | null;

    @Enum(Role)
    readonly Role: Role;

    readonly emailVerifiedAt: Date | null;
    readonly createdAt: Date;
    readonly updatedAt: Date;

    /**
     * Bumped by every write that can move a report number. A stored run records
     * the value it computed against, so staleness is one integer compare.
     *
     * Excluded from the DTO: it is bookkeeping the client never reads, and a
     * counter that increments on every write is a write-frequency signal there
     * is no reason to publish.
     */
    readonly dataVersion: number;

    readonly passwordHash: string | null;

    constructor(row: PrismaUser) {
        this.Id = row.Id;
        this.FName = row.FName;
        this.LName = row.LName;
        this.Email = row.Email;
        this.userName = row.userName;
        this.AvatarUrl = row.AvatarUrl;
        this.Role = row.Role;
        this.emailVerifiedAt = row.emailVerifiedAt;
        this.createdAt = row.createdAt;
        this.updatedAt = row.updatedAt;
        this.dataVersion = row.dataVersion;
        this.passwordHash = row.passwordHash;
    }

    get fullName(): string {
        return `${this.FName} ${this.LName}`.trim();
    }

    get isVerified(): boolean {
        return this.emailVerifiedAt !== null;
    }

    get isAdmin(): boolean {
        return this.Role === Role.ADMIN;
    }

    get hasPassword(): boolean {
        return this.passwordHash !== null;
    }

    get profile(): UserProfile {
        return {
            FName: this.FName,
            LName: this.LName,
            Email: this.Email,
            userName: this.userName,
            AvatarUrl: this.AvatarUrl,
        };
    }

    toJSON() {
        return toDTO(this);
    }
}

/** A linked federated identity. */
@Model<OAuthAccountModel>({ name: "OAuthAccount" })
export class OAuthAccountModel {
    readonly Id: string;
    readonly userId: string;

    @Enum(AuthProvider)
    readonly provider: AuthProvider;

    readonly providerAccountId: string;
    readonly createdAt: Date;

    constructor(row: {
        Id: string;
        userId: string;
        provider: AuthProvider;
        providerAccountId: string;
        createdAt: Date;
    }) {
        this.Id = row.Id;
        this.userId = row.userId;
        this.provider = row.provider;
        this.providerAccountId = row.providerAccountId;
        this.createdAt = row.createdAt;
    }

    toJSON() {
        return toDTO(this);
    }
}
