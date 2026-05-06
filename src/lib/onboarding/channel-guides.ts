/**
 * Phase 42 — 채널별 연결 가이드 데이터.
 *
 * 각 채널 별 단계 + 주의사항 + 자주 묻는 질문.
 * 새 채널 추가: GUIDES 에 키 추가만 하면 됨.
 */

export interface ChannelGuide {
    type: string;
    label: string;
    emoji: string;
    difficulty: 'easy' | 'medium' | 'hard';
    timeEstimate: string;
    description: string;
    requirements: string[];
    steps: Array<{ title: string; detail: string; tip?: string }>;
    notes: string[];
    faqs: Array<{ q: string; a: string }>;
}

export const CHANNEL_GUIDES: Record<string, ChannelGuide> = {
    INSTAGRAM: {
        type: 'INSTAGRAM',
        label: 'Instagram',
        emoji: '📷',
        difficulty: 'medium',
        timeEstimate: '5분',
        description: '인스타그램 비즈니스/크리에이터 계정에 자동 게시',
        requirements: [
            'Instagram 계정 (개인/비즈니스 모두 가능)',
            '데스크톱 에이전트 설치 + 라이센스 활성화',
        ],
        steps: [
            {
                title: '채널 페이지에서 "+ 채널 추가" 클릭',
                detail: '대시보드 → 채널 관리 → 우상단 "+ 채널 추가" 버튼 클릭',
            },
            {
                title: '채널 유형에서 "Instagram" 선택',
                detail: 'Instagram 아이콘 클릭 → 계정 별명 입력 (예: "메인 계정")',
            },
            {
                title: 'Instagram 아이디·비밀번호 입력',
                detail: '본인 인스타그램 로그인 정보를 안전하게 입력 (AES-256 암호화 저장)',
                tip: '2단계 인증 활성화 시 백업 코드 필요. 비활성화 권장.',
            },
            {
                title: '에이전트가 첫 발행 시 자동 로그인',
                detail: '실제 발행 시점에 데스크톱 에이전트가 인스타에 로그인. 가끔 보안 인증 화면이 뜨면 본인 확인 1회 필요.',
            },
        ],
        notes: [
            '⚠️ Instagram 은 자동화에 민감해요. 평소 사용량 이상으로 발행하지 마세요 (1일 5-10건 권장).',
            '⚠️ 같은 IP 에서 여러 계정 연속 게시는 위험. 시리즈로 분산 권장.',
            '✅ 이미지 + 짧은 캡션 + 해시태그 형식이 가장 안전.',
        ],
        faqs: [
            { q: '비밀번호 안전한가요?', a: '예, AES-256-GCM 암호화로 DB 저장. 마케팅봇 직원도 평문 조회 불가.' },
            { q: '비즈니스 계정 전환 필요?', a: '아니요. 개인 계정도 가능. 단 비즈니스 계정이 인사이트·리치 더 좋음.' },
            { q: '여러 계정 추가 가능?', a: '예. 각각 다른 계정 별명으로 등록하면 시리즈에서 채널 선택 가능.' },
        ],
    },
    NAVER_BLOG: {
        type: 'NAVER_BLOG',
        label: '네이버 블로그',
        emoji: '📝',
        difficulty: 'easy',
        timeEstimate: '3분',
        description: '네이버 블로그에 자동 포스팅 (HTML 본문 + 이미지)',
        requirements: ['네이버 ID·비밀번호', '데스크톱 에이전트'],
        steps: [
            {
                title: '채널 추가에서 "네이버 블로그" 선택',
                detail: '대시보드 → 채널 관리 → "+ 채널 추가" → 네이버 블로그',
            },
            {
                title: '네이버 ID/비밀번호 입력',
                detail: '본인 네이버 계정 정보 입력. 카페와 같은 계정이면 한 번 등록으로 둘 다 사용 가능.',
                tip: '2차 인증 끄기 권장. 켜져있으면 매번 로그인 시 추가 인증 필요.',
            },
            {
                title: '카테고리·태그 자동 매핑',
                detail: '발행 시 캠페인 태그가 블로그 카테고리·태그로 자동 매핑됨.',
            },
        ],
        notes: [
            '✅ 네이버는 비교적 자동화에 관대해요. 일 20건+ 발행도 안정적.',
            '✅ 이미지 + 긴 글 (BLOG 모드) 권장.',
            '⚠️ 같은 글을 카페와 블로그 동시 발행 시 검색 노출 페널티 가능.',
        ],
        faqs: [
            { q: '카페와 블로그 같은 계정?', a: '예, 한 번 등록으로 둘 다 사용. 단 채널 등록은 따로.' },
            { q: '맞춤법·검색최적화?', a: 'AI 캡션 생성 시 자동 적용. 제목·H2·해시태그 자동 구성.' },
        ],
    },
    NAVER_CAFE: {
        type: 'NAVER_CAFE',
        label: '네이버 카페',
        emoji: '☕',
        difficulty: 'medium',
        timeEstimate: '5분',
        description: '네이버 카페 게시판에 자동 글쓰기',
        requirements: [
            '네이버 ID·비밀번호',
            '카페 가입 + 글쓰기 권한 (등급)',
            'cafeId · menuId',
        ],
        steps: [
            {
                title: 'cafeId 찾기',
                detail: '카페 URL https://cafe.naver.com/example → 카페 정보 → "카페 주소" 의 영문 ID',
                tip: '브라우저 URL 의 마지막 부분 (예: cafe.naver.com/myhome → "myhome").',
            },
            {
                title: 'menuId 찾기',
                detail: '글쓰기 페이지 URL 에서 ?menuid=12 부분 찾기. 12 가 menuId.',
                tip: '카페 게시판마다 다름. 발행 원하는 게시판으로 이동 후 URL 확인.',
            },
            {
                title: '채널 추가에서 "네이버 카페" 선택',
                detail: 'ID·비밀번호 + cafeId + menuId 입력',
            },
        ],
        notes: [
            '⚠️ 카페별 등급 제한 — 신규 가입자는 글쓰기 불가일 수 있음.',
            '⚠️ 광고성 글 자동 차단되는 카페도 많음. 운영자 정책 확인.',
            '✅ 후기·정보 글은 잘 노출됨.',
        ],
        faqs: [
            { q: '여러 카페 동시 등록?', a: '각각 채널로 추가. cafeId · menuId 다르게 설정.' },
            { q: '게시판마다 다른 글?', a: '시리즈에서 채널 선택해서 분리 가능.' },
        ],
    },
    DISCORD: {
        type: 'DISCORD',
        label: 'Discord',
        emoji: '💬',
        difficulty: 'easy',
        timeEstimate: '2분',
        description: 'Discord 서버 채널에 webhook 으로 자동 메시지',
        requirements: ['Discord 서버 관리 권한', 'Webhook URL'],
        steps: [
            {
                title: 'Discord 서버에서 채널 설정',
                detail: '대상 채널 우클릭 → "채널 편집" → "연동" → "Webhooks"',
            },
            {
                title: 'New Webhook 생성',
                detail: '"새 Webhook" 클릭 → 이름 + 아이콘 설정 → "Webhook URL 복사"',
                tip: 'Webhook URL 은 비밀이에요. 외부에 노출 금지.',
            },
            {
                title: '채널 추가에서 Discord 선택 + URL 붙여넣기',
                detail: 'Webhook URL 만 입력하면 끝',
            },
        ],
        notes: [
            '✅ 가장 빠르고 안정적인 채널. API 자동화 친화적.',
            '✅ 에이전트 없이 클라우드에서 직접 발행됨.',
            '⚠️ 분당 30개 메시지 제한.',
        ],
        faqs: [
            { q: '봇 권한 필요?', a: '아니요. Webhook 만 있으면 충분.' },
            { q: '여러 채널?', a: '각 채널마다 새 Webhook 생성 → 각각 채널로 등록.' },
        ],
    },
    TELEGRAM: {
        type: 'TELEGRAM',
        label: 'Telegram',
        emoji: '✈️',
        difficulty: 'medium',
        timeEstimate: '5분',
        description: 'Telegram 채널/그룹에 봇으로 자동 메시지',
        requirements: ['BotFather 로 봇 생성', 'Bot Token', 'Chat ID'],
        steps: [
            {
                title: 'BotFather 에서 봇 생성',
                detail: 'Telegram 에서 @BotFather 검색 → /newbot → 이름·username 설정 → Bot Token 받기',
                tip: 'Token 은 1234567:ABCdef... 형식의 긴 문자열',
            },
            {
                title: '봇을 채널/그룹에 추가',
                detail: '대상 채널 → 관리 → 관리자 추가 → 본인 봇 선택 → 게시 권한 부여',
            },
            {
                title: 'Chat ID 찾기',
                detail: '@userinfobot 또는 @get_id_bot 사용. 또는 채널에서 메시지 1개 보낸 후 https://api.telegram.org/bot{TOKEN}/getUpdates 확인',
            },
            {
                title: '채널 추가 — Telegram 선택 + Token + Chat ID',
                detail: '두 값 입력하면 끝',
            },
        ],
        notes: [
            '✅ 한 봇으로 여러 채널·그룹 가능.',
            '✅ 에이전트 없이 클라우드에서 직접 발행.',
            '⚠️ 봇이 차단되면 자동 발행 실패.',
        ],
        faqs: [
            { q: '비공개 채널 가능?', a: '예. 봇이 멤버여야 함.' },
            { q: '미디어 첨부?', a: '이미지·동영상 자동 첨부 지원.' },
        ],
    },
    YOUTUBE: {
        type: 'YOUTUBE',
        label: 'YouTube',
        emoji: '🎬',
        difficulty: 'hard',
        timeEstimate: '15분',
        description: 'YouTube 영상 자동 업로드 (커뮤니티 글도 가능)',
        requirements: [
            'Google Cloud Console 프로젝트',
            'YouTube Data API v3 활성화',
            'OAuth 2.0 Access Token',
        ],
        steps: [
            {
                title: 'Google Cloud 프로젝트 생성',
                detail: 'console.cloud.google.com → 새 프로젝트 → YouTube Data API v3 활성화',
            },
            {
                title: 'OAuth 동의 화면 + 자격 증명',
                detail: 'OAuth 클라이언트 ID 생성 → 리디렉션 URI: marketingbot.amakers.co.kr/oauth/callback',
            },
            {
                title: 'Access Token 발급',
                detail: 'OAuth Playground 또는 마케팅봇 인증 페이지에서 권한 동의 → Token 자동 입력',
            },
        ],
        notes: [
            '⚠️ 영상 업로드는 일 6개 제한 (Google API quota).',
            '⚠️ 커뮤니티 탭 글은 채널 구독자 500명+ 필요.',
            '✅ 마케팅봇이 OAuth flow 자동화 → 사용자는 동의만.',
        ],
        faqs: [
            { q: '쇼츠도 가능?', a: '예. 60초 이하 세로 영상 자동 인식.' },
            { q: '예약 발행?', a: 'YouTube 공식 예약 기능 자동 활용.' },
        ],
    },
    LINKEDIN: {
        type: 'LINKEDIN',
        label: 'LinkedIn',
        emoji: '💼',
        difficulty: 'medium',
        timeEstimate: '10분',
        description: 'LinkedIn 개인/회사 페이지에 자동 포스팅',
        requirements: ['LinkedIn 계정', 'OAuth 2.0 Access Token'],
        steps: [
            {
                title: 'LinkedIn Developer 앱 생성',
                detail: 'developer.linkedin.com → 앱 생성 → "Marketing Developer Platform" 권한 신청',
            },
            {
                title: 'OAuth 인증',
                detail: '권한 승인 후 Access Token 발급',
            },
            {
                title: '채널 추가 — LinkedIn',
                detail: 'Access Token + (선택) Author URN 입력',
            },
        ],
        notes: [
            '✅ B2B·전문 콘텐츠에 효과적.',
            '⚠️ 광고성 강한 글은 도달률 낮음.',
        ],
        faqs: [
            { q: '회사 페이지 발행?', a: 'Company Author URN 추가하면 가능.' },
        ],
    },
    WORDPRESS: {
        type: 'WORDPRESS',
        label: 'WordPress',
        emoji: '🌐',
        difficulty: 'easy',
        timeEstimate: '3분',
        description: '워드프레스 사이트 자동 포스팅',
        requirements: ['WordPress 사이트 URL', 'Application Password'],
        steps: [
            {
                title: 'WordPress 어드민 → 사용자 → 프로필',
                detail: '"Application Passwords" 섹션에서 새 패스워드 생성 (예: "Marketingbot")',
            },
            {
                title: '채널 추가 — WordPress',
                detail: 'Site URL + 사용자 이름 + Application Password 입력',
                tip: 'Application Password 는 일반 비밀번호와 다름. 자동화 전용 키.',
            },
        ],
        notes: [
            '✅ Self-hosted WP 와 WP.com 모두 지원.',
            '✅ 카테고리·태그·대표 이미지 자동 설정.',
        ],
        faqs: [
            { q: 'WP.com Free 플랜?', a: 'API 제한적. Business 플랜+ 권장.' },
        ],
    },
};

export const CHANNEL_GUIDE_LIST = Object.values(CHANNEL_GUIDES);
