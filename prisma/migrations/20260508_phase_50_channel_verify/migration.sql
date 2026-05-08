-- Phase 50 — 채널 즉시 인증 (verify) task 모델 + MarketingChannel 메타 필드.
-- 발행 task (ScheduledTask) 와 분리한 이유: ScheduledTask 는 campaignId/content 가 필수.
-- 에이전트가 polling 시 verify task 도 함께 받아 IG 등 브라우저 자동화 채널을 인증.

-- 1. ChannelVerifyTask 테이블 신설
CREATE TABLE IF NOT EXISTS "ChannelVerifyTask" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "errorLog" TEXT,
    "agentId" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ChannelVerifyTask_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ChannelVerifyTask_channelId_idx" ON "ChannelVerifyTask"("channelId");
CREATE INDEX IF NOT EXISTS "ChannelVerifyTask_status_createdAt_idx" ON "ChannelVerifyTask"("status", "createdAt");

ALTER TABLE "ChannelVerifyTask"
    ADD CONSTRAINT "ChannelVerifyTask_channelId_fkey"
    FOREIGN KEY ("channelId") REFERENCES "MarketingChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. MarketingChannel — verify 메타 필드 추가 (둘 다 nullable, 기본 NULL)
ALTER TABLE "MarketingChannel" ADD COLUMN IF NOT EXISTS "lastVerifiedAt" TIMESTAMP(3);
ALTER TABLE "MarketingChannel" ADD COLUMN IF NOT EXISTS "verifyError" TEXT;
