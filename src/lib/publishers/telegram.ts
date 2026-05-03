/**
 * Telegram Bot API publisher — HTTP only, 에이전트 불필요.
 *
 * Vercel 서버 함수에서 직접 호출 가능. 다른 SNS (IG/Naver/FB/Threads 등) 는
 * 브라우저 자동화가 필요해서 에이전트가 폴링해서 실행하지만, Telegram 은
 * 단순 HTTPS POST 만 있으면 됨.
 *
 * 자격증명:
 *   - botToken: BotFather 에서 발급 (예: 123456:ABC-DEF...)
 *   - chatId:   채널/그룹 ID. 공개 채널이면 '@my_channel', 비공개는 '-100xxx' 형식
 *
 * 발급 가이드: CHANNELS.md (sns-auto-platform) 의 Telegram 섹션 참고.
 */

export interface TelegramCredentials {
    botToken: string;
    chatId: string;
}

export interface TelegramPublishInput {
    credentials: TelegramCredentials;
    text: string;
    /** 첨부 이미지 — public URL (https://) 또는 base64 data URL. 비워두면 텍스트만. */
    photoUrl?: string;
    /** parse_mode — 'Markdown' | 'HTML' | 없음. 기본 없음 (plain). */
    parseMode?: 'Markdown' | 'HTML';
    /** 알림 끄기 (silent 발송). 기본 false. */
    disableNotification?: boolean;
}

export interface TelegramPublishResult {
    /** Telegram message_id (dedupe·재시도 식별용). */
    messageId: number;
    /** 발행 시각 (epoch sec). */
    date: number;
    /** Telegram 응답 raw (디버깅용). */
    raw?: any;
}

const API_BASE = 'https://api.telegram.org';

/**
 * 텍스트(or 텍스트+사진) 발송. 이미지가 있으면 sendPhoto, 없으면 sendMessage.
 *
 * 4096자 제한 — sendMessage 한도. 초과 시 분할 발송 (sendPhoto 캡션은 1024자 제한 → 캡션은 1024로 자르고 나머지는 후속 sendMessage).
 */
export async function publishToTelegram(input: TelegramPublishInput): Promise<TelegramPublishResult> {
    const { credentials, text, photoUrl, parseMode, disableNotification } = input;
    const { botToken, chatId } = credentials;

    if (!botToken || !chatId) {
        throw new Error('Telegram 자격증명 누락 (botToken/chatId)');
    }

    if (photoUrl) {
        // sendPhoto — caption 최대 1024자
        const caption = text.length > 1024 ? text.slice(0, 1020) + '\n…' : text;
        const r = await fetch(`${API_BASE}/bot${botToken}/sendPhoto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                photo: photoUrl,
                caption,
                parse_mode: parseMode,
                disable_notification: !!disableNotification,
            }),
            signal: AbortSignal.timeout(60000),
        });
        const data = await r.json();
        if (!r.ok || !data.ok) {
            throw new Error(`Telegram sendPhoto ${r.status}: ${data.description || JSON.stringify(data).slice(0, 200)}`);
        }
        return {
            messageId: data.result.message_id,
            date: data.result.date,
            raw: data.result,
        };
    }

    // sendMessage — 최대 4096자. 그 이상이면 분할.
    if (text.length <= 4096) {
        const r = await fetch(`${API_BASE}/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text,
                parse_mode: parseMode,
                disable_notification: !!disableNotification,
            }),
            signal: AbortSignal.timeout(60000),
        });
        const data = await r.json();
        if (!r.ok || !data.ok) {
            throw new Error(`Telegram sendMessage ${r.status}: ${data.description || JSON.stringify(data).slice(0, 200)}`);
        }
        return {
            messageId: data.result.message_id,
            date: data.result.date,
            raw: data.result,
        };
    }

    // 분할 발송 — 4000자 단위, 첫 메시지의 messageId 만 반환
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += 4000) chunks.push(text.slice(i, i + 4000));
    let firstMsgId = 0;
    let firstDate = 0;
    for (let idx = 0; idx < chunks.length; idx++) {
        const chunk = chunks[idx];
        const r = await fetch(`${API_BASE}/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: chunk + (idx < chunks.length - 1 ? '\n…(계속)' : ''),
                parse_mode: parseMode,
                disable_notification: !!disableNotification,
            }),
            signal: AbortSignal.timeout(60000),
        });
        const data = await r.json();
        if (!r.ok || !data.ok) {
            throw new Error(`Telegram sendMessage(분할 ${idx + 1}/${chunks.length}) ${r.status}: ${data.description || ''}`);
        }
        if (idx === 0) {
            firstMsgId = data.result.message_id;
            firstDate = data.result.date;
        }
    }
    return { messageId: firstMsgId, date: firstDate };
}

/**
 * 자격증명 검증 — getMe 호출. 토큰 유효성만 빠르게 확인.
 */
export async function verifyTelegramCredentials(botToken: string): Promise<{
    ok: boolean;
    username?: string;
    error?: string;
}> {
    if (!botToken) return { ok: false, error: 'botToken 누락' };
    try {
        const r = await fetch(`${API_BASE}/bot${botToken}/getMe`, {
            signal: AbortSignal.timeout(15000),
        });
        const data = await r.json();
        if (!r.ok || !data.ok) {
            return { ok: false, error: data.description || `HTTP ${r.status}` };
        }
        return { ok: true, username: data.result?.username };
    } catch (e: any) {
        return { ok: false, error: e?.message || '네트워크 오류' };
    }
}
