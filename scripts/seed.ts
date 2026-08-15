import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient, Role } from "../generated/prisma/client";

/**
 * The assignment's worked example, as a signed-in account.
 *
 * Categories, plans and actuals are all scoped to a user, so there is no such
 * thing as global sample data — the seed has to create someone to own it. It
 * makes a demo account with a known password and verified email, so a reviewer
 * can sign in and see a populated report rather than an empty first-run screen.
 *
 * Everything is an upsert keyed on something stable, so running it twice
 * changes nothing. That matters because the obvious first instinct on seeing a
 * half-loaded database is to run the seed again.
 *
 *   npm run seed        (or: npx prisma db seed)
 */

// Same driver adapter the app uses, rather than Prisma's default engine —
// the schema has no `url` in its datasource block, so the connection has to
// come from an adapter here too.
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: `${process.env.DATABASE_URL}` }),
});

const DEMO_EMAIL = "demo@planwise.app";
const DEMO_PASSWORD = "planwise-demo";

/**
 * A second account, so the admin console is reachable on a fresh database.
 *
 * It owns nothing. That is the point: an admin sees who is on the platform and
 * what they have built, never what any of it was for, and an operator account
 * with its own categories and spend would blur exactly the line the console is
 * built around. Signing in as this one shows the console over the demo
 * account's footprint, which is the thing worth looking at.
 */
const ADMIN_EMAIL = "admin@planwise.app";
const ADMIN_PASSWORD = "planwise-admin";

/** Matches `BCRYPT_ROUNDS` in AuthService — the app compares against this. */
const BCRYPT_ROUNDS = 12;

/** "2026-01" → the UTC midnight the `@db.Date` column stores. */
function month(value: string): Date {
  return new Date(`${value}-01T00:00:00.000Z`);
}

async function main() {
  const user = await prisma.user.upsert({
    where: { Email: DEMO_EMAIL },
    update: {},
    create: {
      FName: "Demo",
      LName: "Reviewer",
      Email: DEMO_EMAIL,
      passwordHash: await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS),
      // Verified up front: sign-in refuses an unverified account, and there is
      // no inbox to collect the link from here.
      emailVerifiedAt: new Date(),
    },
  });

  // `update` sets the role rather than staying empty like the demo upsert:
  // re-seeding after somebody demoted this account should put the console back
  // within reach, which is the whole reason it is in the seed.
  await prisma.user.upsert({
    where: { Email: ADMIN_EMAIL },
    update: { Role: Role.ADMIN },
    create: {
      FName: "Ada",
      LName: "Operator",
      Email: ADMIN_EMAIL,
      passwordHash: await bcrypt.hash(ADMIN_PASSWORD, BCRYPT_ROUNDS),
      emailVerifiedAt: new Date(),
      Role: Role.ADMIN,
    },
  });

  const categories = await Promise.all(
    ["Marketing", "Payroll"].map((name) =>
      prisma.category.upsert({
        where: { userId_name: { userId: user.Id, name } },
        update: {},
        create: { userId: user.Id, name },
      })
    )
  );

  const byName = new Map(categories.map((c) => [c.name, c.id]));
  const marketing = byName.get("Marketing")!;
  const payroll = byName.get("Payroll")!;

  /* ---- Plans — the brief's targets ------------------------------------- */

  const plans = [
    { categoryId: marketing, periodMonth: month("2026-01"), amount: 5_000 },
    { categoryId: payroll, periodMonth: month("2026-01"), amount: 20_000 },
    { categoryId: marketing, periodMonth: month("2026-02"), amount: 5_000 },
    { categoryId: payroll, periodMonth: month("2026-02"), amount: 20_000 },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: {
        userId_categoryId_periodMonth: {
          userId: user.Id,
          categoryId: plan.categoryId,
          periodMonth: plan.periodMonth,
        },
      },
      update: { amount: plan.amount },
      create: { userId: user.Id, ...plan },
    });
  }

  /* ---- Actuals — note what is NOT here ---------------------------------- */

  const actuals = [
    { categoryId: marketing, periodMonth: month("2026-01"), amount: 4_800, note: "Q1 campaign" },
    { categoryId: payroll, periodMonth: month("2026-01"), amount: 20_500, note: "January payroll" },
    // Marketing 2026-02 is deliberately absent. The brief omits it, and it is
    // the case the whole missing-actual rule exists for: the report shows it
    // as −$5,000 / −100% with a dash in the Actual column.
    { categoryId: payroll, periodMonth: month("2026-02"), amount: 19_800, note: "February payroll" },
  ];

  // Actuals have no natural key — a category-month may hold many entries — so
  // re-running would stack duplicates. Cleared and rewritten instead.
  await prisma.actual.deleteMany({
    where: {
      userId: user.Id,
      periodMonth: { in: [month("2026-01"), month("2026-02")] },
    },
  });
  await prisma.actual.createMany({
    data: actuals.map((actual) => ({ userId: user.Id, ...actual })),
  });

  /* ---- One closed month, so the lock is visible on sight ---------------- */

  await prisma.periodLock.upsert({
    where: {
      userId_periodMonth: { userId: user.Id, periodMonth: month("2026-01") },
    },
    update: {},
    create: {
      userId: user.Id,
      periodMonth: month("2026-01"),
      note: "Signed off with finance",
    },
  });

  // Any stored report is now behind the data this seed just wrote.
  await prisma.user.update({
    where: { Id: user.Id },
    data: { dataVersion: { increment: 1 } },
  });

  console.log(`Seeded ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  console.log("  2 categories, 4 plans, 3 actuals (Marketing Feb omitted)");
  console.log("  2026-01 is locked — try editing it to see the API refuse");
  console.log(`\nAdmin console: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log("\nGenerate a report over 2026-01..2026-02 to see the brief's figures.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
