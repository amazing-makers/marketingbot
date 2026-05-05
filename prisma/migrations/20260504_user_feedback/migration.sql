-- Phase 25 — UserFeedback (5점 평가 + 코멘트)

CREATE TABLE IF NOT EXISTS "UserFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "context" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserFeedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "UserFeedback_userId_idx" ON "UserFeedback"("userId");
CREATE INDEX IF NOT EXISTS "UserFeedback_rating_createdAt_idx" ON "UserFeedback"("rating", "createdAt");

ALTER TABLE "UserFeedback"
    ADD CONSTRAINT "UserFeedback_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
