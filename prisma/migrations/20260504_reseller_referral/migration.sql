-- Phase 13 — Reseller / ReferralCode / ReferralCommission

-- 1. Reseller 테이블
CREATE TABLE IF NOT EXISTS "Reseller" (
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

CREATE UNIQUE INDEX IF NOT EXISTS "Reseller_userId_key" ON "Reseller"("userId");
CREATE INDEX IF NOT EXISTS "Reseller_status_idx" ON "Reseller"("status");

ALTER TABLE "Reseller"
    ADD CONSTRAINT "Reseller_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. ReferralCode 테이블
CREATE TABLE IF NOT EXISTS "ReferralCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "resellerId" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReferralCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ReferralCode_code_key" ON "ReferralCode"("code");
CREATE INDEX IF NOT EXISTS "ReferralCode_resellerId_idx" ON "ReferralCode"("resellerId");
CREATE INDEX IF NOT EXISTS "ReferralCode_active_idx" ON "ReferralCode"("active");

ALTER TABLE "ReferralCode"
    ADD CONSTRAINT "ReferralCode_resellerId_fkey"
    FOREIGN KEY ("resellerId") REFERENCES "Reseller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. ReferralCommission 테이블
CREATE TABLE IF NOT EXISTS "ReferralCommission" (
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

CREATE UNIQUE INDEX IF NOT EXISTS "ReferralCommission_resellerId_referredUserId_periodYearMonth_key"
    ON "ReferralCommission"("resellerId", "referredUserId", "periodYearMonth");
CREATE INDEX IF NOT EXISTS "ReferralCommission_resellerId_status_idx"
    ON "ReferralCommission"("resellerId", "status");
CREATE INDEX IF NOT EXISTS "ReferralCommission_periodYearMonth_idx"
    ON "ReferralCommission"("periodYearMonth");

ALTER TABLE "ReferralCommission"
    ADD CONSTRAINT "ReferralCommission_resellerId_fkey"
    FOREIGN KEY ("resellerId") REFERENCES "Reseller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. User 테이블에 referredByCodeId 컬럼 추가
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referredByCodeId" TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'User_referredByCodeId_fkey'
    ) THEN
        ALTER TABLE "User"
            ADD CONSTRAINT "User_referredByCodeId_fkey"
            FOREIGN KEY ("referredByCodeId") REFERENCES "ReferralCode"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
