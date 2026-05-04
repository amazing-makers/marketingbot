-- Phase 9 — Campaign.seriesId FK + Series 알림 컬럼
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "seriesId" TEXT;
ALTER TABLE "CampaignSeries" ADD COLUMN IF NOT EXISTS "notifiedCompletedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Campaign_seriesId_idx" ON "Campaign"("seriesId");

ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_seriesId_fkey"
    FOREIGN KEY ("seriesId") REFERENCES "CampaignSeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
