'use client';

import {
    Container, Title, Text, Stack, Group, Card, SimpleGrid, Badge, Button, Modal,
    TextInput, Textarea, ColorInput, Anchor, Box, ThemeIcon,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';
import { IconUsersGroup, IconPlus, IconCrown, IconArrowRight } from '@tabler/icons-react';
import Link from 'next/link';
import { createWorkspace } from '@/app/actions/workspaceActions';

interface WorkspaceItem {
    id: string;
    name: string;
    slug: string;
    role: string;
    memberCount: number;
    plan: string;
    brandColor: string | null;
    logoUrl: string | null;
    isOwner: boolean;
}

export default function WorkspaceListClient({ workspaces }: { workspaces: WorkspaceItem[] }) {
    const [createModal, createModalCtl] = useDisclosure(false);
    const [submitting, setSubmitting] = useState(false);

    const form = useForm({
        initialValues: {
            name: '',
            description: '',
            brandColor: '#1D1D1B',
        },
        validate: {
            name: (v) => (v.trim().length < 2 ? '이름을 2자 이상 입력하세요' : null),
        },
    });

    const handleCreate = async (values: typeof form.values) => {
        setSubmitting(true);
        try {
            const r = await createWorkspace(values);
            notifications.show({ color: 'teal', title: '🏢 워크스페이스 생성됨', message: `slug: ${r.slug}` });
            createModalCtl.close();
            form.reset();
            window.location.reload();
        } catch (e: any) {
            notifications.show({ color: 'red', title: '실패', message: e?.message || '실패' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Container size="lg" py="xl">
            <Stack gap="md">
                <Group justify="space-between">
                    <Stack gap={2}>
                        <Group gap={6}><IconUsersGroup size={24} /><Title order={2}>워크스페이스</Title></Group>
                        <Text c="dimmed" size="sm">여러 브랜드·회사를 분리해서 관리하고, 팀원을 초대할 수 있어요</Text>
                    </Stack>
                    <Button color="violet" leftSection={<IconPlus size={16} />} onClick={createModalCtl.open}>
                        새 워크스페이스
                    </Button>
                </Group>

                {workspaces.length === 0 && (
                    <Card withBorder p="xl" radius="md">
                        <Stack gap="md" align="center">
                            <ThemeIcon size={56} radius="xl" variant="light" color="violet"><IconUsersGroup size={28} /></ThemeIcon>
                            <Stack gap={4} align="center">
                                <Text size="lg" fw={700}>아직 워크스페이스가 없어요</Text>
                                <Text size="sm" c="dimmed" ta="center">
                                    여러 브랜드·고객사를 따로 관리하고 싶다면 워크스페이스를 만들고 팀원을 초대해보세요.<br />
                                    💡 한 사람이 여러 워크스페이스에 속할 수 있어요.
                                </Text>
                            </Stack>
                            <Button onClick={createModalCtl.open} color="violet">첫 워크스페이스 만들기</Button>
                        </Stack>
                    </Card>
                )}

                {workspaces.length > 0 && (
                    <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                        {workspaces.map(ws => (
                            <Card key={ws.id} withBorder p="lg" radius="md" component={Link} href={`/dashboard/workspace/${ws.id}`} style={{ cursor: 'pointer', textDecoration: 'none' }}>
                                <Group justify="space-between" mb="sm">
                                    <Box
                                        style={{
                                            width: 36, height: 36, borderRadius: 8,
                                            background: ws.brandColor || '#1D1D1B',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: 'white', fontWeight: 700, fontSize: 16,
                                        }}
                                    >
                                        {ws.name.slice(0, 2).toUpperCase()}
                                    </Box>
                                    {ws.isOwner && <Badge size="xs" color="yellow" variant="light" leftSection={<IconCrown size={10} />}>OWNER</Badge>}
                                </Group>
                                <Text fw={700} size="md">{ws.name}</Text>
                                <Text size="xs" c="dimmed" mb="xs">/{ws.slug}</Text>
                                <Group gap={6}>
                                    <Badge size="xs" variant="light">{ws.plan}</Badge>
                                    <Badge size="xs" variant="light" color="blue">멤버 {ws.memberCount}명</Badge>
                                </Group>
                                <Group justify="flex-end" mt="sm">
                                    <Anchor size="xs">관리 <IconArrowRight size={11} style={{ display: 'inline' }} /></Anchor>
                                </Group>
                            </Card>
                        ))}
                    </SimpleGrid>
                )}

                <Card withBorder p="md" radius="md" bg="blue.0">
                    <Text size="xs" c="blue.9">
                        💡 워크스페이스는 현재 멤버십 관리 단계입니다. 채널·캠페인은 아직 워크스페이스별 분리가 적용되지 않았으며, 다음 단계에서 적용 예정입니다.
                    </Text>
                </Card>
            </Stack>

            {/* 새 워크스페이스 모달 */}
            <Modal opened={createModal} onClose={createModalCtl.close} title="새 워크스페이스 만들기" size="md">
                <form onSubmit={form.onSubmit(handleCreate)}>
                    <Stack gap="sm">
                        <TextInput
                            label="이름"
                            placeholder="예: 우리 카페"
                            required
                            {...form.getInputProps('name')}
                        />
                        <Textarea
                            label="설명 (선택)"
                            placeholder="이 워크스페이스의 용도"
                            minRows={2}
                            autosize
                            {...form.getInputProps('description')}
                        />
                        <ColorInput
                            label="브랜드 색상"
                            description="아바타 배경에 사용됩니다"
                            {...form.getInputProps('brandColor')}
                        />
                        <Group justify="flex-end" mt="sm">
                            <Button variant="subtle" onClick={createModalCtl.close}>취소</Button>
                            <Button type="submit" loading={submitting} color="violet">만들기</Button>
                        </Group>
                    </Stack>
                </form>
            </Modal>
        </Container>
    );
}
