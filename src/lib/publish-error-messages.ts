/**
 * Phase 50 — 발행 실패 사유를 사용자가 즉시 이해할 수 있는 한국어 메시지로 매핑.
 *
 * raw errorLog 는 영문/Playwright 셀렉터/HTTP status 등이라 사용자에게 그대로 보이면
 * "왜 안됐는지" 파악이 어려움. 키워드 기반으로 친절 메시지 + 다음 행동 안내.
 *
 * 매핑 못 한 메시지는 raw 를 그대로 반환 (정보 손실 X).
 */

export interface FriendlyError {
    title: string;       // 짧은 한 줄 제목
    detail: string;      // 다음 행동 안내 (1~2문장)
    actionable: boolean; // 사용자가 직접 해결 가능한가 (재인증·재시도 등)
}

const RULES: Array<{ test: (s: string) => boolean; build: (s: string) => FriendlyError }> = [
    // ===== 인스타그램 =====
    {
        test: s => /세션이 만료|session.*expired|로그인.*다시/i.test(s),
        build: () => ({
            title: '인스타그램 세션이 만료됐어요',
            detail: '채널 카드 메뉴 → "재인증" 을 눌러 다시 로그인해주세요.',
            actionable: true,
        }),
    },
    {
        test: s => /수동 로그인.*초과|로그인 시간 초과/i.test(s),
        build: () => ({
            title: '로그인 시간이 초과됐어요 (5분)',
            detail: '에이전트 창이 떴을 때 5분 안에 로그인을 마쳐야 합니다. 다시 시도해주세요.',
            actionable: true,
        }),
    },
    {
        test: s => /이미지가 필수/i.test(s),
        build: () => ({
            title: '이미지가 빠졌어요',
            detail: '인스타그램은 이미지가 필수입니다. 캠페인에 이미지를 추가하고 다시 시도해주세요.',
            actionable: true,
        }),
    },
    {
        test: s => /challenge|checkpoint|suspicious|verify your account/i.test(s),
        build: () => ({
            title: '인스타그램이 본인 확인을 요구하고 있어요',
            detail: '인스타그램 앱에서 직접 본인 확인을 마친 뒤 채널을 재인증해주세요.',
            actionable: true,
        }),
    },

    // ===== 네이버 =====
    {
        test: s => /captcha|보안문자/i.test(s),
        build: () => ({
            title: '네이버 보안문자(캡차) 발생',
            detail: '잠시 후 다시 시도하거나, 네이버에 직접 로그인해 보안문자를 통과한 뒤 재인증해주세요.',
            actionable: true,
        }),
    },

    // ===== Telegram =====
    {
        test: s => /401.*Unauthorized|bot was kicked|chat not found|getMe|Bad Request: chat not found/i.test(s),
        build: () => ({
            title: '텔레그램 봇 토큰 또는 채널 ID 가 잘못됐어요',
            detail: '@BotFather 에서 봇 토큰을 다시 확인하시고, 봇이 채널/그룹에 admin 으로 추가되어 있는지 점검해주세요.',
            actionable: true,
        }),
    },

    // ===== WordPress =====
    {
        test: s => /401.*wp-json|rest_cannot_create|invalid username|invalid_password/i.test(s),
        build: () => ({
            title: '워드프레스 인증 실패',
            detail: 'Application Password 가 만료됐거나 잘못 입력됐을 수 있어요. 워드프레스 → 사용자 → 프로필에서 새로 발급해 채널을 재인증해주세요.',
            actionable: true,
        }),
    },

    // ===== Discord =====
    {
        test: s => /webhook.*invalid|404.*webhook|10015/i.test(s),
        build: () => ({
            title: 'Discord 웹후크 URL 이 무효해요',
            detail: '웹후크가 삭제됐거나 URL 이 잘못됐을 수 있어요. 채널 설정에서 새 웹후크 URL 을 발급받아 채널을 재인증해주세요.',
            actionable: true,
        }),
    },

    // ===== LinkedIn / X =====
    {
        test: s => /401.*linkedin|invalid_token|expired.*token|access[_ ]token/i.test(s),
        build: () => ({
            title: 'OAuth 토큰이 만료됐어요',
            detail: '플랫폼 개발자 페이지에서 새 access token 을 발급받아 채널 편집 → 자격증명 변경으로 갱신해주세요.',
            actionable: true,
        }),
    },
    {
        test: s => /429|rate limit|too many requests|monthly cap/i.test(s),
        build: () => ({
            title: 'API 호출 한도 초과',
            detail: '플랫폼의 분당/월간 호출 한도에 도달했어요. 잠시 후 자동 재시도되거나, 다음 한도 갱신 시각까지 기다려주세요.',
            actionable: false,
        }),
    },

    // ===== 일반 네트워크 =====
    {
        test: s => /timeout|ETIMEDOUT|network.*error|fetch failed|ENOTFOUND/i.test(s),
        build: () => ({
            title: '네트워크 연결이 불안정해요',
            detail: '잠시 후 자동 재시도됩니다. 계속 발생하면 사이트 URL · 인터넷 연결 · 방화벽 설정을 확인해주세요.',
            actionable: false,
        }),
    },
    {
        test: s => /Timeout.*RUNNING|10분.*응답 없음/i.test(s),
        build: () => ({
            title: '에이전트 응답이 없어요',
            detail: '데스크톱 에이전트가 종료됐거나 작업 중 멈췄을 수 있어요. 에이전트를 재시작한 뒤 "재시도" 를 눌러주세요.',
            actionable: true,
        }),
    },

    // ===== 자격증명 복호화 =====
    {
        test: s => /자격증명.*복호화|decrypt.*creds|ENCRYPTION_KEY/i.test(s),
        build: () => ({
            title: '저장된 자격증명을 읽을 수 없어요',
            detail: '서비스의 암호화 키가 변경됐거나 자격증명 데이터가 손상됐어요. 채널 편집 → 자격증명 변경으로 다시 입력해주세요.',
            actionable: true,
        }),
    },
];

/** raw errorLog 를 친절한 에러로 변환. 매핑 없으면 raw 사용. */
export function toFriendlyError(raw: string | null | undefined): FriendlyError {
    const s = (raw || '').trim();
    if (!s) {
        return { title: '알 수 없는 오류', detail: '에러 정보가 없습니다.', actionable: false };
    }
    for (const r of RULES) {
        if (r.test(s)) return r.build(s);
    }
    return {
        title: '발행 실패',
        detail: s.length > 200 ? s.slice(0, 200) + '…' : s,
        actionable: false,
    };
}

/** 알림 메시지용 — 한 줄로 압축. */
export function toFriendlyOneLiner(raw: string | null | undefined): string {
    const e = toFriendlyError(raw);
    return e.title;
}
