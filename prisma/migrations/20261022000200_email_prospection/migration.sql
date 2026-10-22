-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('draft', 'approved', 'scheduled', 'sending', 'sent', 'failed', 'cancelled', 'suppressed');

-- CreateEnum
CREATE TYPE "EmailAttemptOutcome" AS ENUM ('pending', 'accepted', 'simulated', 'temporary_failure', 'permanent_failure', 'uncertain');

-- CreateTable
CREATE TABLE "email_queue" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "recipientKey" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "companyUrl" TEXT,
    "mockupUrl" TEXT,
    "personalization" TEXT,
    "prospectId" TEXT,
    "status" "EmailStatus" NOT NULL DEFAULT 'draft',
    "version" INTEGER NOT NULL DEFAULT 1,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "approvalMode" TEXT,
    "notBefore" TIMESTAMP(3),
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "simulated" BOOLEAN NOT NULL DEFAULT false,
    "retryAt" TIMESTAMP(3),
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "reviewRequired" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "intervalMinutes" INTEGER NOT NULL DEFAULT 300,
    "dailyLimit" INTEGER NOT NULL DEFAULT 2,
    "startMinute" INTEGER NOT NULL DEFAULT 540,
    "endMinute" INTEGER NOT NULL DEFAULT 1080,
    "weekdays" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5]::INTEGER[],
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Paris',
    "resumeAfter" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "workerHeartbeat" TIMESTAMP(3),
    "retentionDays" INTEGER NOT NULL DEFAULT 90,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_send_attempts" (
    "id" TEXT NOT NULL,
    "emailId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "outcome" "EmailAttemptOutcome" NOT NULL DEFAULT 'pending',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "providerMessageId" TEXT,
    "providerCode" TEXT,
    "detail" TEXT,
    "workerId" TEXT NOT NULL,
    "settingsRevision" INTEGER NOT NULL,

    CONSTRAINT "email_send_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_suppressions" (
    "recipientKey" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "maskedEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorId" TEXT,

    CONSTRAINT "email_suppressions_pkey" PRIMARY KEY ("recipientKey")
);

-- CreateTable
CREATE TABLE "email_api_rate_limits" (
    "key" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "email_api_rate_limits_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_queue_idempotencyKey_key" ON "email_queue"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "email_queue_recipientKey_key" ON "email_queue"("recipientKey");

-- CreateIndex
CREATE INDEX "email_queue_status_scheduledAt_idx" ON "email_queue"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "email_queue_createdAt_idx" ON "email_queue"("createdAt");

-- CreateIndex
CREATE INDEX "email_send_attempts_startedAt_idx" ON "email_send_attempts"("startedAt");

-- CreateIndex
CREATE INDEX "email_send_attempts_outcome_startedAt_idx" ON "email_send_attempts"("outcome", "startedAt");

-- AddForeignKey
ALTER TABLE "email_send_attempts" ADD CONSTRAINT "email_send_attempts_emailId_fkey" FOREIGN KEY ("emailId") REFERENCES "email_queue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
