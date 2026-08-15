import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient, Role } from "../generated/prisma/client.ts";

/**
 * Grants somebody the admin console.
 *
 *   npm run seed:admin
 *
 * Separate from `seed.ts`, and not for tidiness. That one loads sample data;
 * this one hands out the run of every account on the platform. They are
 * different acts with different blast radii, and bundling them would mean any
 * environment wanting the brief's figures also got an operator account with a
 * password published in a README — including the shared and deployed ones,
 * where that is precisely wrong. Splitting them makes granting access something
 * you have to ask for.
 *
 * It creates nothing else. An admin sees who is on the platform and what they
 * have built, never what any of it was for, so an operator account carrying its
 * own categories and spend would blur the line the console is built around.
 * Seed the demo account too and this one shows the console over *its*
 * footprint, which is the thing worth looking at.
 *
 * Idempotent, like the main seed. Re-running it also repairs the case the
 * console can otherwise talk itself into: if the last admin was demoted, this
 * is the way back in.
 */

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: `${process.env.DATABASE_URL}` }),
});

/**
 * Overridable, and deliberately so.
 *
 * The defaults are the documented local ones. Anywhere that is not a throwaway
 * database should pass its own, because the fallbacks are in a public README
 * and a password in a README is a password everybody has:
 *
 *   ADMIN_EMAIL=me@example.com ADMIN_PASSWORD='…' npm run seed:admin
 */

const EMAIL = process.env.ADMIN_EMAIL ?? "admin@planwise.app";
const PASSWORD = process.env.ADMIN_PASSWORD ?? "planwise-admin-mzaitoun";

const FIRST_NAME = process.env.ADMIN_FIRST_NAME ?? "Ada";
const LAST_NAME = process.env.ADMIN_LAST_NAME ?? "Operator";

/** Matches `BCRYPT_ROUNDS` in AuthService — the app compares against this. */
const BCRYPT_ROUNDS = 12;

async function main() {
  const existing = await prisma.user.findUnique({ where: { Email: EMAIL } });

  const user = await prisma.user.upsert({
    where: { Email: EMAIL },
    update: { Role: Role.ADMIN },
    create: {
      FName: FIRST_NAME,
      LName: LAST_NAME,
      Email: EMAIL,
      passwordHash: await bcrypt.hash(PASSWORD, BCRYPT_ROUNDS),
      emailVerifiedAt: new Date(),
      Role: Role.ADMIN,
    },
  });

  if (existing) {
    const already = existing.Role === Role.ADMIN;
    console.log(
      already
        ? `${EMAIL} was already an admin — nothing to do.`
        : `Promoted the existing account ${EMAIL} to admin.`
    );
    console.log("  Its password was left alone. Sign in with the one it has.");
  } else {
    console.log(`Created ${EMAIL} / ${PASSWORD} as an admin.`);

    if (!process.env.ADMIN_PASSWORD) {
      console.log(
        "  That password is the documented default. Set ADMIN_PASSWORD for\n" +
          "  anything that is not a throwaway database."
      );
    }
  }

  console.log(`\nSign in and open /admin/dashboard. (id: ${user.Id})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
