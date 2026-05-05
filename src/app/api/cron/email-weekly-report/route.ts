import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import dayjs from 'dayjs';
import { sendEmail } from '@/lib/email/send';
import { WeeklyReportEmail } from '@/lib/email/templates/WeeklyReport';
import { env } from '@/lib/env';

export async function GET(req: NextRequest) {
    // 1. 보안 체크
    const authHeader = req.headers.get('authorization');
    if (env.NODE_ENV === 'production' && authHeader !== `Bearer ${env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // 2. 지난 주(Last Week: Monday to Sunday) 범위 설정
        const now = dayjs();
        // 월요일에 실행된다고 가정 (0 0 * * 1)
        const startOfLastWeek = now.subtract(1, 'week').startOf('week').add(1, 'day'); // 지난주 월요일
        const endOfLastWeek = startOfLastWeek.add(6, 'day').endOf('day'); // 지난주 일요일
        const periodStr = `${startOfLastWeek.format('YYYY.MM.DD')} ~ ${endOfLastWeek.format('MM.DD')}`;

        // Phase 30 — 전전주 (delta 계산용)
        const startOfWeekBefore = startOfLastWeek.subtract(1, 'week');
        const endOfWeekBefore = endOfLastWeek.subtract(1, 'week');

        // 3. 모든 사용자 조회 — 지난 주 + 전전주 작업 함께 조회
        const users = await prisma.user.findMany({
            include: {
                campaigns: {
                    where: {
                        createdAt: {
                            gte: startOfWeekBefore.toDate(),
                            lte: endOfLastWeek.toDate(),
                        },
                    },
                    include: {
                        tasks: {
                            where: {
                                executedAt: {
                                    gte: startOfWeekBefore.toDate(),
                                    lte: endOfLastWeek.toDate(),
                                },
                            },
                            include: {
                                channel: true,
                            },
                        },
                    },
                },
            },
        });

        const startLastMs = startOfLastWeek.valueOf();
        const startBeforeMs = startOfWeekBefore.valueOf();
        const endBeforeMs = endOfWeekBefore.valueOf();

        let sentCount = 0;
        for (const user of users) {
            if (!user.email) continue;

            // 4. 통계 집계 — 지난 주 / 전전주 분리
            const allTasks = user.campaigns.flatMap(c => c.tasks);
            const lastWeekTasks = allTasks.filter(t => {
                const ts = t.executedAt ? t.executedAt.valueOf() : 0;
                return ts >= startLastMs;
            });
            const prevWeekTasks = allTasks.filter(t => {
                const ts = t.executedAt ? t.executedAt.valueOf() : 0;
                return ts >= startBeforeMs && ts <= endBeforeMs;
            });
            if (lastWeekTasks.length === 0) continue;

            const successCount = lastWeekTasks.filter(t => t.status === 'SUCCESS').length;
            const failureCount = lastWeekTasks.filter(t => t.status === 'FAILED').length;
            const successRate = Math.round((successCount / lastWeekTasks.length) * 100);

            // 전전주 비교
            const prevTotal = prevWeekTasks.length;
            const prevSuccess = prevWeekTasks.filter(t => t.status === 'SUCCESS').length;
            const prevSuccessRate = prevTotal > 0 ? Math.round((prevSuccess / prevTotal) * 100) : 0;
            const deltaTotal = lastWeekTasks.length - prevTotal;
            const deltaSuccessRate = successRate - prevSuccessRate;

            // 채널별 집계 (지난 주만)
            const channelStatsMap: Record<string, number> = {};
            lastWeekTasks.forEach(t => {
                const type = t.channel.type;
                channelStatsMap[type] = (channelStatsMap[type] || 0) + 1;
            });

            const channelStats = Object.entries(channelStatsMap).map(([type, count]) => ({
                channelType: type,
                count,
            }));

            // 베스트 캠페인 (지난 주 SUCCESS 가 가장 많은 캠페인)
            const campaignSuccessMap: Record<string, { name: string; count: number }> = {};
            for (const c of user.campaigns) {
                const cSuccess = c.tasks.filter(t => {
                    const ts = t.executedAt ? t.executedAt.valueOf() : 0;
                    return t.status === 'SUCCESS' && ts >= startLastMs;
                }).length;
                if (cSuccess > 0) {
                    campaignSuccessMap[c.id] = { name: c.name, count: cSuccess };
                }
            }
            const topCampaign = Object.values(campaignSuccessMap).sort((a, b) => b.count - a.count)[0] || null;

            // 5. 이메일 발송
            const prefs = user.emailPreferences as any;
            if (prefs?.weekly !== false) {
                await sendEmail({
                    to: user.email,
                    subject: `[마케팅봇] 주간 활동 리포트가 도착했습니다 📊`,
                    react: WeeklyReportEmail({
                        name: user.name || user.email.split('@')[0],
                        period: periodStr,
                        stats: {
                            total: lastWeekTasks.length,
                            success: successCount,
                            failure: failureCount,
                            successRate,
                        },
                        channelStats,
                        deltaTotal,
                        deltaSuccessRate,
                        topCampaign,
                        dashboardUrl: `${process.env.NEXTAUTH_URL || 'https://marketingbot.amakers.co.kr'}/dashboard`,
                    }),
                });
                sentCount++;
            }
        }

        return NextResponse.json({ 
            success: true, 
            period: periodStr,
            reportsSent: sentCount 
        });

    } catch (error: any) {
        console.error('[Cron] Weekly Report Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
