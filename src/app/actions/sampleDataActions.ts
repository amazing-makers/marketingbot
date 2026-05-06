'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { encryptJSON } from '@/lib/crypto/aes';

async function getSessionUser() {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');
    return session.user;
}

const SAMPLE_TAG = 'sample-data';

/**
 * Phase 44 — 샘플 데이터 모드.
 *
 * 신규 사용자가 시스템을 둘러볼 수 있도록 더미 데이터 자동 생성:
 *   - 샘플 채널 1개 (DEMO 타입, 인증 안 됨 — 실제 발행 X)
 *   - 샘플 캠페인 3개 (다양한 status: SCHEDULED/SENT/FAILED)
 *   - 샘플 시리즈 1개 (RUNNING)
 *
 * 모든 더미 데이터는 description/notes 에 SAMPLE_TAG 마커 포함 →
 * 사용자가 "샘플 정리" 누르면 한 번에 삭제 가능.
 */
export async function createSampleData(): Promise<{
    channelId: string;
    campaignsCreated: number;
    seriesCreated: number;
}> {
    const user = await getSessionUser();
    const userId = user.id!;

    // 이미 샘플 데이터가 있는지 체크
    const existingChannel = await prisma.marketingChannel.findFirst({
        where: { userId, accountName: { contains: '[샘플]' } },
        select: { id: true },
    });
    if (existingChannel) {
        throw new Error('이미 샘플 데이터가 있어요. 먼저 정리 후 다시 시도하세요.');
    }

    // 샘플 채널 (DEMO — 실제 발행은 막아야 함. 임시로 INSTAGRAM 타입 + PENDING_AUTH 상태로 등록)
    const fakeCredentials = encryptJSON({ username: 'sample_user', password: 'NOT_REAL' });
    const channel = await prisma.marketingChannel.create({
        data: {
            userId,
            type: 'INSTAGRAM',
            accountName: '[샘플] 데모 인스타그램',
            region: 'korea',
            language: 'ko',
            encryptedCredentials: fakeCredentials,
            status: 'PENDING_AUTH', // 인증 안 된 상태 — 발행 시도 시 차단됨
        },
    });

    // 샘플 캠페인 3개
    const now = new Date();
    const sampleCampaigns = [
        {
            name: '[샘플] 신메뉴 출시 안내',
            description: 'sample-data: 신메뉴 바닐라 라떼 — 부드럽고 달콤한 톤',
            status: 'SCHEDULED',
            scheduledAt: new Date(now.getTime() + 24 * 60 * 60 * 1000), // 내일
            content: '🌟 새로운 바닐라 라떼 출시!\n달콤하고 부드러운 한 잔이 우리 카페에 새로 들어왔어요.\n오늘만의 특별한 한 잔, 지금 만나보세요 ☕\n\n#카페신메뉴 #바닐라라떼 #카페추천',
            taskStatus: 'PENDING' as const,
        },
        {
            name: '[샘플] 주말 이벤트',
            description: 'sample-data: 주말 30% 할인 안내',
            status: 'SCHEDULED',
            scheduledAt: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2시간 전 (이미 발행됨)
            content: '🎁 주말 깜짝 이벤트!\n토·일 30% 할인 진행 중!\n친구·가족과 함께 즐기는 따뜻한 시간 ❤️\n\n#주말이벤트 #이벤트 #할인',
            taskStatus: 'SUCCESS' as const,
        },
        {
            name: '[샘플] 휴일 안내',
            description: 'sample-data: 휴일 휴무 공지',
            status: 'SCHEDULED',
            scheduledAt: new Date(now.getTime() - 6 * 60 * 60 * 1000), // 6시간 전
            content: '📌 휴일 안내\n다가오는 추석 연휴 [날짜] 동안 매장이 휴무입니다.\n양해 부탁드려요. 곧 다시 만나요 🙏\n\n#휴일안내 #공지',
            taskStatus: 'SUCCESS' as const,
        },
    ];

    let campaignsCreated = 0;
    for (const c of sampleCampaigns) {
        await prisma.$transaction(async (tx) => {
            const campaign = await tx.campaign.create({
                data: {
                    userId,
                    name: c.name,
                    description: c.description,
                    status: c.status,
                    scheduledAt: c.scheduledAt,
                    tags: ['sample'] as any,
                },
            });
            await tx.scheduledTask.create({
                data: {
                    campaignId: campaign.id,
                    channelId: channel.id,
                    content: c.content,
                    scheduledAt: c.scheduledAt,
                    status: c.taskStatus,
                    executedAt: c.taskStatus === 'SUCCESS' ? c.scheduledAt : null,
                },
            });
        });
        campaignsCreated++;
    }

    // 샘플 시리즈 1개
    await prisma.campaignSeries.create({
        data: {
            userId,
            name: '[샘플] 매일 아침 9시 자동 발행',
            channelIds: [channel.id] as any,
            mode: 'AI_IMAGE',
            scheduleType: 'DAILY',
            dailyTimes: ['09:00'] as any,
            totalPosts: 30,
            completedPosts: 5,
            failedPosts: 0,
            status: 'RUNNING',
            startAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
            nextRunAt: new Date(now.getTime() + 12 * 60 * 60 * 1000),
            lastRunAt: new Date(now.getTime() - 12 * 60 * 60 * 1000),
            contentSeed: '카페 일상 — 부드럽고 따뜻한 톤',
            tags: ['sample'] as any,
        },
    });

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/campaigns');
    revalidatePath('/dashboard/campaigns/series');
    revalidatePath('/dashboard/channels');

    return {
        channelId: channel.id,
        campaignsCreated,
        seriesCreated: 1,
    };
}

/**
 * 샘플 데이터 한 번에 정리. accountName/description 에 [샘플] 또는 sample-data 마커 있는 것만 삭제.
 */
export async function cleanupSampleData(): Promise<{
    channelsDeleted: number;
    campaignsDeleted: number;
    seriesDeleted: number;
}> {
    const user = await getSessionUser();
    const userId = user.id!;

    // 캠페인 삭제 (cascade 로 task 도 삭제)
    const campaignResult = await prisma.campaign.deleteMany({
        where: {
            userId,
            OR: [
                { name: { startsWith: '[샘플]' } },
                { description: { startsWith: 'sample-data:' } },
            ],
        },
    });

    // 시리즈 삭제 (CampaignSeries 는 description 필드 없음 → name 으로만 식별)
    const seriesResult = await prisma.campaignSeries.deleteMany({
        where: {
            userId,
            name: { startsWith: '[샘플]' },
        },
    });

    // 채널 삭제 (마지막에 — 캠페인 task 가 참조하므로)
    const channelResult = await prisma.marketingChannel.deleteMany({
        where: {
            userId,
            accountName: { startsWith: '[샘플]' },
        },
    });

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/campaigns');
    revalidatePath('/dashboard/campaigns/series');
    revalidatePath('/dashboard/channels');

    return {
        channelsDeleted: channelResult.count,
        campaignsDeleted: campaignResult.count,
        seriesDeleted: seriesResult.count,
    };
}

/**
 * 사용자에게 샘플 데이터가 있는지 체크.
 */
export async function hasSampleData(): Promise<boolean> {
    const user = await getSessionUser();
    const userId = user.id!;
    const c = await prisma.marketingChannel.count({
        where: { userId, accountName: { startsWith: '[샘플]' } },
    });
    return c > 0;
}
