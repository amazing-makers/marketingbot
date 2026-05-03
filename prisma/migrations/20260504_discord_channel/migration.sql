-- DISCORD 채널 추가 (HTTP-only webhook — Vercel 서버에서 직접 publish, 에이전트 불필요)
ALTER TYPE "ChannelType" ADD VALUE IF NOT EXISTS 'DISCORD';
