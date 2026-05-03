/**
 * LinkedIn UGC Posts API publisher — HTTP only.
 *
 * 자격증명 (사용자 직접 입력):
 *   - accessToken: OAuth 2.0 access token (r_liteprofile + w_member_social scope 포함)
 *   - authorUrn: 선택. 비워두면 /v2/me 자동 호출해서 person URN 추출.
 *                회사 페이지 발행은 'urn:li:organization:<companyId>' 형태로 직접 입력.
 *
 * 토큰 발급 (사용자 가이드):
 *   1. LinkedIn Developer Portal (https://www.linkedin.com/developers/) 에서 앱 생성
 *   2. Auth → OAuth 2.0 scopes: r_liteprofile, w_member_social, r_emailaddress
 *   3. Auth code flow 로 access token 받기
 *      - 또는 https://www.linkedin.com/developers/tools/oauth/token-generator 으로 즉시 발급 (60일 유효)
 *   4. 그 token 을 마케팅봇 채널 등록 폼에 붙여넣기
 *
 * 토큰 만료:
 *   - access token 60일 유효 (refresh token 별도 받지 않으면)
 *   - 만료 시 401 → channel.status = 'PENDING_AUTH' 로 갱신 (cron 또는 발행 실패 시)
 *
 * 한도:
 *   - commentary: 3000 chars (UGC 본문)
 *   - 미디어: image/video upload 별도 (이번 라운드는 text-only — 이미지는 v2)
 */

const API_BASE = 'https://api.linkedin.com';
const LINKEDIN_VERSION = '202401'; // RestAPI 버전 헤더 (ugcPosts 는 v2 라 불필요하지만 호환)

export interface LinkedInCredentials {
    accessToken: string;
    /** 비워두면 자동 추출 — 'urn:li:person:xxx' 또는 'urn:li:organization:xxx' */
    authorUrn?: string;
}

export interface LinkedInPublishInput {
    credentials: LinkedInCredentials;
    text: string;
    /** 이미지 URL — 향후 지원. 현재는 무시 (text-only). */
    photoUrl?: string;
    /** 'PUBLIC' (전체 공개) | 'CONNECTIONS' (1촌 한정) */
    visibility?: 'PUBLIC' | 'CONNECTIONS';
}

export interface LinkedInPublishResult {
    /** UGC post URN (urn:li:share:xxx 또는 urn:li:ugcPost:xxx) */
    postUrn: string;
    /** 외부 view URL (있으면) */
    url?: string;
    raw?: any;
}

/**
 * /v2/me 호출 → person URN 추출.
 */
async function getMeUrn(accessToken: string): Promise<string> {
    const r = await fetch(`${API_BASE}/v2/me`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0',
        },
        signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) {
        const errText = await r.text().catch(() => '');
        throw new Error(`LinkedIn /v2/me ${r.status}: ${errText.slice(0, 200)}`);
    }
    const data = await r.json();
    if (!data?.id) throw new Error('LinkedIn /v2/me 응답에 id 없음');
    return `urn:li:person:${data.id}`;
}

/**
 * UGC Posts 발행 — text-only.
 * 이미지/비디오 첨부는 LinkedIn assets 업로드 API 필요 (2-step) → 향후 강화.
 */
export async function publishToLinkedIn(input: LinkedInPublishInput): Promise<LinkedInPublishResult> {
    const { credentials, text, visibility } = input;
    if (!credentials.accessToken) throw new Error('LinkedIn accessToken 누락');
    if (!text?.trim()) throw new Error('본문이 비어있음');
    if (text.length > 3000) {
        throw new Error(`LinkedIn 본문은 3000자 한도 (현재 ${text.length}자) — 분할 또는 축약 필요`);
    }

    // author URN 결정
    let authorUrn = credentials.authorUrn;
    if (!authorUrn) {
        try {
            authorUrn = await getMeUrn(credentials.accessToken);
        } catch (e: any) {
            throw new Error(`LinkedIn author URN 자동 추출 실패: ${e?.message}. 수동으로 'urn:li:person:xxx' 입력 필요`);
        }
    }

    // UGC Post 본문 (이미지 없는 경우)
    const body = {
        author: authorUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
            'com.linkedin.ugc.ShareContent': {
                shareCommentary: { text },
                shareMediaCategory: 'NONE',
            },
        },
        visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': visibility || 'PUBLIC',
        },
    };

    const r = await fetch(`${API_BASE}/v2/ugcPosts`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${credentials.accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0',
            'Content-Type': 'application/json',
            'LinkedIn-Version': LINKEDIN_VERSION,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60000),
    });
    if (!r.ok) {
        const errText = await r.text().catch(() => '');
        throw new Error(`LinkedIn ugcPosts ${r.status}: ${errText.slice(0, 300)}`);
    }

    // 응답 헤더 'x-restli-id' 또는 응답 body 에 id 포함
    const postId = r.headers.get('x-restli-id') || (await r.json().catch(() => null))?.id;
    const postUrn = postId?.startsWith('urn:') ? postId : `urn:li:ugcPost:${postId || ''}`;

    return {
        postUrn,
        url: postId ? `https://www.linkedin.com/feed/update/${encodeURIComponent(postUrn)}` : undefined,
    };
}

/**
 * 자격증명 검증 — /v2/me 호출 (person URN 추출 겸용).
 */
export async function verifyLinkedInCredentials(accessToken: string): Promise<{
    ok: boolean;
    authorUrn?: string;
    name?: string;
    error?: string;
}> {
    if (!accessToken) return { ok: false, error: 'accessToken 누락' };
    try {
        const r = await fetch(`${API_BASE}/v2/me`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'X-Restli-Protocol-Version': '2.0.0',
            },
            signal: AbortSignal.timeout(15000),
        });
        if (!r.ok) {
            const errText = await r.text().catch(() => '');
            return { ok: false, error: `HTTP ${r.status}: ${errText.slice(0, 100)}` };
        }
        const data = await r.json();
        const name = [data?.localizedFirstName, data?.localizedLastName].filter(Boolean).join(' ');
        return {
            ok: true,
            authorUrn: data?.id ? `urn:li:person:${data.id}` : undefined,
            name: name || undefined,
        };
    } catch (e: any) {
        return { ok: false, error: e?.message || '네트워크 오류' };
    }
}
