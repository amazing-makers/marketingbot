-- CampaignDraft 모델 추가 (30초 idle 자동 저장 — sns-auto-platform drafts.py 포팅)
CREATE TABLE "CampaignDraft" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slot" TEXT NOT NULL DEFAULT 'campaign',
    "payload" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignDraft_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CampaignDraft_userId_slot_key" ON "CampaignDraft"("userId", "slot");
CREATE INDEX "CampaignDraft_updatedAt_idx" ON "CampaignDraft"("updatedAt");

ALTER TABLE "CampaignDraft"
  ADD CONSTRAINT "CampaignDraft_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
