import { getMyProfile } from '@/app/actions/userActions';
import { Stack, Title, Text } from '@mantine/core';
import ProfileClient from './ProfileClient';

export const metadata = { title: '프로필 | 마케팅봇' };
export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
    const profile = await getMyProfile();
    return (
        <Stack gap="md">
            <Stack gap={2}>
                <Title order={2}>👤 프로필</Title>
                <Text size="sm" c="dimmed">이름·비밀번호 등 계정 정보를 관리합니다.</Text>
            </Stack>
            <ProfileClient profile={profile} />
        </Stack>
    );
}
