import { NextRequest, NextResponse } from 'next/server';
import { processDueSeries } from '@/app/actions/seriesActions';

/**
 * 자동화 시리즈 cron — 5분마다 실행.
 * Vercel cron: schedule '*\/5 * * * *' (vercel.json 참조)
 *
 * RUNNING 상태 + nextRunAt <= now 인 시리즈 1회 처리.
 * 한 번에 최대 5개 시리즈 (서버 부담 방지).
 */
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
    const authHeader = req.headers.get('authorization');
    if (
        authHeader !== `Bearer ${process.env.CRON_SECRET}` &&
        process.env.NODE_ENV === 'production'
    ) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const r = await processDueSeries();
    return NextResponse.json({
        ok: true,
        ...r,
        timestamp: new Date().toISOString(),
    });
}
