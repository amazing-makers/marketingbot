/**
 * WordPress REST API publisher — HTTP only, 에이전트 불필요.
 *
 * 자격증명:
 *   - siteUrl:    워드프레스 사이트 base URL (예: 'https://myblog.com' 또는 'https://myblog.wordpress.com')
 *   - username:   계정 username
 *   - appPassword: Application Password (24자, 4자×6 그룹) — WP 5.6+
 *                  발급: 사이트 관리자 → 사용자 → 프로필 → "Application Passwords" 섹션
 *
 * REST API:
 *   - POST {siteUrl}/wp-json/wp/v2/media   (이미지 업로드)
 *   - POST {siteUrl}/wp-json/wp/v2/posts   (게시글 작성)
 *   - Authorization: Basic <base64(username:appPassword)>
 */

export interface WordPressCredentials {
    siteUrl: string;
    username: string;
    appPassword: string;
}

export interface WordPressPublishInput {
    credentials: WordPressCredentials;
    /** 게시글 본문. Markdown/HTML 모두 허용. WP 가 자동으로 wpautop 처리. */
    content: string;
    /** 게시글 제목. 미지정 시 본문 첫 줄을 50자 이내로 잘라 사용. */
    title?: string;
    /** 첨부 이미지 URL — public https 만. data URL 은 별도 업로드 후 URL 받아야 함. */
    photoUrl?: string;
    /** 게시 상태: 'publish' | 'draft' | 'private'. 기본 'publish'. */
    status?: 'publish' | 'draft' | 'private';
    /** 카테고리 ID 배열 (선택) */
    categories?: number[];
    /** 태그 ID 배열 (선택) */
    tags?: number[];
}

export interface WordPressPublishResult {
    /** 생성된 게시글 ID */
    postId: number;
    /** 게시글 영구 URL */
    link: string;
    /** 첨부 이미지 ID (있을 경우) */
    mediaId?: number;
}

function authHeader(creds: WordPressCredentials): string {
    const token = Buffer.from(`${creds.username}:${creds.appPassword}`).toString('base64');
    return `Basic ${token}`;
}

function normalizeSiteUrl(url: string): string {
    // 끝의 슬래시 제거 + http→https 강제 (보안 + 일관성)
    let u = url.trim().replace(/\/$/, '');
    if (u.startsWith('http://')) u = 'https://' + u.slice(7);
    if (!u.startsWith('https://')) u = 'https://' + u;
    return u;
}

function deriveTitle(content: string, fallback = '새 게시글'): string {
    const firstLine = content.split('\n')[0]?.trim() || fallback;
    return firstLine.length > 80 ? firstLine.slice(0, 77) + '…' : firstLine;
}

/**
 * 외부 URL 의 이미지를 WordPress 미디어 라이브러리로 업로드 후 첨부 ID 반환.
 * data URL 은 base64 디코딩, https URL 은 fetch 후 업로드.
 */
async function uploadImageToWordPress(
    creds: WordPressCredentials,
    photoUrl: string,
): Promise<{ id: number; sourceUrl: string }> {
    let bytes: Buffer;
    let mime = 'image/png';
    let filename = `marketingbot-${Date.now()}.png`;

    if (photoUrl.startsWith('data:')) {
        // data URL: data:image/png;base64,iVBOR...
        const match = photoUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (!match) throw new Error('data URL 형식 오류');
        mime = match[1];
        bytes = Buffer.from(match[2], 'base64');
        const ext = mime.split('/')[1] || 'png';
        filename = `marketingbot-${Date.now()}.${ext}`;
    } else if (photoUrl.startsWith('https://') || photoUrl.startsWith('http://')) {
        const r = await fetch(photoUrl, { signal: AbortSignal.timeout(60000) });
        if (!r.ok) throw new Error(`이미지 fetch 실패 ${r.status}`);
        bytes = Buffer.from(await r.arrayBuffer());
        mime = r.headers.get('content-type') || 'image/png';
        const ext = mime.split('/')[1] || 'png';
        filename = `marketingbot-${Date.now()}.${ext}`;
    } else {
        throw new Error('지원되지 않는 photoUrl 형식 (https / data:image 만)');
    }

    const siteUrl = normalizeSiteUrl(creds.siteUrl);
    // fetch body 는 Buffer 직접 안 받음 — Uint8Array (or BlobPart) 로 변환
    const r = await fetch(`${siteUrl}/wp-json/wp/v2/media`, {
        method: 'POST',
        headers: {
            Authorization: authHeader(creds),
            'Content-Type': mime,
            'Content-Disposition': `attachment; filename="${filename}"`,
        },
        body: new Uint8Array(bytes),
        signal: AbortSignal.timeout(120000),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(`media upload ${r.status}: ${data?.message || JSON.stringify(data).slice(0, 200)}`);
    return { id: data.id, sourceUrl: data.source_url };
}

/**
 * 게시글 발행. 이미지가 있으면 먼저 미디어 업로드 → featured_media 로 첨부.
 */
export async function publishToWordPress(input: WordPressPublishInput): Promise<WordPressPublishResult> {
    const { credentials, content, title, photoUrl, status = 'publish', categories, tags } = input;
    if (!credentials.siteUrl || !credentials.username || !credentials.appPassword) {
        throw new Error('WordPress 자격증명 누락 (siteUrl/username/appPassword)');
    }

    const siteUrl = normalizeSiteUrl(credentials.siteUrl);
    let mediaId: number | undefined;

    // 1. 이미지 첨부 (선택)
    if (photoUrl) {
        const uploaded = await uploadImageToWordPress(credentials, photoUrl);
        mediaId = uploaded.id;
    }

    // 2. 게시글 작성
    const body: any = {
        title: title || deriveTitle(content),
        content,  // WP 가 자동으로 markdown→HTML 변환은 안 함. 미리 변환된 HTML 또는 plain text 권장.
        status,
    };
    if (mediaId) body.featured_media = mediaId;
    if (categories?.length) body.categories = categories;
    if (tags?.length) body.tags = tags;

    const r = await fetch(`${siteUrl}/wp-json/wp/v2/posts`, {
        method: 'POST',
        headers: {
            Authorization: authHeader(credentials),
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60000),
    });
    const data = await r.json();
    if (!r.ok) {
        throw new Error(`WordPress posts ${r.status}: ${data?.message || JSON.stringify(data).slice(0, 200)}`);
    }

    return {
        postId: data.id,
        link: data.link,
        mediaId,
    };
}

/**
 * 자격증명 검증 — /users/me 호출. 인증·권한 빠르게 확인.
 */
export async function verifyWordPressCredentials(creds: WordPressCredentials): Promise<{
    ok: boolean;
    username?: string;
    error?: string;
}> {
    if (!creds.siteUrl || !creds.username || !creds.appPassword) {
        return { ok: false, error: '자격증명 누락' };
    }
    const siteUrl = normalizeSiteUrl(creds.siteUrl);
    try {
        const r = await fetch(`${siteUrl}/wp-json/wp/v2/users/me`, {
            headers: { Authorization: authHeader(creds) },
            signal: AbortSignal.timeout(15000),
        });
        const data = await r.json();
        if (!r.ok) {
            return { ok: false, error: data?.message || `HTTP ${r.status}` };
        }
        return { ok: true, username: data?.username || data?.name };
    } catch (e: any) {
        return { ok: false, error: e?.message || '네트워크 오류' };
    }
}
