/**
 * Phase 50 — Instagram OAuth callback.
 *
 * 흐름:
 *   1. CSRF state 검증 (cookie ↔ query param)
 *   2. code → short-lived user access token 교환
 *   3. user token → long-lived (60일) token 교환
 *   4. /me/accounts → 사용자가 관리하는 Facebook Page 목록
 *   5. 페이지마다 /{page-id}?fields=instagram_business_account 조회
 *   6. IG Business Account 발견 시 MarketingChannel upsert (encryptedCredentials 에 page-token + ig_id 저장)
 *   7. /dashboard/channels 로 redirect (성공 메시지 query param)
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { encryptJSON } from '@/lib/crypto/aes';
import { getActiveWorkspaceFilter } from '@/lib/workspace/scope';

const GRAPH = 'https://graph.facebook.com/v21.0';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const error = req.nextUrl.searchParams.get('error');
  const errorDesc = req.nextUrl.searchParams.get('error_description');

  const c = await cookies();
  const stateCookie = c.get('mb_ig_oauth_state')?.value;
  const nextPath = c.get('mb_ig_oauth_next')?.value || '/dashboard/channels';
  c.delete('mb_ig_oauth_state');
  c.delete('mb_ig_oauth_next');

  // 사용자가 Facebook 에서 거부한 경우
  if (error) {
    return NextResponse.redirect(buildResultUrl(req, nextPath, 'error', errorDesc || error));
  }

  if (!code) {
    return NextResponse.redirect(buildResultUrl(req, nextPath, 'error', 'code 누락'));
  }
  if (!state || state !== stateCookie) {
    return NextResponse.redirect(buildResultUrl(req, nextPath, 'error', 'CSRF state 불일치 — 다시 시도해주세요'));
  }

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) {
    return NextResponse.redirect(buildResultUrl(req, nextPath, 'error', 'META_APP_ID/SECRET 미설정 — 운영자에게 문의'));
  }

  const baseUrl = process.env.NEXTAUTH_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`;
  const redirectUri = `${baseUrl}/api/auth/instagram/callback`;

  try {
    // 1) code → short-lived user access token
    const shortRes = await fetch(
      `${GRAPH}/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`,
      { signal: AbortSignal.timeout(15000) },
    );
    const shortData = await shortRes.json();
    if (!shortRes.ok || !shortData.access_token) {
      throw new Error(`code 교환 실패: ${shortData.error?.message || shortRes.status}`);
    }
    const shortUserToken: string = shortData.access_token;

    // 2) short → long-lived user token (60일)
    const longRes = await fetch(
      `${GRAPH}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortUserToken}`,
      { signal: AbortSignal.timeout(15000) },
    );
    const longData = await longRes.json();
    if (!longRes.ok || !longData.access_token) {
      throw new Error(`long-lived 교환 실패: ${longData.error?.message || longRes.status}`);
    }
    const longUserToken: string = longData.access_token;

    // 3) /me/accounts — 페이지 목록 + 페이지별 page access token (long-lived 자동 적용됨)
    const pagesRes = await fetch(
      `${GRAPH}/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${longUserToken}`,
      { signal: AbortSignal.timeout(15000) },
    );
    const pagesData = await pagesRes.json();
    if (!pagesRes.ok) {
      throw new Error(`/me/accounts 실패: ${pagesData.error?.message || pagesRes.status}`);
    }
    const pages: Array<{ id: string; name: string; access_token: string; instagram_business_account?: { id: string } }> =
      pagesData.data || [];
    const igPages = pages.filter(p => p.instagram_business_account?.id);
    if (igPages.length === 0) {
      return NextResponse.redirect(
        buildResultUrl(
          req,
          nextPath,
          'error',
          'Instagram Business 계정이 연결된 Facebook 페이지가 없습니다. 인스타 → 설정 → 계정 → 프로페셔널 계정으로 전환 후 페이지 연결 필요.',
        ),
      );
    }

    // 4) 각 IG Business 계정마다 username 조회 + MarketingChannel upsert
    const user = session.user;
    const filter = await getActiveWorkspaceFilter(user.id!);
    const created: string[] = [];

    for (const page of igPages) {
      const igId = page.instagram_business_account!.id;
      const pageToken = page.access_token;

      // username 조회
      let username = '';
      try {
        const r = await fetch(
          `${GRAPH}/${igId}?fields=username&access_token=${pageToken}`,
          { signal: AbortSignal.timeout(10000) },
        );
        const d = await r.json();
        username = d?.username || '';
      } catch { /* ignore */ }

      const accountName = username ? `@${username}` : `IG ${igId}`;
      const credentials = {
        accessToken: pageToken,
        igUserId: igId,
        pageId: page.id,
        pageName: page.name,
      };

      // 같은 igUserId 가 이미 있으면 token 갱신, 없으면 신규 생성
      const existing = await prisma.marketingChannel.findFirst({
        where: { userId: user.id!, type: 'INSTAGRAM' },
      });
      if (existing) {
        // 모든 INSTAGRAM 채널 중 같은 igUserId 인지 확인 (encryptedCredentials decrypt 필요)
        const { decryptJSON } = await import('@/lib/crypto/aes');
        let existingMatch = null as null | typeof existing;
        const allIgChannels = await prisma.marketingChannel.findMany({
          where: { userId: user.id!, type: 'INSTAGRAM' },
        });
        for (const ch of allIgChannels) {
          try {
            const c = decryptJSON(ch.encryptedCredentials) as any;
            if (c?.igUserId === igId) { existingMatch = ch; break; }
          } catch { /* ignore */ }
        }
        if (existingMatch) {
          await prisma.marketingChannel.update({
            where: { id: existingMatch.id },
            data: {
              encryptedCredentials: encryptJSON(credentials),
              status: 'ACTIVE',
              lastVerifiedAt: new Date(),
              verifyError: null,
            },
          });
          created.push(`${accountName} (갱신)`);
          continue;
        }
      }

      await prisma.marketingChannel.create({
        data: {
          userId: user.id!,
          workspaceId: filter.workspaceId,
          type: 'INSTAGRAM',
          accountName,
          encryptedCredentials: encryptJSON(credentials),
          status: 'ACTIVE',
          lastVerifiedAt: new Date(),
          region: 'korea',
          language: 'ko',
        },
      });
      created.push(accountName);
    }

    return NextResponse.redirect(buildResultUrl(req, nextPath, 'ok', `${created.length}개 인스타 채널 연동 완료: ${created.join(', ')}`));
  } catch (e: any) {
    console.error('[instagram/callback] error', e);
    return NextResponse.redirect(buildResultUrl(req, nextPath, 'error', e?.message || '연동 중 오류'));
  }
}

function buildResultUrl(req: NextRequest, nextPath: string, status: 'ok' | 'error', detail: string): string {
  const url = new URL(nextPath, req.url);
  url.searchParams.set('ig_oauth', status);
  url.searchParams.set('ig_oauth_msg', detail);
  return url.toString();
}
