'use client';

import {
    Container, Title, Text, Stack, Group, Card, Badge, Button, Modal,
    TextInput, Select, Anchor, Box, Table, ActionIcon, Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';
import { IconUsersGroup, IconUserPlus, IconCrown, IconTrash, IconEdit } from '@tabler/icons-react';
import Link from 'next/link';
import dayjs from 'dayjs';
import { inviteWorkspaceMember, removeWorkspaceMember, updateMemberRole } from '@/app/actions/workspaceActions';

interface Member {
    userId: string;
    email: string;
    name: string | null;
    role: string;
    joinedAt: string;
    isOwner: boolean;
    isMe: boolean;
}

interface Data {
    workspace: {
        id: string;
        name: string;
        slug: string;
        plan: string;
        brandColor: string | null;
        logoUrl: string | null;
        description: string | null;
        ownerId: string;
        isOwner: boolean;
    };
    myRole: string;
    members: Member[];
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
    OWNER: { label: '소유자', color: 'yellow' },
    ADMIN: { label: '관리자', color: 'violet' },
    MEMBER: { label: '멤버', color: 'blue' },
    VIEWER: { label: '뷰어', color: 'gray' },
};

export default function WorkspaceDetailClient({ data }: { data: Data }) {
    const [busy, setBusy] = useState(false);
    const [inviteModal, inviteModalCtl] = useDisclosure(false);
    const [roleModal, roleModalCtl] = useDisclosure(false);
    const [selectedMember, setSelectedMember] = useState<Member | null>(null);

    const inviteForm = useForm({
        initialValues: { email: '', role: 'MEMBER' as 'ADMIN' | 'MEMBER' | 'VIEWER' },
        validate: {
            email: (v) => (/^\S+@\S+$/.test(v) ? null : '유효한 이메일'),
        },
    });

    const roleForm = useForm({
        initialValues: { role: 'MEMBER' as 'ADMIN' | 'MEMBER' | 'VIEWER' },
    });

    const canInvite = data.myRole === 'OWNER' || data.myRole === 'ADMIN';
    const canManage = data.workspace.isOwner;

    const handleInvite = async (values: typeof inviteForm.values) => {
        setBusy(true);
        try {
            const r = await inviteWorkspaceMember({
                workspaceId: data.workspace.id,
                email: values.email,
                role: values.role,
            });
            if (!r.ok) {
                notifications.show({ color: 'orange', title: '초대 실패', message: r.error || '실패' });
            } else {
                notifications.show({ color: 'teal', title: '✅ 초대 완료', message: values.email });
                inviteModalCtl.close();
                inviteForm.reset();
                window.location.reload();
            }
        } finally {
            setBusy(false);
        }
    };

    const handleRemove = async (member: Member) => {
        if (!confirm(`정말 ${member.email} 을(를) 워크스페이스에서 제거하시겠습니까?`)) return;
        setBusy(true);
        try {
            const r = await removeWorkspaceMember({ workspaceId: data.workspace.id, userId: member.userId });
            if (!r.ok) {
                notifications.show({ color: 'orange', title: '제거 실패', message: r.error || '실패' });
            } else {
                notifications.show({ color: 'teal', title: '제거됨', message: member.email });
                window.location.reload();
            }
        } finally {
            setBusy(false);
        }
    };

    const openRoleModal = (member: Member) => {
        setSelectedMember(member);
        roleForm.setValues({ role: (member.role as any) || 'MEMBER' });
        roleModalCtl.open();
    };

    const handleRoleChange = async (values: typeof roleForm.values) => {
        if (!selectedMember) return;
        setBusy(true);
        try {
            const r = await updateMemberRole({
                workspaceId: data.workspace.id,
                userId: selectedMember.userId,
                role: values.role,
            });
            if (!r.ok) {
                notifications.show({ color: 'orange', title: '변경 실패', message: r.error || '실패' });
            } else {
                notifications.show({ color: 'teal', title: '권한 변경됨', message: `${selectedMember.email} → ${ROLE_LABELS[values.role].label}` });
                roleModalCtl.close();
                window.location.reload();
            }
        } finally {
            setBusy(false);
        }
    };

    return (
        <Container size="lg" py="xl">
            <Stack gap="md">
                {/* 헤더 */}
                <Stack gap={2}>
                    <Anchor component={Link} href="/dashboard/workspace" size="sm">← 워크스페이스 목록</Anchor>
                    <Group gap="sm" align="center" justify="space-between" wrap="wrap">
                        <Group gap="sm">
                            <Box
                                style={{
                                    width: 48, height: 48, borderRadius: 10,
                                    background: data.workspace.brandColor || '#1D1D1B',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'white', fontWeight: 700, fontSize: 20,
                                }}
                            >
                                {data.workspace.name.slice(0, 2).toUpperCase()}
                            </Box>
                            <Stack gap={0}>
                                <Title order={2}>{data.workspace.name}</Title>
                                <Group gap={6}>
                                    <Text size="xs" c="dimmed">/{data.workspace.slug}</Text>
                                    <Badge size="xs" variant="light">{data.workspace.plan}</Badge>
                                    <Badge size="xs" color={ROLE_LABELS[data.myRole]?.color || 'gray'} variant="light">
                                        내 권한: {ROLE_LABELS[data.myRole]?.label || data.myRole}
                                    </Badge>
                                </Group>
                            </Stack>
                        </Group>
                        {canInvite && (
                            <Button color="violet" leftSection={<IconUserPlus size={16} />} onClick={inviteModalCtl.open}>
                                멤버 초대
                            </Button>
                        )}
                    </Group>
                </Stack>

                {/* 멤버 목록 */}
                <Card withBorder p="md" radius="md">
                    <Group gap={6} mb="sm"><IconUsersGroup size={18} /><Text fw={700}>멤버 ({data.members.length}명)</Text></Group>
                    <Table striped highlightOnHover>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>이메일</Table.Th>
                                <Table.Th>이름</Table.Th>
                                <Table.Th>권한</Table.Th>
                                <Table.Th>가입일</Table.Th>
                                <Table.Th>액션</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {data.members.map(m => (
                                <Table.Tr key={m.userId}>
                                    <Table.Td>
                                        <Group gap={6}>
                                            <Text size="sm">{m.email}</Text>
                                            {m.isMe && <Badge size="xs" variant="light" color="blue">나</Badge>}
                                        </Group>
                                    </Table.Td>
                                    <Table.Td><Text size="sm">{m.name || '-'}</Text></Table.Td>
                                    <Table.Td>
                                        <Badge
                                            size="sm"
                                            color={ROLE_LABELS[m.role]?.color || 'gray'}
                                            variant="light"
                                            leftSection={m.isOwner ? <IconCrown size={11} /> : undefined}
                                        >
                                            {ROLE_LABELS[m.role]?.label || m.role}
                                        </Badge>
                                    </Table.Td>
                                    <Table.Td><Text size="xs" c="dimmed">{dayjs(m.joinedAt).format('YYYY-MM-DD')}</Text></Table.Td>
                                    <Table.Td>
                                        {canManage && !m.isOwner && (
                                            <Group gap={4}>
                                                <Tooltip label="권한 변경">
                                                    <ActionIcon size="sm" variant="light" onClick={() => openRoleModal(m)}>
                                                        <IconEdit size={13} />
                                                    </ActionIcon>
                                                </Tooltip>
                                                <Tooltip label="제거">
                                                    <ActionIcon size="sm" variant="light" color="red" onClick={() => handleRemove(m)} loading={busy}>
                                                        <IconTrash size={13} />
                                                    </ActionIcon>
                                                </Tooltip>
                                            </Group>
                                        )}
                                    </Table.Td>
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>
                </Card>
            </Stack>

            {/* 초대 모달 */}
            <Modal opened={inviteModal} onClose={inviteModalCtl.close} title="멤버 초대" size="sm">
                <form onSubmit={inviteForm.onSubmit(handleInvite)}>
                    <Stack gap="sm">
                        <TextInput
                            label="이메일 (이미 가입된 사용자)"
                            placeholder="user@example.com"
                            required
                            {...inviteForm.getInputProps('email')}
                        />
                        <Select
                            label="권한"
                            data={[
                                { value: 'ADMIN', label: '관리자 (멤버 초대·관리 가능)' },
                                { value: 'MEMBER', label: '멤버 (캠페인 작성·발행)' },
                                { value: 'VIEWER', label: '뷰어 (읽기 전용)' },
                            ]}
                            allowDeselect={false}
                            {...inviteForm.getInputProps('role')}
                        />
                        <Text size="xs" c="dimmed">
                            💡 미가입 이메일은 현재 지원하지 않아요 (이메일 invite 토큰은 추후 추가 예정).
                        </Text>
                        <Group justify="flex-end">
                            <Button variant="subtle" onClick={inviteModalCtl.close}>취소</Button>
                            <Button type="submit" loading={busy}>초대</Button>
                        </Group>
                    </Stack>
                </form>
            </Modal>

            {/* 권한 변경 모달 */}
            <Modal opened={roleModal} onClose={roleModalCtl.close} title="권한 변경" size="sm">
                {selectedMember && (
                    <form onSubmit={roleForm.onSubmit(handleRoleChange)}>
                        <Stack gap="sm">
                            <Text size="sm">{selectedMember.email}</Text>
                            <Select
                                label="권한"
                                data={[
                                    { value: 'ADMIN', label: '관리자' },
                                    { value: 'MEMBER', label: '멤버' },
                                    { value: 'VIEWER', label: '뷰어' },
                                ]}
                                allowDeselect={false}
                                {...roleForm.getInputProps('role')}
                            />
                            <Group justify="flex-end">
                                <Button variant="subtle" onClick={roleModalCtl.close}>취소</Button>
                                <Button type="submit" loading={busy}>저장</Button>
                            </Group>
                        </Stack>
                    </form>
                )}
            </Modal>
        </Container>
    );
}
