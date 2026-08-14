-- Soft-delete actuals.
--
-- An entry is a claim about what was spent, so removing one should leave a
-- trace rather than a hole — particularly inside a locked month, which has to
-- be able to account for what it contained. Null means live; every read filters
-- on it, so a deleted entry leaves the report and the totals together.

-- AlterTable
ALTER TABLE "actuals" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- DropIndex
DROP INDEX "actuals_userId_periodMonth_categoryId_idx";

-- CreateIndex
-- Leads with deletedAt so the common read — live rows in a month range — stays
-- one index scan rather than a scan plus a filter.
CREATE INDEX "actuals_userId_deletedAt_periodMonth_categoryId_idx" ON "actuals"("userId", "deletedAt", "periodMonth", "categoryId");

-- Reconciles drift that predates this migration: report_runs.categoryId is
-- nullable in the deployed database but the schema has always modelled it as
-- NOT NULL DEFAULT '' — "" is the sentinel for "every category", chosen because
-- Postgres treats NULLs as distinct in a unique index and a nullable column
-- would have allowed duplicate all-category runs.
--
-- The UPDATE is a guard, not a fix: the application always writes "", and the
-- deployed table currently holds zero NULLs. It costs nothing and stops the
-- ALTER failing outright if a row slips in before this runs.
UPDATE "report_runs" SET "categoryId" = '' WHERE "categoryId" IS NULL;

-- AlterTable
ALTER TABLE "report_runs" ALTER COLUMN "categoryId" SET NOT NULL,
ALTER COLUMN "categoryId" SET DEFAULT '';
