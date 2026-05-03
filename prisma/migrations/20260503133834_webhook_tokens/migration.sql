-- UserWebhookToken + UserWebhookHit (외부 트리거 — sns-auto-platform webhook.py 포팅)
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

CREATE UNIQUE INDEX "UserWebhookToken_token_key" ON "UserWebhookToken"("token");
CREATE INDEX "UserWebhookToken_userId_idx" ON "UserWebhookToken"("userId");

ALTER TABLE "UserWebhookToken"
  ADD CONSTRAINT "UserWebhookToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "UserWebhookHit" (
    "id" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "bucketKey" TEXT NOT NULL,
    "bucketType" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserWebhookHit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserWebhookHit_tokenId_bucketKey_bucketType_key"
  ON "UserWebhookHit"("tokenId", "bucketKey", "bucketType");
CREATE INDEX "UserWebhookHit_updatedAt_idx" ON "UserWebhookHit"("updatedAt");

ALTER TABLE "UserWebhookHit"
  ADD CONSTRAINT "UserWebhookHit_tokenId_fkey"
  FOREIGN KEY ("tokenId") REFERENCES "UserWebhookToken"("id") ON DELETE CASCADE ON UPDATE CASCADE;
