'use client';

import { Paper, Stack, Group, TextInput, PasswordInput, Button, Text, Avatar, Badge, Box } from '@mantine/core';
import { IconUser, IconLock, IconMail, IconCalendar } from '@tabler/icons-react';
import { useState, useTransition } from 'react';
import { notifications } from '@mantine/notifications';
import { updateMyName, changeMyPassword } from '@/app/actions/userActions';
import dayjs from 'dayjs';

interface Profile {
    id: string;
    email: string;
    name: string | null;
    createdAt: string;
    role: string;
}

export default function ProfileClient({ profile }: { profile: Profile }) {
    const [name, setName] = useState(profile.name || '');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isPending, startTransition] = useTransition();

    const handleSaveName = () => {
        if (!name.trim() || name === profile.name) return;
        startTransition(async () => {
            try {
                await updateMyName(name);
                notifications.show({ title: '저장 완료', message: '이름이 변경되었습니다', color: 'green' });
            } catch (e: any) {
                notifications.show({ title: '오류', message: e?.message || '실패', color: 'red' });
            }
        });
    };

    const handleChangePassword = () => {
        if (!currentPassword || !newPassword) {
            notifications.show({ title: '오류', message: '모든 필드를 입력하세요', color: 'red' });
            return;
        }
        if (newPassword !== confirmPassword) {
            notifications.show({ title: '오류', message: '새 비밀번호 확인이 일치하지 않습니다', color: 'red' });
            return;
        }
        startTransition(async () => {
            try {
                await changeMyPassword({ currentPassword, newPassword });
                notifications.show({ title: '✅ 완료', message: '비밀번호가 변경되었습니다', color: 'green' });
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            } catch (e: any) {
                notifications.show({ title: '오류', message: e?.message || '실패', color: 'red' });
            }
        });
    };

    const initial = (profile.name || profile.email).charAt(0).toUpperCase();

    return (
        <>
            {/* 계정 요약 */}
            <Paper withBorder p="md" radius="md">
                <Group gap="md" wrap="nowrap">
                    <Avatar size={64} radius="xl" color="violet">{initial}</Avatar>
                    <Stack gap={4} style={{ flex: 1 }}>
                        <Group gap={6}>
                            <Text fw={700}>{profile.name || profile.email.split('@')[0]}</Text>
                            <Badge size="sm" variant="light" color={profile.role === 'ADMIN' ? 'red' : 'gray'}>
                                {profile.role}
                            </Badge>
                        </Group>
                        <Group gap={12}>
                            <Group gap={4}>
                                <IconMail size={12} color="var(--mantine-color-dimmed)" />
                                <Text size="xs" c="dimmed">{profile.email}</Text>
                            </Group>
                            <Group gap={4}>
                                <IconCalendar size={12} color="var(--mantine-color-dimmed)" />
                                <Text size="xs" c="dimmed">
                                    {dayjs(profile.createdAt).format('YYYY-MM-DD')} 가입 ·
                                    {' '}{dayjs().diff(profile.createdAt, 'day')}일째
                                </Text>
                            </Group>
                        </Group>
                    </Stack>
                </Group>
            </Paper>

            {/* 이름 변경 */}
            <Paper withBorder p="md" radius="md">
                <Stack gap="md">
                    <Group gap={6}>
                        <IconUser size={18} />
                        <Text fw={700}>이름 변경</Text>
                    </Group>
                    <TextInput
                        label="이름"
                        description="대시보드·이메일 등 다른 사용자에게 보이는 이름"
                        value={name}
                        onChange={(e) => setName(e.currentTarget.value)}
                        placeholder="홍길동"
                        maxLength={60}
                    />
                    <Group justify="flex-end">
                        <Button
                            onClick={handleSaveName}
                            disabled={!name.trim() || name === profile.name}
                            loading={isPending}
                        >
                            저장
                        </Button>
                    </Group>
                </Stack>
            </Paper>

            {/* 비밀번호 변경 */}
            <Paper withBorder p="md" radius="md">
                <Stack gap="md">
                    <Group gap={6}>
                        <IconLock size={18} />
                        <Text fw={700}>비밀번호 변경</Text>
                    </Group>
                    <PasswordInput
                        label="현재 비밀번호"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.currentTarget.value)}
                    />
                    <PasswordInput
                        label="새 비밀번호"
                        description="최소 6자 이상"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.currentTarget.value)}
                    />
                    <PasswordInput
                        label="새 비밀번호 확인"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.currentTarget.value)}
                        error={confirmPassword && newPassword !== confirmPassword ? '일치하지 않습니다' : undefined}
                    />
                    <Group justify="flex-end">
                        <Button
                            color="violet"
                            onClick={handleChangePassword}
                            disabled={!currentPassword || !newPassword || newPassword !== confirmPassword}
                            loading={isPending}
                        >
                            비밀번호 변경
                        </Button>
                    </Group>
                </Stack>
            </Paper>

            <Box>
                <Text size="xs" c="dimmed" ta="center">
                    이메일 변경, 계정 삭제는 <a href="mailto:help@amakers.co.kr">help@amakers.co.kr</a> 로 문의해주세요.
                </Text>
            </Box>
        </>
    );
}
