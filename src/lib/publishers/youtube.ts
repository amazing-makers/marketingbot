/**
 * YouTube publisher — STUB (현재는 알림만, 실제 업로드 X).
 *
 * 동영상 업로드의 복잡도:
 *   - YouTube Data API v3 videos.insert (resumable upload, multipart)
 *   - quota 1600 unit/upload (free 10000/day → 6 영상/일)
 *   - Vercel serverless 함수 50MB body 한도 — 영상 파일 직접 업로드 불가
 *   - 인프라 필요: R2 에 영상 먼저 업로드 → Edge Function 또는 Workers 가
 *     resumable upload → YouTube. 또는 사용자 PC 의 에이전트가 직접 업로드.
 *
 * 이번 라운드 동작:
 *   - 동영상 파일/URL 이 있으면: "사용자 알림 — YouTube Studio 에서 수동 업로드 후 게시" 메시지
 *   - 텍스트만 있으면: Community Post API 시도 (1000+ 구독자 채널 필요)
 *
 * 향후 (Phase 7):
 *   - 에이전트(Tauri) 가 사용자 PC 의 영상을 직접 업로드 — Vercel quota 우회
 *   - 또는 R2 + chunked upload via background job
 */

const API_BASE = 'https://www.googleapis.com/youtube/v3';

export interface YouTubeCredentials {
    /** OAuth 2.0 access token (Google) */
    accessToken: string;
    refreshToken?: string;
    clientId?: string;
    clientSecret?: string;
    /** YouTube channel ID (UCxxxxxx). /channels?mine=true 로 자동 추출 가능 */
    channelId?: string;
}

export interface YouTubePublishInput {
    credentials: YouTubeCredentials;
    text: string;
    /** 동영상 URL (R2 또는 외부) — 현재 stub: 업로드 안 하고 사용자 안내만 */
    videoUrl?: string;
    /** 이미지 URL — Community Post 첨부 가능 (1000+ 구독자) */
    photoUrl?: string;
    title?: string;
}

export interface YouTubePublishResult {
    /** 'community' = community post 발행됨, 'manual' = 수동 업로드 안내 */
    mode: 'community' | 'manual';
    postId?: string;
    /** 사용자에게 보여줄 안내 메시지 */
    message: string;
    studioUrl?: string;
}

/**
 * 발행 시도. 동영상 있으면 manual upload 안내, 텍스트/이미지면 community post 시도.
 *
 * Community Post 는 v3 의 'activities' 또는 'communityPosts' (별도 API) — 표준 API 에서는 직접
 * 노출 안 됨. 일부 endpoint 가 closed beta. 따라서 현재 stub: 무조건 manual upload 메시지.
 */
export async function publishToYouTube(input: YouTubePublishInput): Promise<YouTubePublishResult> {
    const { credentials, text, videoUrl } = input;
    if (!credentials.accessToken) throw new Error('YouTube accessToken 누락');
    if (!text?.trim() && !videoUrl) throw new Error('text 또는 videoUrl 둘 중 하나 필요');

    // channel 정보 확인 (인증 검증 겸)
    const r = await fetch(`${API_BASE}/channels?part=snippet&mine=true`, {
        headers: { Authorization: `Bearer ${credentials.accessToken}` },
        signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) {
        const errText = await r.text().catch(() => '');
        throw new Error(`YouTube /channels ${r.status}: ${errText.slice(0, 200)}`);
    }
    const data = await r.json();
    const channelId = data?.items?.[0]?.id || credentials.channelId;
    const channelTitle = data?.items?.[0]?.snippet?.title;

    // 현재 stub — 자동 업로드 미구현
    const studioUrl = videoUrl
        ? `https://studio.youtube.com/channel/${channelId || 'UC'}/videos/upload?d=ud`
        : `https://studio.youtube.com/channel/${channelId || 'UC'}/community`;

    return {
        mode: 'manual',
        message: videoUrl
            ? `📺 YouTube 자동 업로드 미지원 (Phase 7 예정).\n채널: ${channelTitle || channelId}\n영상 URL 다운로드 후 YouTube Studio 에서 수동 업로드해주세요.\n캠페인 본문은 동영상 설명에 복사해 사용하세요.`
            : `📺 YouTube Community Post 자동 발행은 1000+ 구독자 채널만 가능 (closed API).\n채널: ${channelTitle || channelId}\n수동 게시: ${studioUrl}`,
        studioUrl,
    };
}

/**
 * 자격증명 검증 — /channels?mine=true 호출.
 */
export async function verifyYouTubeCredentials(accessToken: string): Promise<{
    ok: boolean;
    channelId?: string;
    channelTitle?: string;
    subscribers?: number;
    error?: string;
}> {
    if (!accessToken) return { ok: false, error: 'accessToken 누락' };
    try {
        const r = await fetch(`${API_BASE}/channels?part=snippet,statistics&mine=true`, {
            headers: { Authorization: `Bearer ${accessToken}` },
            signal: AbortSignal.timeout(15000),
        });
        if (!r.ok) {
            const errText = await r.text().catch(() => '');
            return { ok: false, error: `HTTP ${r.status}: ${errText.slice(0, 100)}` };
        }
        const data = await r.json();
        const item = data?.items?.[0];
        return {
            ok: true,
            channelId: item?.id,
            channelTitle: item?.snippet?.title,
            subscribers: Number(item?.statistics?.subscriberCount || 0),
        };
    } catch (e: any) {
        return { ok: false, error: e?.message || '네트워크 오류' };
    }
}
