/**
 * Phase 34 — 사용자 변경사항 (changelog).
 * 새 기능을 사용자에게 알리기 위한 정적 데이터.
 *
 * 새 항목 추가 시 LATEST_VERSION 도 함께 업데이트 →
 * 마지막 본 버전과 다르면 NotificationBell 옆에 ✨ 배지 표시.
 */

export interface ChangelogEntry {
    version: string;
    date: string; // YYYY-MM-DD
    title: string;
    icon: string;
    category: 'feature' | 'improvement' | 'fix';
    items: string[];
    /** 사용자에게 직접 보여줄 만한 항목 (관리자 전용 변경은 제외) */
    userFacing: boolean;
}

export const LATEST_VERSION = '2026.05.06';

export const CHANGELOG: ChangelogEntry[] = [
    {
        version: '2026.05.06',
        date: '2026-05-06',
        title: '플랜 한도 + 프로필 + 트라이얼 win-back',
        icon: '🎁',
        category: 'feature',
        userFacing: true,
        items: [
            '대시보드에 플랜 사용량 위젯 추가 (채널·시리즈·일일 task 게이지)',
            '프로필 페이지 신설 (/dashboard/settings/profile) — 이름·비밀번호 변경',
            'AI 설정 → 사용량 탭에 이번 달 한도 vs 사용률 표시 (캡션·이미지)',
            '트라이얼 만료 D+7 win-back 이메일 자동 발송',
            'FREE 플랜 한도 enforcement (채널 2개·시리즈 1개·일일 task 5개)',
        ],
    },
    {
        version: '2026.05.05',
        date: '2026-05-05',
        title: '트라이얼 만료 알림 + 일괄 작업 + 글로벌 검색',
        icon: '⚡',
        category: 'feature',
        userFacing: true,
        items: [
            '트라이얼 D-7/D-3/D-1 자동 알림 이메일 + 인앱 배너',
            '캠페인 목록 체크박스 다중 선택 + 일괄 삭제·일시정지',
            'Cmd+K 검색에 캠페인·시리즈·채널 동적 검색 결과 추가',
        ],
    },
    {
        version: '2026.05.04',
        date: '2026-05-04',
        title: '모바일 카드 뷰 + 에이전트 활동 로그 + 주간 다이제스트',
        icon: '📱',
        category: 'improvement',
        userFacing: true,
        items: [
            '캠페인 목록 모바일에서 카드 뷰 자동 전환 (테이블 가로 스크롤 회피)',
            '에이전트 페이지에 최근 발행 활동 20건 + 30초 자동 갱신',
            '주간 리포트 이메일 — 전주 대비 발행수·성공률 delta + 베스트 캠페인',
            '라이브러리/파트너 빈 상태 디자인 개선',
        ],
    },
    {
        version: '2026.05.03',
        date: '2026-05-03',
        title: '시리즈 태그 + 자동 워크스페이스 + 에이전트 실시간',
        icon: '🏷️',
        category: 'feature',
        userFacing: true,
        items: [
            '시리즈 목록 태그 필터 + 카드 태그 배지 (클릭으로 필터 토글)',
            '신규 가입 시 개인 워크스페이스 자동 생성',
            '에이전트 페이지 — 오늘 처리 / 실행 중 / 상대시간 표시 + 30초 자동 갱신',
            '캠페인·에이전트 테이블 모바일 가로 스크롤 지원',
        ],
    },
    {
        version: '2026.05.02',
        date: '2026-05-02',
        title: '알림 종류 필터 + 시리즈 태그 + 다크모드',
        icon: '🌙',
        category: 'feature',
        userFacing: true,
        items: [
            'Slack/Discord 채널별 알림 종류 필터 (REFERRAL_NEW, COMMISSION_NEW 등)',
            '시리즈 작성 시 태그 추가 가능 (검색·필터용)',
            '다크 모드 색상 폴리싱 (셋업 체크리스트 등)',
        ],
    },
    {
        version: '2026.05.01',
        date: '2026-05-01',
        title: '태그 UI + 활동 필터 + Cmd+K 통합 검색',
        icon: '🔍',
        category: 'feature',
        userFacing: true,
        items: [
            '캠페인 목록 태그 배지 + 태그 필터',
            '활동 피드 필터 (kind, user, 날짜 범위)',
            'Cmd+K 명령 팔레트에 신규 페이지 (분석·라이브러리·활동) 추가',
        ],
    },
];

/**
 * 사용자가 마지막으로 본 버전과 비교해 새로운 변경사항이 있는지.
 * NotificationBell 같은 위젯에서 ✨ 배지 표시용.
 */
export function hasUnseenChanges(lastSeenVersion: string | null): boolean {
    if (!lastSeenVersion) return true; // 한 번도 안 봄
    return lastSeenVersion < LATEST_VERSION;
}
