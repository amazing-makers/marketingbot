-- MarketingChannel: region + language 필드 추가 (다지역 자동 언어 라우팅)
-- 기존 행은 한국 기본값으로 채워짐 — 사용자가 채널 편집 시 변경.

ALTER TABLE "MarketingChannel" ADD COLUMN "region" TEXT NOT NULL DEFAULT 'korea';
ALTER TABLE "MarketingChannel" ADD COLUMN "language" TEXT NOT NULL DEFAULT 'ko';

CREATE INDEX "MarketingChannel_region_idx" ON "MarketingChannel"("region");
