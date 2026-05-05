-- Phase 18 — Workspace data isolation (additive only)
-- 4개 모델에 workspaceId nullable 컬럼 + 복합 인덱스 추가.
-- null 은 사용자 개인 작업 (호환성). 새로 만들어지는 데이터부터 currentWorkspaceId 자동 저장.

-- 1. MarketingChannel
ALTER TABLE "MarketingChannel" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
CREATE INDEX IF NOT EXISTS "MarketingChannel_userId_workspaceId_idx" ON "MarketingChannel"("userId", "workspaceId");

-- 2. Campaign
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
CREATE INDEX IF NOT EXISTS "Campaign_userId_workspaceId_idx" ON "Campaign"("userId", "workspaceId");

-- 3. CampaignSeries
ALTER TABLE "CampaignSeries" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
CREATE INDEX IF NOT EXISTS "CampaignSeries_userId_workspaceId_idx" ON "CampaignSeries"("userId", "workspaceId");

-- 4. AgentInstance
ALTER TABLE "AgentInstance" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
CREATE INDEX IF NOT EXISTS "AgentInstance_userId_workspaceId_idx" ON "AgentInstance"("userId", "workspaceId");
