-- Phase 11 — Series mode 재구성 (4개 → 3개) + 콘텐츠 카테고리 (SNS/BLOG)
ALTER TABLE "CampaignSeries" ADD COLUMN IF NOT EXISTS "captionStyle" TEXT DEFAULT 'VARY';
ALTER TABLE "CampaignSeries" ADD COLUMN IF NOT EXISTS "contentCategory" TEXT DEFAULT 'SNS';

-- 기존 데이터 마이그레이션 (호환성 유지)
UPDATE "CampaignSeries" SET "captionStyle" = 'VARY' WHERE "mode" = 'POOL_VARY';
UPDATE "CampaignSeries" SET "captionStyle" = 'SIMILAR' WHERE "mode" = 'POOL_SIMILAR';
UPDATE "CampaignSeries" SET "mode" = 'POOL' WHERE "mode" IN ('POOL_VARY', 'POOL_SIMILAR');
UPDATE "CampaignSeries" SET "mode" = 'AI_IMAGE' WHERE "mode" = 'AI_FRESH';
-- PARAPHRASE 는 AI_IMAGE 로 변환 (이미지 없음 모드 제거됨)
UPDATE "CampaignSeries" SET "mode" = 'AI_IMAGE' WHERE "mode" = 'PARAPHRASE';
