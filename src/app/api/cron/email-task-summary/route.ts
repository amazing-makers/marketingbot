import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import dayjs from 'dayjs';
import { sendEmail } from '@/lib/email/send';
import { TaskFailureSummaryEmail } from '@/lib/email/templates/TaskFailureSummary';
import { env } from '@/lib/env';

export async function GET(req: NextRequest) {
    // 1. 보안 체크 (Cron Secret)
    const authHeader = req.headers.get('authorization');
    if (env.NODE_ENV === 'production' && authHeader !== `Bearer ${env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // 2. 전일(Yesterday) 범위 설정
        const yesterday = dayjs().subtract(1, 'day');
        const start = yesterday.startOf('day').toDate();
        const end = yesterday.endOf('day').toDate();
        const dateStr = yesterday.format('YYYY년 MM월 DD일');

        // 3. 실패한 작업 조회
        const failedTasks = await prisma.scheduledTask.findMany({
            where: {
                status: 'FAILED',
                executedAt: {
                    gte: start,
                    lte: end,
                },
            },
            include: {
                channel: true,
                campaign: {
                    include: {
                        user: true,
                    },
                },
            },
        });

        if (failedTasks.length === 0) {
            return NextResponse.json({ message: 'No failed tasks found for yesterday' });
        }

        // 4. 유저별로 그룹화
        const userGroups: Record<string, { 
            email: string; 
            name: string; 
            tasks: any[] 
        }> = {};

        for (const task of failedTasks) {
            const user = task.campaign.user;
            if (!user.email) continue;

            if (!userGroups[user.id]) {
                userGroups[user.id] = {
                    email: user.email,
                    name: user.name || user.email.split('@')[0],
                    tasks: [],
                };
            }

            userGroups[user.id].tasks.push({
                id: task.id,
                channelType: task.channel.type,
                accountName: task.channel.accountName,
                error: task.errorLog || '알 수 없는 오류',
                time: dayjs(task.executedAt).format('HH:mm'),
            });
        }

        // 5. 이메일 발송
        let sentCount = 0;
        for (const userId in userGroups) {
            const group = userGroups[userId];
            const user = await prisma.user.findUnique({ where: { id: userId }, select: { emailPreferences: true } });
            const prefs = user?.emailPreferences as any;

            if (prefs?.failures !== false) {
                await sendEmail({
                    to: group.email,
                    subject: `[마케팅봇] ${dateStr} 작업 실패 요약 보고서 ⚠️`,
                    react: TaskFailureSummaryEmail({
                        name: group.name,
                        tasks: group.tasks,
                        date: dateStr,
                    }),
                });
                sentCount++;
            }
        }

        return NextResponse.json({ 
            success: true, 
            totalFailedTasks: failedTasks.length,
            usersNotified: sentCount 
        });

    } catch (error: any) {
        console.error('[Cron] Task Summary Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
