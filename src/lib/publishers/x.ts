/**
 * X (Twitter) API v2 publisher — text-only.
 *
 * 인증: OAuth 2.0 User Context (Bearer token).
 *   - 사용자가 X Developer Portal 에서 앱 생성 → User OAuth 2.0 access token 발급
 *   - 또는 https://developer.x.com 의 Token Generator (앱 owner 본인 계정용)
 *   - scope: tweet.read tweet.write users.read offline.access (refresh 가능 시)
 *
 * 한도:
 *   - Free tier: 월 1500 tweet 개인 (Basic $100/월: 10K tweet, Pro $5K/월: 무제한)
 *   - text 280 chars (한국어/이모지 unicode 카운팅)
 *
 * 이미지 첨부:
 *   - v1.1 media/upload (multipart) → media_id 받아서 v2/tweets media.media_ids 로 첨부
 *   - 이번 라운드는 text-only. 이미지는 v2 로 미루고 데이터 URL 의 photoUrl 은 무시.
 *
 * 토큰 만료:
 *   - User OAuth 2.0 access token 은 2시간 짧음. refresh_token 으로 갱신 필요.
 *   - 사용자가 직접 매번 갱신하면 운영 어려움 → 향후 OAuth flow + refresh 자동화 필요.
 *   - 단기 운영용: 60일 유효한 PAT (Personal Access Token) 같은 게 X 에는 없음.
 *   - 401 응답 시 채널 status PENDING_AUTH 로 전환해 사용자 갱신 유도.
 */

const API_BASE = 'https://api.twitter.com';

export interface XCredentials {
    /** OAuth 2.0 User Context bearer token (사용자 access token) */
    accessToken: string;
    /** refresh_token (선택). 만료 시 자동 갱신 (clientId/clientSecret 도 필요). */
    refreshToken?: string;
    clientId?: string;
    clientSecret?: string;
}

export interface XPublishInput {
    credentials: XCredentials;
    text: string;
    /** v2: 이미지 첨부 — 미구현 (media_id 별도 업로드 필요) */
    photoUrl?: string;
    /** reply_to_tweet_id — 스레드 게시 (선택) */
    replyTo?: string;
}

export interface XPublishResult {
    tweetId: string;
    text?: string;
    raw?: any;
}

/**
 * X UTF-16 글자 카운트 — Twitter 는 weighted 280 카운팅 (한글/이모지=2, 영문=1).
 * 정확한 weighted count 가 필요한 경우 twitter-text 라이브러리 권장.
 * 여기서는 단순 length 기준 (≈ 280 한자=140 한글 정도, 보수적 cut).
 */
function exceedsLimit(text: string): boolean {
    // 한글/일본어/중국어 문자는 2 weight 로 가산. 단순 검사 — 정확하진 않지만 보수적.
    let weighted = 0;
    for (const ch of text) {
        const code = ch.codePointAt(0) || 0;
        if (code > 0x1100) weighted += 2; // 비라틴 문자 = 2
        else weighted += 1;
    }
    return weighted > 280;
}

/**
 * 텍스트 게시.
 */
export async function publishToX(input: XPublishInput): Promise<XPublishResult> {
    const { credentials, text, replyTo } = input;
    if (!credentials.accessToken) throw new Error('X accessToken 누락');
    if (!text?.trim()) throw new Error('본문이 비어있음');
    if (exceedsLimit(text)) {
        throw new Error(`X 본문 280 weighted chars 초과 (한글 1자 = 2 weight). 축약 필요`);
    }

    const body: any = { text };
    if (replyTo) body.reply = { in_reply_to_tweet_id: replyTo };

    const r = await fetch(`${API_BASE}/2/tweets`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${credentials.accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000),
    });
    if (!r.ok) {
        const errText = await r.text().catch(() => '');
        // 401: 토큰 만료 (호출 측에서 PENDING_AUTH 전환)
        // 403: scope 부족 (write scope 없음)
        // 429: rate limit (월 1500 free tier 도달 등)
        throw new Error(`X /2/tweets ${r.status}: ${errText.slice(0, 300)}`);
    }
    const data = await r.json();
    if (!data?.data?.id) throw new Error(`X 응답 형식 오류: ${JSON.stringify(data).slice(0, 200)}`);
    return {
        tweetId: data.data.id,
        text: data.data.text,
        raw: data,
    };
}

/**
 * 자격증명 검증 — /2/users/me 호출.
 */
export async function verifyXCredentials(accessToken: string): Promise<{
    ok: boolean;
    username?: string;
    userId?: string;
    error?: string;
}> {
    if (!accessToken) return { ok: false, error: 'accessToken 누락' };
    try {
        const r = await fetch(`${API_BASE}/2/users/me`, {
            headers: { Authorization: `Bearer ${accessToken}` },
            signal: AbortSignal.timeout(15000),
        });
        if (!r.ok) {
            const errText = await r.text().catch(() => '');
            return { ok: false, error: `HTTP ${r.status}: ${errText.slice(0, 100)}` };
        }
        const data = await r.json();
        return {
            ok: true,
            username: data?.data?.username,
            userId: data?.data?.id,
        };
    } catch (e: any) {
        return { ok: false, error: e?.message || '네트워크 오류' };
    }
}

/**
 * refresh_token 으로 access_token 갱신 (clientId/clientSecret + offline.access scope 필요).
 * 향후 cron 으로 자동 호출 (만료 임박 토큰 갱신).
 */
export async function refreshXToken(credentials: XCredentials): Promise<{ accessToken: string; refreshToken?: string; expiresIn?: number }> {
    if (!credentials.refreshToken || !credentials.clientId) {
        throw new Error('refresh_token 또는 clientId 없음 — 자동 갱신 불가');
    }
    const r = await fetch(`${API_BASE}/2/oauth2/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            ...(credentials.clientSecret ? { Authorization: `Basic ${Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString('base64')}` } : {}),
        },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: credentials.refreshToken,
            client_id: credentials.clientId,
        }),
        signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) {
        const errText = await r.text().catch(() => '');
        throw new Error(`X refresh ${r.status}: ${errText.slice(0, 200)}`);
    }
    const data = await r.json();
    return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
    };
}
