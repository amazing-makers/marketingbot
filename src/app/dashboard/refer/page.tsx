import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Stack, Title, Text } from '@mantine/core';
import { getMyReferralCode, listMyReferrals } from '@/app/actions/referActions';
import ReferClient from './ReferClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: '친구 초대 | 마케팅봇' };

export default async function ReferPage() {
    const session = await auth();
    if (!session?.user?.id) redirect('/login');

    const [info, referrals] = await Promise.all([
        getMyReferralCode(),
        listMyReferrals(),
    ]);

    return (
        <Stack gap="md">
            <Stack gap={2}>
                <Title order={2}>🎁 친구 초대</Title>
                <Text size="sm" c="dimmed">
                    친구가 내 링크로 가입 후 결제하면 트라이얼 7일이 자동 추가돼요.
                </Text>
            </Stack>
            <ReferClient info={info} referrals={referrals} />
        </Stack>
    );
}
