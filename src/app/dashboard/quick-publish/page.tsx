import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import QuickPublishClient from './QuickPublishClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: '⚡ 5분 빠른 발행 | 마케팅봇' };

export default async function QuickPublishPage() {
    const session = await auth();
    if (!session?.user?.id) redirect('/login');

    const channels = await prisma.marketingChannel.findMany({
        where: { userId: session.user.id, status: { in: ['ACTIVE', 'PENDING_AUTH'] } },
        select: {
            id: true, type: true, accountName: true, status: true, region: true, language: true,
        },
    });

    return <QuickPublishClient channels={channels} />;
}
