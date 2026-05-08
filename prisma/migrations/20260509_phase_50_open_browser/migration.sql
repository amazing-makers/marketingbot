-- Phase 50 — ChannelVerifyTask 에 kind 컬럼 추가 (VERIFY | OPEN_BROWSER).
-- OPEN_BROWSER: 사용자가 마케팅봇 채널 카드 클릭 → 에이전트가 저장된 세션으로 브라우저 띄움.

DO $$ BEGIN
  CREATE TYPE "ChannelTaskKind" AS ENUM ('VERIFY', 'OPEN_BROWSER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "ChannelVerifyTask"
  ADD COLUMN IF NOT EXISTS "kind" "ChannelTaskKind" NOT NULL DEFAULT 'VERIFY';

CREATE INDEX IF NOT EXISTS "ChannelVerifyTask_kind_status_idx"
  ON "ChannelVerifyTask"("kind", "status");
