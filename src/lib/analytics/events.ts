/**
 * PostHog 이벤트 이름 표준화 (자동완성 + 오타 방지)
 */
export const EVENTS = {
    // 회원가입 / 인증
    USER_SIGNED_UP: 'user_signed_up',
    USER_LOGGED_IN: 'user_logged_in',
    USER_LOGGED_OUT: 'user_logged_out',

    // 온보딩
    ONBOARDING_STEP_VIEWED: 'onboarding_step_viewed',
    ONBOARDING_COMPLETED: 'onboarding_completed',
    ONBOARDING_SKIPPED: 'onboarding_skipped',
    LICENSE_KEY_COPIED: 'license_key_copied',
    AGENT_DOWNLOAD_CLICKED: 'agent_download_clicked',

    // 채널
    CHANNEL_CREATED: 'channel_created',
    CHANNEL_UPDATED: 'channel_updated',
    CHANNEL_DELETED: 'channel_deleted',

    // 캠페인
    CAMPAIGN_CREATED: 'campaign_created',
    CAMPAIGN_FROM_TEMPLATE: 'campaign_from_template',
    CAMPAIGN_CANCELLED: 'campaign_cancelled',
    CAMPAIGN_DELETED: 'campaign_deleted',
    TEMPLATE_VIEWED: 'template_viewed',

    // 작업 (서버 사이드만)
    TASK_DISPATCHED: 'task_dispatched',
    TASK_SUCCESS: 'task_success',
    TASK_FAILED: 'task_failed',

    // 에이전트
    AGENT_REGISTERED: 'agent_registered',
    AGENT_HEARTBEAT: 'agent_heartbeat', // 사용 안 함 — 너무 많이 발생 (로깅 비용)

    // 결제 / 플랜
    PLAN_VIEWED: 'plan_viewed',
    PLAN_UPGRADED: 'plan_upgraded',
    PLAN_DOWNGRADED: 'plan_downgraded',
    TRIAL_EXPIRED: 'trial_expired',
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
