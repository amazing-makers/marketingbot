import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * CampaignDraft + TranslationCache 만료분 정리 cron.
 * 실행: 매일 03:00 KST (vercel.json schedule: '0 18 * * *' UTC = 03:00 KST)
 *
 * 정리 대상:
 *   1. CampaignDraft: 30일 이상 미수정 (사용자가 잊은 임시 저장본)
 *   2. TranslationCache: expiresAt 지난 행 (TTL 만료)
 *   3. UserWebhookHit: 7일 이상 된 카운터 버킷 (rate limit 추적은 최근 1일만 의미)
 */
const DRAFT_TTL_DAYS = 30;
const HIT_TTL_DAYS = 7;

export async function GET(req: NextRequest) {
  // 보안: Vercel Cron Secret
  const authHeader = req.headers.get("authorization");
  if (
    authHeader !== `Bearer ${process.env.CRON_SECRET}` &&
    process.env.NODE_ENV === "production"
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const draftThreshold = new Date(now.getTime() - DRAFT_TTL_DAYS * 24 * 60 * 60 * 1000);
  const hitThreshold = new Date(now.getTime() - HIT_TTL_DAYS * 24 * 60 * 60 * 1000);

  const results: Record<string, number | string> = {};

  try {
    // 1. 30일+ 미수정 CampaignDraft
    const drafts = await prisma.campaignDraft.deleteMany({
      where: { updatedAt: { lt: draftThreshold } },
    });
    results.draftsDeleted = drafts.count;
  } catch (e: any) {
    results.draftsError = e?.message || String(e);
  }

  try {
    // 2. 만료된 TranslationCache
    const cache = await prisma.translationCache.deleteMany({
      where: { expiresAt: { lt: now } },
    });
    results.translationsExpired = cache.count;
  } catch (e: any) {
    results.translationsError = e?.message || String(e);
  }

  try {
    // 3. 7일+ UserWebhookHit (rate limit 카운터)
    const hits = await prisma.userWebhookHit.deleteMany({
      where: { updatedAt: { lt: hitThreshold } },
    });
    results.webhookHitsDeleted = hits.count;
  } catch (e: any) {
    results.webhookHitsError = e?.message || String(e);
  }

  return NextResponse.json({
    ok: true,
    ...results,
    timestamp: now.toISOString(),
  });
}
