-- Phase 50 — 같은 PC 에서 비밀번호 없이 다른 계정으로 전환하기 위한 trusted device token.
-- raw token 은 클라이언트의 httpOnly cookie 에만, DB 에는 bcrypt 해시만.
-- 7일 만료. 같은 user 의 한 PC 당 1개 (충분), 여러 user 가 같은 PC 를 쓰면 user 별 1개씩.

CREATE TABLE IF NOT EXISTS "TrustedDevice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    CONSTRAINT "TrustedDevice_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TrustedDevice_userId_idx" ON "TrustedDevice"("userId");
CREATE INDEX IF NOT EXISTS "TrustedDevice_expiresAt_idx" ON "TrustedDevice"("expiresAt");

ALTER TABLE "TrustedDevice"
    ADD CONSTRAINT "TrustedDevice_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
