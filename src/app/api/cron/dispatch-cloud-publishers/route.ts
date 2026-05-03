import { NextRequest, NextResponse } from 'next/server';
import { publishCloudReadyTasks } from '@/lib/publishers';

/**
 * 클라우드 직접 발행 cron — 5분마다 실행.
 *
 * scheduledAt 도래 + PENDING 인 task 중 클라우드 처리 가능한 채널(Telegram 등)을
 * Vercel 서버에서 직접 publish. 에이전트 위임 채널은 변경하지 않음 (에이전트 폴링).
 *
 * vercel.json schedule: 매 5분 ('* /5 * * * *' 형식, JSDoc 안에서는 escape)
 */
export async function GET(req: NextRequest) {
    // 보안: Vercel Cron Secret
    const authHeader = req.headers.get('authorization');
    if (
        authHeader !== `Bearer ${process.env.CRON_SECRET}` &&
        process.env.NODE_ENV === 'production'
    ) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const result = await publishCloudReadyTasks({ limit: 50 });
        return NextResponse.json({
            ok: true,
            ...result,
            timestamp: new Date().toISOString(),
        });
    } catch (err: any) {
        console.error('[dispatch-cloud-publishers] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
