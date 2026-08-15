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

/**
 * What a user has built, as counts.
 *
 * Counts and never amounts, deliberately. The product's first promise is that a
 * user sees only their own data, and an admin screen showing someone's spend
 * would break it for the sake of a number nobody needs to operate the service.
 * How many actuals exist answers "is this account in use"; what they add up to
 * answers a question an operator was never asked.
 */
export type UserFootprint = {
    categories: number;
    plans: number;
    actuals: number;
    lockedMonths: number;
    reportRuns: number;
};

/**
 * A user with their workspace footprint attached.
 *
 * A subclass rather than optional fields on `UserModel`, for the same reason
 * `PlanWithCategoryModel` is one: the counts are either guaranteed by the query
 * that built it or absent by it, never sometimes-there.
 *
 * The `@Model` options are restated rather than inherited — `toDTO` reads the
 * metadata off `instance.constructor`, so a subclass that did not redeclare
 * `exclude` would serialize the password hash.
 */
@Model<UserWithFootprintModel>({
    name: "User",
    exclude: ["passwordHash", "dataVersion"],
})
export class UserWithFootprintModel extends UserModel {
    readonly footprint: UserFootprint;

    /** Federated identities linked to this account; empty means password-only. */
    readonly providers: AuthProvider[];

    /**
     * When this user last logged an actual.
     *
     * Named for what it measures rather than "lastActiveAt". It is the most
     * recent entry, which is not the same as the last sign-in — there is no
     * session table to read that from, and a label promising it would be a
     * claim the data cannot support.
     */
    readonly lastEntryAt: Date | null;

    constructor(
        row: PrismaUser & {
            _count: {
                categories: number;
                plans: number;
                actuals: number;
                periodLocks: number;
                reportRuns: number;
            };
            oauthAccounts: { provider: AuthProvider }[];
        },
        lastEntryAt: Date | null = null
    ) {
        super(row);

        this.footprint = {
            categories: row._count.categories,
            plans: row._count.plans,
            actuals: row._count.actuals,
            lockedMonths: row._count.periodLocks,
            reportRuns: row._count.reportRuns,
        };

        this.providers = row.oauthAccounts.map((account) => account.provider);
        this.lastEntryAt = lastEntryAt;
    }

    /** True when the account can only be reached through a federated provider. */
    get isOAuthOnly(): boolean {
        return !this.hasPassword && this.providers.length > 0;
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
