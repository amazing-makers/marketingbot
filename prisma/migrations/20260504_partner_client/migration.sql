-- Phase 14 — PartnerClient (파트너가 대행 관리하는 고객사)

CREATE TABLE IF NOT EXISTS "PartnerClient" (
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

CREATE UNIQUE INDEX IF NOT EXISTS "PartnerClient_workspaceId_key" ON "PartnerClient"("workspaceId");
CREATE INDEX IF NOT EXISTS "PartnerClient_partnerId_status_idx" ON "PartnerClient"("partnerId", "status");

ALTER TABLE "PartnerClient"
    ADD CONSTRAINT "PartnerClient_partnerId_fkey"
    FOREIGN KEY ("partnerId") REFERENCES "Reseller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PartnerClient"
    ADD CONSTRAINT "PartnerClient_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
