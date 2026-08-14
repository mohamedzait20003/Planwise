-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('GOOGLE');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "Id" TEXT NOT NULL,
    "FName" TEXT NOT NULL,
    "LName" TEXT NOT NULL,
    "Email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "userName" TEXT,
    "AvatarUrl" TEXT,
    "Role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "emailVerifiedAt" TIMESTAMP(3),
    "dataVersion" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "users_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "oauth_accounts" (
    "Id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_accounts_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "password_resets" (
    "Id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "password_resets_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "email_verifications" (
    "Id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_verifications_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "periodMonth" DATE NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actuals" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "periodMonth" DATE NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "actuals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "period_locks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "periodMonth" DATE NOT NULL,
    "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "period_locks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_runs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fromMonth" DATE NOT NULL,
    "toMonth" DATE NOT NULL,
    "categoryId" TEXT NOT NULL DEFAULT '',
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "totalPlan" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalActual" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalVariance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "dataVersion" INTEGER NOT NULL DEFAULT 0,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "computedAt" TIMESTAMP(3),

    CONSTRAINT "report_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_rows" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "categoryName" TEXT NOT NULL,
    "periodMonth" DATE NOT NULL,
    "plan" DECIMAL(14,2) NOT NULL,
    "actual" DECIMAL(14,2) NOT NULL,
    "variance" DECIMAL(14,2) NOT NULL,
    "variancePct" DECIMAL(10,4),
    "hasActual" BOOLEAN NOT NULL,
    "locked" BOOLEAN NOT NULL,

    CONSTRAINT "report_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_months" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "periodMonth" DATE NOT NULL,
    "plan" DECIMAL(14,2) NOT NULL,
    "actual" DECIMAL(14,2) NOT NULL,
    "variance" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "report_months_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_Email_key" ON "users"("Email");

-- CreateIndex
CREATE UNIQUE INDEX "users_userName_key" ON "users"("userName");

-- CreateIndex
CREATE INDEX "oauth_accounts_userId_idx" ON "oauth_accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_accounts_provider_providerAccountId_key" ON "oauth_accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_accounts_userId_provider_key" ON "oauth_accounts"("userId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "password_resets_userId_key" ON "password_resets"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "password_resets_tokenHash_key" ON "password_resets"("tokenHash");

-- CreateIndex
CREATE INDEX "password_resets_expiresAt_idx" ON "password_resets"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "email_verifications_userId_key" ON "email_verifications"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "email_verifications_tokenHash_key" ON "email_verifications"("tokenHash");

-- CreateIndex
CREATE INDEX "email_verifications_expiresAt_idx" ON "email_verifications"("expiresAt");

-- CreateIndex
CREATE INDEX "categories_userId_archivedAt_idx" ON "categories"("userId", "archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "categories_userId_name_key" ON "categories"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "categories_id_userId_key" ON "categories"("id", "userId");

-- CreateIndex
CREATE INDEX "plans_userId_periodMonth_idx" ON "plans"("userId", "periodMonth");

-- CreateIndex
CREATE UNIQUE INDEX "plans_userId_categoryId_periodMonth_key" ON "plans"("userId", "categoryId", "periodMonth");

-- CreateIndex
CREATE INDEX "actuals_userId_periodMonth_categoryId_idx" ON "actuals"("userId", "periodMonth", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "period_locks_userId_periodMonth_key" ON "period_locks"("userId", "periodMonth");

-- CreateIndex
CREATE INDEX "report_runs_userId_status_idx" ON "report_runs"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "report_runs_userId_fromMonth_toMonth_categoryId_key" ON "report_runs"("userId", "fromMonth", "toMonth", "categoryId");

-- CreateIndex
CREATE INDEX "report_rows_runId_periodMonth_idx" ON "report_rows"("runId", "periodMonth");

-- CreateIndex
CREATE UNIQUE INDEX "report_months_runId_periodMonth_key" ON "report_months"("runId", "periodMonth");

-- AddForeignKey
ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_verifications" ADD CONSTRAINT "email_verifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plans" ADD CONSTRAINT "plans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plans" ADD CONSTRAINT "plans_categoryId_userId_fkey" FOREIGN KEY ("categoryId", "userId") REFERENCES "categories"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actuals" ADD CONSTRAINT "actuals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actuals" ADD CONSTRAINT "actuals_categoryId_userId_fkey" FOREIGN KEY ("categoryId", "userId") REFERENCES "categories"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "period_locks" ADD CONSTRAINT "period_locks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_runs" ADD CONSTRAINT "report_runs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_rows" ADD CONSTRAINT "report_rows_runId_fkey" FOREIGN KEY ("runId") REFERENCES "report_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_months" ADD CONSTRAINT "report_months_runId_fkey" FOREIGN KEY ("runId") REFERENCES "report_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

