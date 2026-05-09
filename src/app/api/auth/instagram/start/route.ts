/**
 * Phase 50 — Instagram (Facebook) OAuth flow 시작 endpoint.
 *
 * 사용자가 마케팅봇 채널 페이지에서 'Facebook 으로 연동' 버튼 클릭 → 이 endpoint 진입
 *   → Facebook OAuth dialog 로 redirect
 *   → 사용자 승인 후 /api/auth/instagram/callback 으로 돌아옴
 *
 * 환경변수 (운영자가 Vercel 에 1회 등록):
 *   META_APP_ID:     Meta Developer App ID
 *   META_APP_SECRET: Meta Developer App Secret (callback 에서만 사용)
 *   NEXTAUTH_URL:    https://marketingbot.amakers.co.kr (redirect_uri 기준)
 *
 * Meta App 의 Valid OAuth Redirect URIs 에 다음 등록 필요:
 *   https://marketingbot.amakers.co.kr/api/auth/instagram/callback
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';

const SCOPE = [
  'instagram_basic',
  'instagram_content_publish',
  'pages_show_list',
  'pages_read_engagement',
].join(',');

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/login?next=/dashboard/channels', req.url));
  }

  const appId = process.env.META_APP_ID;
  if (!appId) {
    return NextResponse.json(
      { error: 'META_APP_ID 환경변수 미설정. 운영자가 Vercel 에 등록해야 합니다.' },
      { status: 500 },
    );
  }

  const baseUrl = process.env.NEXTAUTH_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`;
  const redirectUri = `${baseUrl}/api/auth/instagram/callback`;

  // CSRF state — 30분 짧은 cookie 로 보관, callback 에서 검증.
  const state = randomBytes(16).toString('hex');
  const c = await cookies();
  c.set('mb_ig_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 60,
  });

  // 사용자가 redirect 후 어디로 돌아갈지 — 채널 페이지 기본
  const nextPath = req.nextUrl.searchParams.get('next') || '/dashboard/channels';
  c.set('mb_ig_oauth_next', nextPath, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 60,
  });

  const dialog = new URL('https://www.facebook.com/v21.0/dialog/oauth');
  dialog.searchParams.set('client_id', appId);
  dialog.searchParams.set('redirect_uri', redirectUri);
  dialog.searchParams.set('state', state);
  dialog.searchParams.set('scope', SCOPE);
  dialog.searchParams.set('response_type', 'code');

  return NextResponse.redirect(dialog.toString());
}
