-- Phase 8-2 — CampaignSeries (자동화 시리즈)
CREATE TABLE IF NOT EXISTS "CampaignSeries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channelIds" JSONB NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'POOL_VARY',
    "scheduleType" TEXT NOT NULL DEFAULT 'DAILY',
    "intervalHours" INTEGER,
    "dailyTimes" JSONB,
    "weeklyDays" JSONB,
    "totalPosts" INTEGER NOT NULL DEFAULT 10,
    "completedPosts" INTEGER NOT NULL DEFAULT 0,
    "failedPosts" INTEGER NOT NULL DEFAULT 0,
    "mediaPool" JSONB,
    "contentSeed" TEXT,
    "briefData" JSONB,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "startAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "lastRunAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignSeries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CampaignSeries_userId_idx" ON "CampaignSeries"("userId");
CREATE INDEX IF NOT EXISTS "CampaignSeries_status_nextRunAt_idx" ON "CampaignSeries"("status", "nextRunAt");

ALTER TABLE "CampaignSeries" ADD CONSTRAINT "CampaignSeries_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
