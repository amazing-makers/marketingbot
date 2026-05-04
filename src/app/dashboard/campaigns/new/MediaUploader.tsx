'use client';

import {
    Stack, Text, Group, Box, Paper, ActionIcon, SimpleGrid, Image, Badge,
    Loader, Tooltip, Button
} from '@mantine/core';
import { Dropzone, IMAGE_MIME_TYPE, MIME_TYPES } from '@mantine/dropzone';
import { IconUpload, IconPhoto, IconX, IconVideo, IconRefresh, IconAlertCircle, IconFolder, IconWand } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import { notifications } from '@mantine/notifications';
import { uploadMediaToR2 } from '@/app/actions/storageActions';

export interface MediaItem {
    id: string;             // local uuid
    url?: string;           // R2 public URL (서버에 등록되면 set)
    dataUrl?: string;       // base64 (R2 미설정 시 또는 업로드 진행 중 미리보기)
    type: 'image' | 'video';
    name: string;
    sizeKb: number;
    uploading: boolean;
    failed?: boolean;
    /** R2 storage 였는지 표시 (사용자 메시지용) */
    storage?: 'r2' | 'inline';
}

interface Props {
    items: MediaItem[];
    onChange: (items: MediaItem[]) => void;
    /** 최대 첨부 개수 (기본 10) */
    maxItems?: number;
    /** 최대 파일 크기 MB (기본 25 — Vercel serverless body 한도 고려) */
    maxSizeMb?: number;
    /** "변형 만들기" 버튼 콜백 — 받은 dataUrl 을 시드로 N장 변형 생성 (page 가 처리) */
    onCreateVariations?: (sourceItem: MediaItem) => void;
}

export default function MediaUploader({ items, onChange, maxItems = 10, maxSizeMb = 25, onCreateVariations }: Props) {
    const [dragActive, setDragActive] = useState(false);

    // 비동기 업로드 콜백에서 최신 items 참조용 ref
    const itemsRef = useRef(items);
    useEffect(() => { itemsRef.current = items; }, [items]);

    const updateItem = (id: string, patch: Partial<MediaItem>) => {
        const next = itemsRef.current.map(it => it.id === id ? { ...it, ...patch } : it);
        itemsRef.current = next;
        onChange(next);
    };

    const fileToDataUrl = (file: File): Promise<string> => new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = reject;
        r.readAsDataURL(file);
    });

    const handleDrop = async (files: File[]) => {
        if (itemsRef.current.length + files.length > maxItems) {
            notifications.show({
                title: '첨부 한도 초과',
                message: `최대 ${maxItems}개까지 첨부 가능합니다.`,
                color: 'orange',
            });
            return;
        }

        // 1단계: 즉시 dataUrl로 미리보기 추가 (uploading: true)
        const newItems: MediaItem[] = await Promise.all(files.map(async (f) => {
            const dataUrl = await fileToDataUrl(f);
            return {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                dataUrl,
                type: f.type.startsWith('video/') ? 'video' as const : 'image' as const,
                name: f.name,
                sizeKb: Math.round(f.size / 1024),
                uploading: true,
            };
        }));
        const after = [...itemsRef.current, ...newItems];
        itemsRef.current = after;
        onChange(after);

        // 2단계: 백그라운드로 R2 업로드 시도 (각 항목 독립적으로 갱신)
        for (const item of newItems) {
            try {
                const r = await uploadMediaToR2({
                    dataUrl: item.dataUrl!,
                    purpose: 'campaign-media',
                    filename: item.name,
                });
                if (r.success) {
                    updateItem(item.id, { uploading: false, url: r.url, storage: 'r2' });
                } else if (r.error?.includes('R2 미설정')) {
                    // R2 미설정은 정상 동작 — inline 폴백
                    updateItem(item.id, { uploading: false, failed: false, storage: 'inline' });
                } else {
                    updateItem(item.id, { uploading: false, failed: true });
                }
            } catch {
                updateItem(item.id, { uploading: false, failed: true });
            }
        }
    };

    const remove = (id: string) => {
        const next = itemsRef.current.filter(i => i.id !== id);
        itemsRef.current = next;
        onChange(next);
    };

    const retry = async (item: MediaItem) => {
        if (!item.dataUrl) return;
        updateItem(item.id, { uploading: true, failed: false });
        try {
            const r = await uploadMediaToR2({
                dataUrl: item.dataUrl,
                purpose: 'campaign-media',
                filename: item.name,
            });
            if (r.success) {
                updateItem(item.id, { uploading: false, url: r.url, storage: 'r2' });
            } else {
                updateItem(item.id, { uploading: false, failed: true });
            }
        } catch {
            updateItem(item.id, { uploading: false, failed: true });
        }
    };

    const totalSize = items.reduce((s, i) => s + i.sizeKb, 0);

    // 폴더 통째 업로드 — <input webkitdirectory>
    const folderInputRef = useRef<HTMLInputElement>(null);
    const onFolderPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []).filter(f =>
            f.type.startsWith('image/') || f.type.startsWith('video/')
        );
        if (files.length === 0) {
            notifications.show({ color: 'orange', title: '이미지/영상 없음', message: '선택한 폴더에 이미지·영상 파일이 없어요.' });
            return;
        }
        // 너무 많이 한번에 업로드 안 되게 — 첫 (maxItems - 현재) 만
        const allowed = Math.max(0, maxItems - itemsRef.current.length);
        const toUpload = files.slice(0, allowed);
        if (toUpload.length < files.length) {
            notifications.show({
                color: 'orange',
                title: '한도 도달',
                message: `${files.length}개 중 ${toUpload.length}개만 추가됩니다 (한도 ${maxItems}개)`,
            });
        }
        await handleDrop(toUpload);
        // 입력 초기화 (같은 폴더 재선택 가능하게)
        if (folderInputRef.current) folderInputRef.current.value = '';
    };

    return (
        <Stack gap="sm">
            {/* 폴더 통째 선택 — webkitdirectory 는 일반 input 으로만 가능 (Dropzone 미지원) */}
            <input
                ref={folderInputRef}
                type="file"
                multiple
                style={{ display: 'none' }}
                onChange={onFolderPick}
                {...({ webkitdirectory: '', directory: '' } as any)}
            />
            <Group justify="flex-end" gap="xs">
                <Button
                    size="compact-xs"
                    variant="light"
                    color="grape"
                    leftSection={<IconFolder size={12} />}
                    onClick={() => folderInputRef.current?.click()}
                    disabled={items.length >= maxItems}
                >
                    📁 폴더 통째 선택 (안의 모든 이미지·영상)
                </Button>
            </Group>
            <Dropzone
                onDrop={handleDrop}
                onReject={(rejected) => {
                    notifications.show({
                        title: '파일 거부됨',
                        message: rejected.map(r => r.errors.map(e => e.message).join(', ')).join('\n') || '지원되지 않는 파일',
                        color: 'red',
                    });
                }}
                maxSize={maxSizeMb * 1024 * 1024}
                accept={[...IMAGE_MIME_TYPE, MIME_TYPES.mp4, 'video/quicktime', 'video/webm']}
                onDragEnter={() => setDragActive(true)}
                onDragLeave={() => setDragActive(false)}
                onDropAny={() => setDragActive(false)}
                disabled={items.length >= maxItems}
                styles={{
                    root: {
                        border: dragActive ? '2px dashed var(--mantine-color-blue-6)' : '2px dashed var(--mantine-color-default-border)',
                        background: dragActive ? 'var(--mantine-color-blue-0)' : 'var(--mantine-color-default)',
                        transition: 'all 0.15s ease',
                    },
                }}
                p="xl"
                radius="md"
            >
                <Group justify="center" gap="md" style={{ minHeight: 120, pointerEvents: 'none' }}>
                    <Dropzone.Accept>
                        <IconUpload size={48} stroke={1.4} color="var(--mantine-color-blue-6)" />
                    </Dropzone.Accept>
                    <Dropzone.Reject>
                        <IconX size={48} stroke={1.4} color="var(--mantine-color-red-6)" />
                    </Dropzone.Reject>
                    <Dropzone.Idle>
                        <IconPhoto size={48} stroke={1.4} color="var(--mantine-color-dimmed)" />
                    </Dropzone.Idle>
                    <Box>
                        <Text size="md" fw={700}>
                            여기에 사진·영상을 끌어다 놓거나 <Text span c="blue" td="underline">클릭해서 파일 선택</Text>
                        </Text>
                        <Text size="xs" c="dimmed" mt={4}>
                            지원: JPG · PNG · WebP · GIF · MP4 · WebM · 한 파일 최대 {maxSizeMb}MB · 총 {items.length}/{maxItems}개
                        </Text>
                        <Text size="xs" c="grape.7" mt={2} fw={600}>
                            💡 위의 "폴더 통째 선택" 버튼을 누르면 폴더 안의 모든 이미지·영상이 한 번에 추가돼요
                        </Text>
                    </Box>
                </Group>
            </Dropzone>

            {items.length > 0 && (
                <>
                    <Group justify="space-between">
                        <Text size="xs" c="dimmed">
                            {items.length}개 첨부 · 총 {(totalSize / 1024).toFixed(1)} MB
                            {items.some(i => i.storage === 'inline') && (
                                <Text span c="orange.7" ml={6}>· R2 미설정 (inline 미리보기)</Text>
                            )}
                        </Text>
                        <Button size="compact-xs" variant="subtle" color="red" onClick={() => onChange([])}>
                            전체 지우기
                        </Button>
                    </Group>

                    <SimpleGrid cols={{ base: 2, sm: 3, lg: 4 }} spacing="xs">
                        {items.map(item => (
                            <Paper
                                key={item.id}
                                withBorder
                                radius="md"
                                p={0}
                                style={{ position: 'relative', overflow: 'hidden', aspectRatio: '1' }}
                            >
                                {item.type === 'image' ? (
                                    <Image
                                        src={item.url || item.dataUrl}
                                        alt={item.name}
                                        h="100%"
                                        fit="cover"
                                        fallbackSrc="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23ddd' width='100' height='100'/%3E%3C/svg%3E"
                                    />
                                ) : (
                                    <Box style={{ height: '100%', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                                        {item.dataUrl ? (
                                            <video src={item.dataUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                                        ) : (
                                            <IconVideo size={48} color="white" />
                                        )}
                                        <Badge
                                            size="xs"
                                            color="dark"
                                            variant="filled"
                                            style={{ position: 'absolute', bottom: 4, left: 4 }}
                                        >
                                            <IconVideo size={10} /> VIDEO
                                        </Badge>
                                    </Box>
                                )}

                                {/* 업로딩 오버레이 */}
                                {item.uploading && (
                                    <Box style={{
                                        position: 'absolute', inset: 0,
                                        background: 'rgba(0,0,0,0.5)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        flexDirection: 'column', color: 'white', gap: 6,
                                    }}>
                                        <Loader size="sm" color="white" />
                                        <Text size="10px" c="white" fw={700}>업로드 중...</Text>
                                    </Box>
                                )}

                                {/* 실패 오버레이 */}
                                {item.failed && (
                                    <Box style={{
                                        position: 'absolute', inset: 0,
                                        background: 'rgba(220, 38, 38, 0.85)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        flexDirection: 'column', color: 'white', gap: 4,
                                    }}>
                                        <IconAlertCircle size={32} />
                                        <Text size="10px" fw={700}>업로드 실패</Text>
                                        <ActionIcon
                                            size="sm"
                                            variant="white"
                                            color="red"
                                            onClick={() => retry(item)}
                                        >
                                            <IconRefresh size={12} />
                                        </ActionIcon>
                                    </Box>
                                )}

                                {/* 우상단 X + 변형 (이미지 + onCreateVariations 있을 때만) */}
                                <Group gap={4} style={{ position: 'absolute', top: 4, right: 4 }}>
                                    {item.type === 'image' && onCreateVariations && !item.uploading && (
                                        <Tooltip label="이 이미지의 변형 4장 만들기" withArrow>
                                            <ActionIcon
                                                size="sm"
                                                variant="filled"
                                                color="violet"
                                                style={{ opacity: 0.85 }}
                                                onClick={() => onCreateVariations(item)}
                                            >
                                                <IconWand size={12} />
                                            </ActionIcon>
                                        </Tooltip>
                                    )}
                                    <Tooltip label="제거" withArrow>
                                        <ActionIcon
                                            size="sm"
                                            variant="filled"
                                            color="dark"
                                            style={{ opacity: 0.85 }}
                                            onClick={() => remove(item.id)}
                                        >
                                            <IconX size={12} />
                                        </ActionIcon>
                                    </Tooltip>
                                </Group>

                                {/* 좌상단 R2 / inline 표시 */}
                                {item.storage && !item.uploading && (
                                    <Badge
                                        size="xs"
                                        color={item.storage === 'r2' ? 'teal' : 'gray'}
                                        variant="filled"
                                        style={{ position: 'absolute', top: 4, left: 4, opacity: 0.9 }}
                                    >
                                        {item.storage === 'r2' ? 'R2' : 'INLINE'}
                                    </Badge>
                                )}
                            </Paper>
                        ))}
                    </SimpleGrid>
                </>
            )}
        </Stack>
    );
}
