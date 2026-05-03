/**
 * region 별 SNS 발행 황금 시간대 (prime-time) 추천.
 *
 * 출처:
 *   - Sprout Social, HubSpot 2024-2025 SNS 분석 보고서
 *   - 각 시장의 출퇴근/점심/저녁 패턴
 *
 * 시간은 모두 해당 region 의 표준 IANA timezone 기준.
 * 반환은 UTC Date 로 변환되어 DB 의 scheduledAt (UTC) 에 그대로 저장 가능.
 *
 * 사용 예 (server action):
 *   import { suggestPrimeTime } from '@/lib/scheduling/prime-time';
 *   const when = suggestPrimeTime('korea');  // 다음 황금시간대 한국 9시 또는 19시
 *   campaign.scheduledAt = when;
 */

export type Region =
    | 'korea' | 'usa' | 'japan' | 'china' | 'europe' | 'latam'
    | 'middle_east' | 'africa' | 'india' | 'southeast_asia' | 'russia' | 'oceania';

/**
 * region → IANA timezone 매핑.
 * 광역 region (유럽 등) 은 가장 큰 시장의 시간대 사용.
 */
const REGION_TIMEZONE: Record<Region, string> = {
    korea: 'Asia/Seoul',
    usa: 'America/New_York',          // EST 기준 (LA 는 PST 3시간 늦음 — 대부분 동부 우선)
    japan: 'Asia/Tokyo',
    china: 'Asia/Shanghai',
    europe: 'Europe/Berlin',          // CET 기준 (런던/파리/베를린 모두 ±1)
    latam: 'America/Sao_Paulo',       // 브라질 UTC-3 기준
    middle_east: 'Asia/Riyadh',       // GMT+3
    africa: 'Africa/Johannesburg',    // SAST UTC+2
    india: 'Asia/Kolkata',            // IST UTC+5:30
    southeast_asia: 'Asia/Singapore', // SGT UTC+8 (인도네시아·태국·베트남 평균)
    russia: 'Europe/Moscow',          // MSK UTC+3
    oceania: 'Australia/Sydney',      // AEST/AEDT
};

/**
 * region 별 황금 시간대 (해당 region 로컬 시간, 24h 기준).
 *
 * 일반 패턴 (대부분의 시장):
 *   - 아침 9시: 출근 후 SNS 체크 피크
 *   - 점심 12시: 점심 휴식 피크
 *   - 저녁 19~20시: 퇴근 후 여가 피크 (가장 강함)
 *
 * region 특수 패턴:
 *   - 미국: 8AM EST = 한국·아시아 시청자도 잡음 (글로벌 노출)
 *   - 일본: 7시·12시·22시 (밤 늦은 SNS 사용 강함)
 *   - 중동: 금요일 저녁 + 라마단 시기는 일몰 후 (Iftar) 활성
 *   - 인도: 21시 (저녁 식사 후) 가장 강함
 */
const PRIME_HOURS: Record<Region, number[]> = {
    korea: [9, 12, 19],
    usa: [8, 12, 17, 20],
    japan: [7, 12, 19, 22],
    china: [9, 12, 20],
    europe: [9, 13, 20],
    latam: [9, 13, 21],
    middle_east: [10, 14, 21],
    africa: [9, 13, 19],
    india: [9, 13, 21],
    southeast_asia: [9, 12, 20],
    russia: [9, 13, 20],
    oceania: [9, 12, 19],
};

/**
 * 다음 황금시간대 1개를 반환 (가장 가까운 미래 시각).
 *
 * 동작:
 *   1. 해당 region 의 현재 로컬 시간 계산
 *   2. PRIME_HOURS 중 현재 시각 이후 가장 빠른 시각 선택
 *   3. 오늘 안에 더 이상 prime-time 없으면 다음날 첫 prime-time
 *   4. minMinutesAhead (기본 30분) 이상 미래여야 함 — 너무 임박한 시각은 다음으로
 */
export function suggestPrimeTime(
    region: Region | string,
    options?: { minMinutesAhead?: number; from?: Date }
): Date {
    const r = (region in REGION_TIMEZONE ? region : 'korea') as Region;
    const tz = REGION_TIMEZONE[r];
    const hours = PRIME_HOURS[r];
    const minAhead = options?.minMinutesAhead ?? 30;
    const from = options?.from ?? new Date();
    const earliest = new Date(from.getTime() + minAhead * 60 * 1000);

    // 해당 region 로컬 시각 추출 (en-CA 로 yyyy-MM-dd hh:mm 깔끔히)
    const fmt = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false,
    });

    // 후보: 오늘 + 내일의 prime hour 들 (총 2일치 중 첫 매치)
    for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
        const dayBase = new Date(earliest.getTime() + dayOffset * 24 * 60 * 60 * 1000);
        const parts = fmt.formatToParts(dayBase);
        const get = (t: string) => parts.find(p => p.type === t)?.value || '';
        const ymd = `${get('year')}-${get('month')}-${get('day')}`;

        for (const h of hours) {
            // ymd + 시:00 을 region 로컬 → UTC 변환
            const candidateUTC = zonedToUTC(ymd, h, 0, tz);
            if (candidateUTC.getTime() >= earliest.getTime()) {
                return candidateUTC;
            }
        }
    }

    // 안전망: 30분 후 (이론상 도달 불가)
    return earliest;
}

/**
 * 다음 N 개의 황금시간대 — 캠페인 N 회 분할 발행에 사용.
 */
export function suggestPrimeTimes(region: Region | string, count: number): Date[] {
    const out: Date[] = [];
    let from = new Date();
    for (let i = 0; i < count; i++) {
        const next = suggestPrimeTime(region, { from });
        out.push(next);
        // 다음 후보는 이번 시각 +1시간 부터 탐색 (같은 시간 중복 방지)
        from = new Date(next.getTime() + 60 * 60 * 1000);
    }
    return out;
}

/**
 * region 의 prime hour 목록을 사람이 읽기 쉬운 라벨로 반환 — UI 노출용.
 * 예: korea → ["오전 9시", "낮 12시", "저녁 7시"]
 */
export function getPrimeHourLabels(region: Region | string): string[] {
    const r = (region in REGION_TIMEZONE ? region : 'korea') as Region;
    return PRIME_HOURS[r].map(formatHourKR);
}

export function getRegionTimezone(region: Region | string): string {
    const r = (region in REGION_TIMEZONE ? region : 'korea') as Region;
    return REGION_TIMEZONE[r];
}

// ── 헬퍼 ──

/**
 * "yyyy-MM-dd HH:mm" + IANA tz → UTC Date.
 *
 * Intl.DateTimeFormat 으로 동일 시각의 region 표시 → UTC offset 역산.
 */
function zonedToUTC(ymd: string, hour: number, minute: number, tz: string): Date {
    // 우선 UTC 로 가정한 Date 생성
    const [y, m, d] = ymd.split('-').map(Number);
    const utcGuess = new Date(Date.UTC(y, m - 1, d, hour, minute, 0));

    // 그 시각을 region 로컬로 표시했을 때 의도한 시각과의 offset 차이 보정
    const fmt = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    });
    const parts = fmt.formatToParts(utcGuess);
    const get = (t: string) => Number(parts.find(p => p.type === t)?.value || '0');
    const localizedHour = get('hour');
    const localizedDay = get('day');

    // 일자 경계 보정 (DST 또는 timezone offset 차이로 날짜가 바뀐 경우)
    let dayDelta = 0;
    if (localizedDay !== d) {
        dayDelta = localizedDay > d ? -1 : 1;
        // 월 경계 무시 — 하루 ±는 일반적으로 충분
    }

    const hourDelta = hour - localizedHour;
    return new Date(utcGuess.getTime() + (hourDelta * 60 * 60 * 1000) + (dayDelta * 24 * 60 * 60 * 1000));
}

function formatHourKR(h: number): string {
    if (h === 0) return '자정 0시';
    if (h === 12) return '낮 12시';
    if (h < 12) return `오전 ${h}시`;
    return `저녁 ${h - 12}시`;
}
