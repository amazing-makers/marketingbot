-- AI features port from sns-auto-platform
-- Adds: 10 new ChannelType enum values + UserAiConfig + TranslationCache + AiUsageCounter

-- ── ChannelType enum 확장 (글로벌 SNS + 블로그) ──
ALTER TYPE "ChannelType" ADD VALUE IF NOT EXISTS 'WEIBO';
ALTER TYPE "ChannelType" ADD VALUE IF NOT EXISTS 'XIAOHONGSHU';
ALTER TYPE "ChannelType" ADD VALUE IF NOT EXISTS 'VK';
ALTER TYPE "ChannelType" ADD VALUE IF NOT EXISTS 'LINE';
ALTER TYPE "ChannelType" ADD VALUE IF NOT EXISTS 'WHATSAPP';
ALTER TYPE "ChannelType" ADD VALUE IF NOT EXISTS 'PINTEREST';
ALTER TYPE "ChannelType" ADD VALUE IF NOT EXISTS 'DOUYIN';
ALTER TYPE "ChannelType" ADD VALUE IF NOT EXISTS 'LINKEDIN';
ALTER TYPE "ChannelType" ADD VALUE IF NOT EXISTS 'TISTORY';
ALTER TYPE "ChannelType" ADD VALUE IF NOT EXISTS 'WORDPRESS';

-- ── UserAiConfig (사용자별 AI 엔진 설정) ──
CREATE TABLE "UserAiConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "aiPriority" JSONB NOT NULL DEFAULT '["gemini","groq","ollama","claude"]',
    "aiModels" JSONB NOT NULL DEFAULT '{}',
    "aiKeysEncrypted" TEXT,
    "taskPriorities" JSONB NOT NULL DEFAULT '{}',
    "translationPriority" JSONB NOT NULL DEFAULT '["deepl","libretranslate","ai"]',
    "deeplPro" BOOLEAN NOT NULL DEFAULT false,
    "utm" JSONB NOT NULL DEFAULT '{}',
    "monthlyBudgetUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAiConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserAiConfig_userId_key" ON "UserAiConfig"("userId");

ALTER TABLE "UserAiConfig"
  ADD CONSTRAINT "UserAiConfig_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── TranslationCache (번역 캐시 — sns-auto-platform Redis 'translate:cache:*' 포팅) ──
CREATE TABLE "TranslationCache" (
    "id" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "sourceLang" TEXT NOT NULL,
    "targetLang" TEXT NOT NULL,
    "translated" TEXT NOT NULL,
    "engine" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TranslationCache_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TranslationCache_hash_key" ON "TranslationCache"("hash");
CREATE INDEX "TranslationCache_expiresAt_idx" ON "TranslationCache"("expiresAt");

-- ── AiUsageCounter (사용량 카운터 — Redis 'usage:*' 포팅, 예산 판정용) ──
CREATE TABLE "AiUsageCounter" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "engine" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "monthKey" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiUsageCounter_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiUsageCounter_scope_kind_engine_monthKey_key"
  ON "AiUsageCounter"("scope", "kind", "engine", "monthKey");
CREATE INDEX "AiUsageCounter_scope_monthKey_idx"
  ON "AiUsageCounter"("scope", "monthKey");
