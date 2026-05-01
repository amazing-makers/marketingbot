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

        // 3. 모든 사용자 조회 (또는 활성 사용자 필터링)
        const users = await prisma.user.findMany({
            include: {
                campaigns: {
                    where: {
                        createdAt: {
                            gte: startOfLastWeek.toDate(),
                            lte: endOfLastWeek.toDate(),
                        },
                    },
                    include: {
                        tasks: {
                            where: {
                                executedAt: {
                                    gte: startOfLastWeek.toDate(),
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

        let sentCount = 0;
        for (const user of users) {
            if (!user.email) continue;

            // 4. 통계 집계
            const allTasks = user.campaigns.flatMap(c => c.tasks);
            if (allTasks.length === 0) continue; // 작업이 없는 경우 발송 제외

            const successCount = allTasks.filter(t => t.status === 'SUCCESS').length;
            const failureCount = allTasks.filter(t => t.status === 'FAILED').length;
            const successRate = Math.round((successCount / allTasks.length) * 100);

            // 채널별 집계
            const channelStatsMap: Record<string, number> = {};
            allTasks.forEach(t => {
                const type = t.channel.type;
                channelStatsMap[type] = (channelStatsMap[type] || 0) + 1;
            });

            const channelStats = Object.entries(channelStatsMap).map(([type, count]) => ({
                channelType: type,
                count,
            }));

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
                            total: allTasks.length,
                            success: successCount,
                            failure: failureCount,
                            successRate,
                        },
                        channelStats,
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
