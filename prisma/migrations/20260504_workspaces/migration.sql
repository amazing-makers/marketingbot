-- Phase 6 — Workspace + WorkspaceMember (다중 브랜드 골격)
-- 채널/캠페인 모델은 별도 마이그레이션에서 workspaceId 추가 (호환성 위해 단계적)

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "currentWorkspaceId" TEXT;

CREATE TABLE IF NOT EXISTS "Workspace" (
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

CREATE UNIQUE INDEX IF NOT EXISTS "Workspace_slug_key" ON "Workspace"("slug");
CREATE INDEX IF NOT EXISTS "Workspace_ownerId_idx" ON "Workspace"("ownerId");

CREATE TABLE IF NOT EXISTS "WorkspaceMember" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "invitedBy" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WorkspaceMember_workspaceId_userId_key" ON "WorkspaceMember"("workspaceId", "userId");
CREATE INDEX IF NOT EXISTS "WorkspaceMember_userId_idx" ON "WorkspaceMember"("userId");

-- foreign keys
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
