-- 마케팅봇 테이블을 공유 Neon DB 에 추가 (추가 전용 -- db push 금지)
-- 생성: prisma migrate diff (현재 Neon -> marketingbot 스키마), 모든 삭제 구문 및 비-SQL 알림 제거
-- 안전성: 오토앱 테이블/enum 을 건드리지 않음. User 에는 컬럼 2개만 ADD.
BEGIN;
-- CreateEnum
CREATE TYPE "ChannelType" AS ENUM ('INSTAGRAM', 'FACEBOOK', 'X', 'TIKTOK', 'YOUTUBE', 'THREADS', 'NAVER_BLOG', 'NAVER_CAFE', 'KAKAO', 'EMAIL', 'SMS', 'WEIBO', 'XIAOHONGSHU', 'VK', 'LINE', 'WHATSAPP', 'PINTEREST', 'DOUYIN', 'LINKEDIN', 'TISTORY', 'WORDPRESS', 'TELEGRAM', 'DISCORD');

-- CreateEnum
CREATE TYPE "ChannelStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ERROR', 'PENDING_AUTH');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ChannelTaskKind" AS ENUM ('VERIFY', 'OPEN_BROWSER');

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'SUPPORT';

-- DropForeignKey

-- DropForeignKey

-- DropForeignKey

-- DropForeignKey

-- DropForeignKey

-- DropForeignKey

-- DropForeignKey

-- DropForeignKey

-- DropForeignKey

-- DropForeignKey

-- DropForeignKey

-- DropForeignKey

-- DropForeignKey

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailPreferences" JSONB NOT NULL DEFAULT '{"failures": true, "weekly": true, "welcome": true}',
ADD COLUMN     "referredByCodeId" TEXT;

-- DropTable

-- DropTable

-- DropTable

-- DropTable

-- DropTable

-- DropTable

-- DropTable

-- DropTable

-- DropTable

-- DropTable

-- DropEnum

-- DropEnum

-- DropEnum

-- DropEnum

-- DropEnum

-- DropEnum

-- DropEnum

-- DropEnum

-- CreateTable
CREATE TABLE "UserWebhookToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "label" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserWebhookToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserWebhookHit" (
    "id" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "bucketKey" TEXT NOT NULL,
    "bucketType" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserWebhookHit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignDraft" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slot" TEXT NOT NULL DEFAULT 'campaign',
    "payload" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrustedDevice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "TrustedDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'FREE',
    "logoUrl" TEXT,
    "brandColor" TEXT DEFAULT '#1D1D1B',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceMember" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "invitedBy" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'FREE',
    "status" TEXT NOT NULL DEFAULT 'active',
    "currentPeriodEnd" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "License" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'FREE',
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "License_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingChannel" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "type" "ChannelType" NOT NULL,
    "accountName" TEXT NOT NULL,
    "encryptedCredentials" TEXT NOT NULL,
    "status" "ChannelStatus" NOT NULL DEFAULT 'PENDING_AUTH',
    "region" TEXT NOT NULL DEFAULT 'korea',
    "language" TEXT NOT NULL DEFAULT 'ko',
    "lastUsedAt" TIMESTAMP(3),
    "lastVerifiedAt" TIMESTAMP(3),
    "verifyError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelVerifyTask" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "kind" "ChannelTaskKind" NOT NULL DEFAULT 'VERIFY',
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "errorLog" TEXT,
    "agentId" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChannelVerifyTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "seriesId" TEXT,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledTask" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "mediaUrls" JSONB,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "executedAt" TIMESTAMP(3),
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "errorLog" TEXT,
    "agentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignSeries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "name" TEXT NOT NULL,
    "channelIds" JSONB NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'POOL',
    "captionStyle" TEXT DEFAULT 'VARY',
    "contentCategory" TEXT DEFAULT 'SNS',
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
    "notifiedCompletedAt" TIMESTAMP(3),
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignSeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentInstance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "machineId" TEXT NOT NULL,
    "name" TEXT,
    "version" TEXT NOT NULL,
    "os" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
CREATE TABLE "Reseller" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "taxStatus" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
    "businessNumber" TEXT,
    "bankAccount" TEXT,
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.10,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reseller_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "resellerId" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralCommission" (
    "id" TEXT NOT NULL,
    "resellerId" TEXT NOT NULL,
    "referredUserId" TEXT NOT NULL,
    "periodYearMonth" TEXT NOT NULL,
    "baseRevenue" DECIMAL(12,2) NOT NULL,
    "commissionRate" DOUBLE PRECISION NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralCommission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerClient" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "industry" TEXT,
    "monthlyFee" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceInvitation" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "token" TEXT NOT NULL,
    "invitedBy" TEXT NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "acceptedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerClientReport" (
    "id" TEXT NOT NULL,
    "partnerClientId" TEXT NOT NULL,
    "periodYearMonth" TEXT NOT NULL,
    "totalCampaigns" INTEGER NOT NULL DEFAULT 0,
    "totalPublished" INTEGER NOT NULL DEFAULT 0,
    "totalFailed" INTEGER NOT NULL DEFAULT 0,
    "channelMix" JSONB,
    "topPerformingCampaign" TEXT,
    "pdfUrl" TEXT,
    "pdfSizeKb" INTEGER,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedBy" TEXT NOT NULL DEFAULT 'cron',
    "status" TEXT NOT NULL DEFAULT 'READY',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerClientReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "link" TEXT,
    "metadata" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientInvoice" (
    "id" TEXT NOT NULL,
    "partnerClientId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "periodYearMonth" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "vat" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "dueDate" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "paymentNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "authKey" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaptionTemplate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "name" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "hashtags" TEXT,
    "category" TEXT,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaptionTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "link" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserNotificationChannel" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "webhookUrl" TEXT NOT NULL,
    "label" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "kindFilter" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "UserNotificationChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "context" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserWebhookToken_token_key" ON "UserWebhookToken"("token");

-- CreateIndex
CREATE INDEX "UserWebhookToken_userId_idx" ON "UserWebhookToken"("userId");

-- CreateIndex
CREATE INDEX "UserWebhookHit_updatedAt_idx" ON "UserWebhookHit"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserWebhookHit_tokenId_bucketKey_bucketType_key" ON "UserWebhookHit"("tokenId", "bucketKey", "bucketType");

-- CreateIndex
CREATE INDEX "CampaignDraft_updatedAt_idx" ON "CampaignDraft"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignDraft_userId_slot_key" ON "CampaignDraft"("userId", "slot");

-- CreateIndex
CREATE INDEX "TrustedDevice_userId_idx" ON "TrustedDevice"("userId");

-- CreateIndex
CREATE INDEX "TrustedDevice_expiresAt_idx" ON "TrustedDevice"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");

-- CreateIndex
CREATE INDEX "Workspace_ownerId_idx" ON "Workspace"("ownerId");

-- CreateIndex
CREATE INDEX "WorkspaceMember_userId_idx" ON "WorkspaceMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceMember_workspaceId_userId_key" ON "WorkspaceMember"("workspaceId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeCustomerId_key" ON "Subscription"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "Subscription_stripeCustomerId_idx" ON "Subscription"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE UNIQUE INDEX "License_key_key" ON "License"("key");

-- CreateIndex
CREATE INDEX "License_userId_idx" ON "License"("userId");

-- CreateIndex
CREATE INDEX "MarketingChannel_userId_idx" ON "MarketingChannel"("userId");

-- CreateIndex
CREATE INDEX "MarketingChannel_userId_workspaceId_idx" ON "MarketingChannel"("userId", "workspaceId");

-- CreateIndex
CREATE INDEX "MarketingChannel_type_idx" ON "MarketingChannel"("type");

-- CreateIndex
CREATE INDEX "MarketingChannel_region_idx" ON "MarketingChannel"("region");

-- CreateIndex
CREATE INDEX "ChannelVerifyTask_channelId_idx" ON "ChannelVerifyTask"("channelId");

-- CreateIndex
CREATE INDEX "ChannelVerifyTask_status_createdAt_idx" ON "ChannelVerifyTask"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ChannelVerifyTask_kind_status_idx" ON "ChannelVerifyTask"("kind", "status");

-- CreateIndex
CREATE INDEX "Campaign_userId_idx" ON "Campaign"("userId");

-- CreateIndex
CREATE INDEX "Campaign_userId_workspaceId_idx" ON "Campaign"("userId", "workspaceId");

-- CreateIndex
CREATE INDEX "Campaign_seriesId_idx" ON "Campaign"("seriesId");

-- CreateIndex
CREATE INDEX "Campaign_tags_idx" ON "Campaign"("tags");

-- CreateIndex
CREATE INDEX "ScheduledTask_campaignId_idx" ON "ScheduledTask"("campaignId");

-- CreateIndex
CREATE INDEX "ScheduledTask_channelId_idx" ON "ScheduledTask"("channelId");

-- CreateIndex
CREATE INDEX "ScheduledTask_status_scheduledAt_idx" ON "ScheduledTask"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "CampaignSeries_userId_idx" ON "CampaignSeries"("userId");

-- CreateIndex
CREATE INDEX "CampaignSeries_userId_workspaceId_idx" ON "CampaignSeries"("userId", "workspaceId");

-- CreateIndex
CREATE INDEX "CampaignSeries_tags_idx" ON "CampaignSeries"("tags");

-- CreateIndex
CREATE INDEX "CampaignSeries_status_nextRunAt_idx" ON "CampaignSeries"("status", "nextRunAt");

-- CreateIndex
CREATE UNIQUE INDEX "AgentInstance_machineId_key" ON "AgentInstance"("machineId");

-- CreateIndex
CREATE INDEX "AgentInstance_userId_idx" ON "AgentInstance"("userId");

-- CreateIndex
CREATE INDEX "AgentInstance_userId_workspaceId_idx" ON "AgentInstance"("userId", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "UserAiConfig_userId_key" ON "UserAiConfig"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TranslationCache_hash_key" ON "TranslationCache"("hash");

-- CreateIndex
CREATE INDEX "TranslationCache_expiresAt_idx" ON "TranslationCache"("expiresAt");

-- CreateIndex
CREATE INDEX "AiUsageCounter_scope_monthKey_idx" ON "AiUsageCounter"("scope", "monthKey");

-- CreateIndex
CREATE UNIQUE INDEX "AiUsageCounter_scope_kind_engine_monthKey_key" ON "AiUsageCounter"("scope", "kind", "engine", "monthKey");

-- CreateIndex
CREATE UNIQUE INDEX "Reseller_userId_key" ON "Reseller"("userId");

-- CreateIndex
CREATE INDEX "Reseller_status_idx" ON "Reseller"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralCode_code_key" ON "ReferralCode"("code");

-- CreateIndex
CREATE INDEX "ReferralCode_resellerId_idx" ON "ReferralCode"("resellerId");

-- CreateIndex
CREATE INDEX "ReferralCode_active_idx" ON "ReferralCode"("active");

-- CreateIndex
CREATE INDEX "ReferralCommission_resellerId_status_idx" ON "ReferralCommission"("resellerId", "status");

-- CreateIndex
CREATE INDEX "ReferralCommission_periodYearMonth_idx" ON "ReferralCommission"("periodYearMonth");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralCommission_resellerId_referredUserId_periodYearMont_key" ON "ReferralCommission"("resellerId", "referredUserId", "periodYearMonth");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerClient_workspaceId_key" ON "PartnerClient"("workspaceId");

-- CreateIndex
CREATE INDEX "PartnerClient_partnerId_status_idx" ON "PartnerClient"("partnerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceInvitation_token_key" ON "WorkspaceInvitation"("token");

-- CreateIndex
CREATE INDEX "WorkspaceInvitation_token_idx" ON "WorkspaceInvitation"("token");

-- CreateIndex
CREATE INDEX "WorkspaceInvitation_email_status_idx" ON "WorkspaceInvitation"("email", "status");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceInvitation_workspaceId_email_key" ON "WorkspaceInvitation"("workspaceId", "email");

-- CreateIndex
CREATE INDEX "PartnerClientReport_partnerClientId_periodYearMonth_idx" ON "PartnerClientReport"("partnerClientId", "periodYearMonth");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerClientReport_partnerClientId_periodYearMonth_key" ON "PartnerClientReport"("partnerClientId", "periodYearMonth");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ClientInvoice_partnerClientId_status_idx" ON "ClientInvoice"("partnerClientId", "status");

-- CreateIndex
CREATE INDEX "ClientInvoice_periodYearMonth_idx" ON "ClientInvoice"("periodYearMonth");

-- CreateIndex
CREATE UNIQUE INDEX "ClientInvoice_partnerClientId_invoiceNumber_key" ON "ClientInvoice"("partnerClientId", "invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- CreateIndex
CREATE INDEX "CaptionTemplate_userId_workspaceId_idx" ON "CaptionTemplate"("userId", "workspaceId");

-- CreateIndex
CREATE INDEX "CaptionTemplate_userId_usageCount_idx" ON "CaptionTemplate"("userId", "usageCount" DESC);

-- CreateIndex
CREATE INDEX "ActivityLog_workspaceId_createdAt_idx" ON "ActivityLog"("workspaceId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ActivityLog_userId_createdAt_idx" ON "ActivityLog"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "UserNotificationChannel_userId_enabled_idx" ON "UserNotificationChannel"("userId", "enabled");

-- CreateIndex
CREATE INDEX "UserFeedback_userId_idx" ON "UserFeedback"("userId");

-- CreateIndex
CREATE INDEX "UserFeedback_rating_createdAt_idx" ON "UserFeedback"("rating", "createdAt");

-- AddForeignKey
ALTER TABLE "UserWebhookToken" ADD CONSTRAINT "UserWebhookToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserWebhookHit" ADD CONSTRAINT "UserWebhookHit_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "UserWebhookToken"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignDraft" ADD CONSTRAINT "CampaignDraft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_referredByCodeId_fkey" FOREIGN KEY ("referredByCodeId") REFERENCES "ReferralCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustedDevice" ADD CONSTRAINT "TrustedDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "License" ADD CONSTRAINT "License_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingChannel" ADD CONSTRAINT "MarketingChannel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelVerifyTask" ADD CONSTRAINT "ChannelVerifyTask_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "MarketingChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "CampaignSeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledTask" ADD CONSTRAINT "ScheduledTask_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledTask" ADD CONSTRAINT "ScheduledTask_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "MarketingChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignSeries" ADD CONSTRAINT "CampaignSeries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentInstance" ADD CONSTRAINT "AgentInstance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAiConfig" ADD CONSTRAINT "UserAiConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reseller" ADD CONSTRAINT "Reseller_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralCode" ADD CONSTRAINT "ReferralCode_resellerId_fkey" FOREIGN KEY ("resellerId") REFERENCES "Reseller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralCommission" ADD CONSTRAINT "ReferralCommission_resellerId_fkey" FOREIGN KEY ("resellerId") REFERENCES "Reseller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerClient" ADD CONSTRAINT "PartnerClient_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Reseller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerClient" ADD CONSTRAINT "PartnerClient_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceInvitation" ADD CONSTRAINT "WorkspaceInvitation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerClientReport" ADD CONSTRAINT "PartnerClientReport_partnerClientId_fkey" FOREIGN KEY ("partnerClientId") REFERENCES "PartnerClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientInvoice" ADD CONSTRAINT "ClientInvoice_partnerClientId_fkey" FOREIGN KEY ("partnerClientId") REFERENCES "PartnerClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaptionTemplate" ADD CONSTRAINT "CaptionTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserNotificationChannel" ADD CONSTRAINT "UserNotificationChannel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFeedback" ADD CONSTRAINT "UserFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
