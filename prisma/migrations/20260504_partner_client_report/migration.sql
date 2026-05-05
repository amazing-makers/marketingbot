-- Phase 19 — PartnerClientReport (월간 자동 PDF 리포트)

CREATE TABLE IF NOT EXISTS "PartnerClientReport" (
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

CREATE UNIQUE INDEX IF NOT EXISTS "PartnerClientReport_partnerClientId_periodYearMonth_key"
    ON "PartnerClientReport"("partnerClientId", "periodYearMonth");

CREATE INDEX IF NOT EXISTS "PartnerClientReport_partnerClientId_periodYearMonth_idx"
    ON "PartnerClientReport"("partnerClientId", "periodYearMonth");

ALTER TABLE "PartnerClientReport"
    ADD CONSTRAINT "PartnerClientReport_partnerClientId_fkey"
    FOREIGN KEY ("partnerClientId") REFERENCES "PartnerClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
