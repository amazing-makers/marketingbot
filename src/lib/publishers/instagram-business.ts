/**
 * Instagram Graph API publisher — HTTP only (서버 측 직접 발행, 에이전트 불필요).
 *
 * 전제: 사용자 인스타그램 계정이 **Business 또는 Creator 계정** 이고
 *       **Facebook Page 에 연결**되어 있어야 함 (개인 계정 ❌).
 *
 * 자격증명 (사용자 입력):
 *   - accessToken:  Long-lived Page Access Token (60일 유효)
 *   - igUserId:     Instagram Business Account ID (Page 에 연결된 IG 계정 식별자)
 *
 * 발행 흐름 (2-step):
 *   1) POST /{ig-user-id}/media       — image_url + caption 으로 'creation_id' 받음
 *   2) POST /{ig-user-id}/media_publish — creation_id 로 실제 발행
 *
 * 이미지 요구사항:
 *   - public URL (Facebook 서버가 fetch — file:// 또는 localhost ❌)
 *   - JPEG · 8MB 이하 권장
 *   - 비율 4:5 ~ 1.91:1 (마케팅봇은 R2 + sharp 로 자동 변환)
 *
 * 토큰 발급 (사용자 가이드):
 *   1) https://developers.facebook.com → 앱 생성 (Type: Business)
 *   2) Instagram Graph API 제품 추가 + Facebook Login 추가
 *   3) Graph API Explorer 또는 'Access Token Tool' 에서 Page Access Token 발급
 *      (scope: instagram_basic + instagram_content_publish + pages_show_list + pages_read_engagement)
 *   4) /me/accounts 호출 → 페이지 ID 확인
 *   5) /{page-id}?fields=instagram_business_account → ig user id 확인
 *   6) /oauth/access_token?grant_type=fb_exchange_token 으로 long-lived 교환 (60일)
 *   7) 토큰 + ig user id 를 마케팅봇 채널 등록 폼에 입력
 */

const GRAPH_API = 'https://graph.facebook.com/v21.0';

export interface InstagramBusinessCredentials {
    accessToken: string;
    igUserId: string;
}

export interface InstagramPublishInput {
    credentials: InstagramBusinessCredentials;
    /** 본문 caption — 인스타 한도 2200 chars, 해시태그 최대 30개. */
    caption: string;
    /** public 이미지 URL (1장). 비디오/캐러셀은 v2 에서 지원. */
    imageUrl?: string;
    /** public 비디오 URL (.mp4). REELS 또는 단일 비디오. */
    videoUrl?: string;
    /** 비디오면 'REELS' 권장 (피드 비디오는 단일 사용 시 권장 안 함). */
    mediaType?: 'IMAGE' | 'VIDEO' | 'REELS';
}

export interface InstagramPublishResult {
    creationId: string;
    mediaId: string;
    permalink?: string;
    raw?: any;
}

const IG_CAPTION_LIMIT = 2200;

/**
 * 1단계: media container 생성 — creation_id 반환.
 */
async function createMediaContainer(creds: InstagramBusinessCredentials, input: InstagramPublishInput): Promise<string> {
    const params = new URLSearchParams();
    params.set('access_token', creds.accessToken);
    params.set('caption', input.caption);

    if (input.videoUrl) {
        params.set('media_type', input.mediaType || 'REELS');
        params.set('video_url', input.videoUrl);
    } else if (input.imageUrl) {
        params.set('image_url', input.imageUrl);
    } else {
        throw new Error('이미지 URL 또는 비디오 URL 이 필요합니다');
    }

    const res = await fetch(`${GRAPH_API}/${creds.igUserId}/media`, {
        method: 'POST',
        body: params,
        signal: AbortSignal.timeout(60000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.id) {
        throw new Error(`인스타 container 생성 실패 (${res.status}): ${JSON.stringify(data?.error || data).slice(0, 300)}`);
    }
    return data.id as string;
}

/**
 * 2단계: container 를 실제 발행 — media_id 반환.
 *
 * 비디오는 처리 시간이 걸려서 container 가 'FINISHED' 상태가 될 때까지 폴링 필요.
 * 이미지는 보통 즉시 발행 가능하지만 안전하게 status 한 번 체크.
 */
async function publishContainer(creds: InstagramBusinessCredentials, creationId: string): Promise<string> {
    // 비디오 등 처리 대기 — status_code 확인 (최대 60초, 5초 간격)
    for (let i = 0; i < 12; i++) {
        const statusRes = await fetch(`${GRAPH_API}/${creationId}?fields=status_code&access_token=${creds.accessToken}`, {
            signal: AbortSignal.timeout(15000),
        });
        const statusData = await statusRes.json().catch(() => ({}));
        const code = statusData?.status_code;
        if (code === 'FINISHED' || code === 'PUBLISHED') break;
        if (code === 'ERROR' || code === 'EXPIRED') {
            throw new Error(`인스타 미디어 처리 실패: status_code=${code}`);
        }
        await new Promise(r => setTimeout(r, 5000));
    }

    const params = new URLSearchParams();
    params.set('creation_id', creationId);
    params.set('access_token', creds.accessToken);
    const pubRes = await fetch(`${GRAPH_API}/${creds.igUserId}/media_publish`, {
        method: 'POST',
        body: params,
        signal: AbortSignal.timeout(30000),
    });
    const pubData = await pubRes.json().catch(() => ({}));
    if (!pubRes.ok || !pubData?.id) {
        throw new Error(`인스타 발행 실패 (${pubRes.status}): ${JSON.stringify(pubData?.error || pubData).slice(0, 300)}`);
    }
    return pubData.id as string;
}

/**
 * 메인 발행 함수 — container 생성 + 발행 2-step.
 */
export async function publishToInstagramBusiness(input: InstagramPublishInput): Promise<InstagramPublishResult> {
    const { credentials, caption } = input;
    if (!credentials.accessToken) throw new Error('Instagram accessToken 누락');
    if (!credentials.igUserId) throw new Error('Instagram igUserId 누락');
    if (!caption?.trim()) throw new Error('caption 이 비어있음');
    if (caption.length > IG_CAPTION_LIMIT) {
        throw new Error(`인스타 caption 한도 ${IG_CAPTION_LIMIT}자 초과 (현재 ${caption.length}자)`);
    }
    if (!input.imageUrl && !input.videoUrl) {
        throw new Error('인스타는 이미지 또는 비디오가 필수입니다');
    }

    const creationId = await createMediaContainer(credentials, input);
    const mediaId = await publishContainer(credentials, creationId);

    // permalink 조회 (실패해도 무시)
    let permalink: string | undefined;
    try {
        const r = await fetch(`${GRAPH_API}/${mediaId}?fields=permalink&access_token=${credentials.accessToken}`, {
            signal: AbortSignal.timeout(10000),
        });
        const d = await r.json().catch(() => ({}));
        if (d?.permalink) permalink = d.permalink;
    } catch { /* ignore */ }

    return { creationId, mediaId, permalink };
}

/**
 * 자격증명 검증 — IG Business Account 조회 (username/followers).
 * 토큰 만료/권한 부족 즉시 잡아냄.
 */
export async function verifyInstagramBusinessCredentials(
    accessToken: string,
    igUserId: string,
): Promise<{
    ok: boolean;
    username?: string;
    followers?: number;
    error?: string;
}> {
    if (!accessToken) return { ok: false, error: 'accessToken 누락' };
    if (!igUserId) return { ok: false, error: 'igUserId 누락' };
    try {
        const r = await fetch(
            `${GRAPH_API}/${igUserId}?fields=username,followers_count&access_token=${accessToken}`,
            { signal: AbortSignal.timeout(15000) },
        );
        const data = await r.json().catch(() => ({}));
        if (!r.ok || !data?.username) {
            const msg = data?.error?.message || `HTTP ${r.status}`;
            return { ok: false, error: `IG 계정 조회 실패: ${msg}` };
        }
        return {
            ok: true,
            username: data.username,
            followers: data.followers_count,
        };
    } catch (e: any) {
        return { ok: false, error: e?.message || '네트워크 오류' };
    }
}
