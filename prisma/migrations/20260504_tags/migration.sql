-- Phase 26 — Campaign·CampaignSeries 에 tags TEXT[] 추가

ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "CampaignSeries" ADD COLUMN IF NOT EXISTS "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- GIN 인덱스 (배열 검색 효율 ↑)
CREATE INDEX IF NOT EXISTS "Campaign_tags_idx" ON "Campaign" USING GIN ("tags");
CREATE INDEX IF NOT EXISTS "CampaignSeries_tags_idx" ON "CampaignSeries" USING GIN ("tags");
