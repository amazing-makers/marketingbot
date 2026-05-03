/**
 * Discord webhook publisher — HTTP only, 에이전트 불필요.
 *
 * 채널 설정에서 webhook URL 만 받으면 됨 (OAuth/Bot 토큰 불필요).
 *
 * 자격증명:
 *   - webhookUrl: https://discord.com/api/webhooks/{id}/{token}
 *
 * 발급 가이드:
 *   1. Discord 서버 → 채널 설정 → 연동 → 웹후크 → 새 웹후크
 *   2. 이름·아바타 설정 후 "웹후크 URL 복사"
 *   3. 그 URL 을 채널 등록 폼에 붙여넣기
 *
 * 한도:
 *   - content: 2000자 (초과 시 분할 발송)
 *   - 첨부 image: embed.image.url 또는 multipart file (URL 방식만 지원)
 *   - rate limit: 채널당 5 msg / 5초 (Discord 측 자동 429 응답, 우리는 재시도 안함)
 */

export interface DiscordCredentials {
    webhookUrl: string;
    /** 발신자명 (선택). 미설정 시 webhook 기본 이름. */
    username?: string;
    /** 발신자 아바타 URL (선택). */
    avatarUrl?: string;
}

export interface DiscordPublishInput {
    credentials: DiscordCredentials;
    text: string;
    /** 첨부 이미지 — public URL. 비워두면 텍스트만. */
    photoUrl?: string;
    /** 메시지를 임베드(embed) 카드로 보낼지 여부. true 면 풍부한 카드, false 면 일반 메시지. */
    asEmbed?: boolean;
    /** 임베드 제목 (asEmbed=true 일 때만). */
    embedTitle?: string;
    /** 임베드 색상 (10진수 정수, 예 0x5865F2 = Discord blurple). */
    embedColor?: number;
}

export interface DiscordPublishResult {
    /** Discord message ID (dedupe·재시도 식별용). */
    messageId: string;
    /** webhook ID. */
    webhookId?: string;
    /** 응답 raw (디버깅용). */
    raw?: any;
}

/**
 * Discord webhook URL 형식 검증 — 외부 입력 sanity check.
 */
function isValidWebhookUrl(url: string): boolean {
    return /^https:\/\/(discord|discordapp)\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+/.test(url);
}

/**
 * 메시지 발송. 이미지가 있으면 embed.image 로 첨부, asEmbed=false 면 일반 텍스트.
 *
 * 2000자 초과 시 분할 — 첫 메시지 ID 만 반환.
 * `?wait=true` 쿼리로 동기 응답 받음 (message_id 추출 위해).
 */
export async function publishToDiscord(input: DiscordPublishInput): Promise<DiscordPublishResult> {
    const { credentials, text, photoUrl, asEmbed, embedTitle, embedColor } = input;
    const { webhookUrl, username, avatarUrl } = credentials;

    if (!webhookUrl) throw new Error('Discord 자격증명 누락 (webhookUrl)');
    if (!isValidWebhookUrl(webhookUrl)) {
        throw new Error('Discord webhookUrl 형식 오류 — https://discord.com/api/webhooks/{id}/{token} 형태여야 합니다.');
    }

    const endpoint = webhookUrl.includes('?') ? `${webhookUrl}&wait=true` : `${webhookUrl}?wait=true`;

    // 임베드 모드 — 이미지/제목 강조
    if (asEmbed || photoUrl) {
        const embedText = text.length > 4096 ? text.slice(0, 4090) + '\n…' : text;
        const body: any = {
            username,
            avatar_url: avatarUrl,
            embeds: [{
                title: embedTitle || undefined,
                description: embedText,
                color: embedColor ?? 0x5865F2, // Discord blurple
                ...(photoUrl ? { image: { url: photoUrl } } : {}),
                timestamp: new Date().toISOString(),
            }],
        };
        const r = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(60000),
        });
        if (!r.ok) {
            const errText = await r.text().catch(() => '');
            throw new Error(`Discord webhook ${r.status}: ${errText.slice(0, 200) || 'no body'}`);
        }
        const data = await r.json().catch(() => null);
        return {
            messageId: data?.id || '',
            webhookId: data?.webhook_id,
            raw: data,
        };
    }

    // 일반 메시지 모드 — 2000자 한도
    if (text.length <= 2000) {
        const r = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: text,
                username,
                avatar_url: avatarUrl,
            }),
            signal: AbortSignal.timeout(60000),
        });
        if (!r.ok) {
            const errText = await r.text().catch(() => '');
            throw new Error(`Discord webhook ${r.status}: ${errText.slice(0, 200)}`);
        }
        const data = await r.json().catch(() => null);
        return {
            messageId: data?.id || '',
            webhookId: data?.webhook_id,
            raw: data,
        };
    }

    // 분할 발송 — 1900자 단위 (안전 마진), 첫 messageId 만 반환
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += 1900) chunks.push(text.slice(i, i + 1900));
    let firstId = '';
    let firstWebhookId = '';
    for (let idx = 0; idx < chunks.length; idx++) {
        const chunk = chunks[idx];
        const r = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: chunk + (idx < chunks.length - 1 ? '\n…(계속)' : ''),
                username,
                avatar_url: avatarUrl,
            }),
            signal: AbortSignal.timeout(60000),
        });
        if (!r.ok) {
            const errText = await r.text().catch(() => '');
            throw new Error(`Discord webhook(분할 ${idx + 1}/${chunks.length}) ${r.status}: ${errText.slice(0, 200)}`);
        }
        if (idx === 0) {
            const data = await r.json().catch(() => null);
            firstId = data?.id || '';
            firstWebhookId = data?.webhook_id || '';
        }
    }
    return { messageId: firstId, webhookId: firstWebhookId };
}

/**
 * webhook URL 검증 — GET /webhooks/{id}/{token} 으로 메타 조회.
 * 토큰 유효성·존재 여부 확인.
 */
export async function verifyDiscordCredentials(webhookUrl: string): Promise<{
    ok: boolean;
    name?: string;
    channelId?: string;
    error?: string;
}> {
    if (!webhookUrl) return { ok: false, error: 'webhookUrl 누락' };
    if (!isValidWebhookUrl(webhookUrl)) {
        return { ok: false, error: 'webhook URL 형식 오류' };
    }
    try {
        const r = await fetch(webhookUrl, {
            method: 'GET',
            signal: AbortSignal.timeout(15000),
        });
        if (!r.ok) {
            const errText = await r.text().catch(() => '');
            return { ok: false, error: `HTTP ${r.status}: ${errText.slice(0, 100)}` };
        }
        const data = await r.json();
        return {
            ok: true,
            name: data?.name,
            channelId: data?.channel_id,
        };
    } catch (e: any) {
        return { ok: false, error: e?.message || '네트워크 오류' };
    }
}
