"use client";

import { Title, Stack, Paper, TextInput, Textarea, Button, Group, MultiSelect, FileInput } from '@mantine/core';
import { IconUpload } from '@tabler/icons-react';

export default function NewPostPage() {
  return (
    <Stack gap="lg" maw={800}>
      <Title order={2}>새 게시물 작성</Title>

      <Paper withBorder p="xl" radius="md">
        <Stack gap="md">
          <MultiSelect
            label="발행할 계정 선택"
            placeholder="계정을 선택하세요"
            data={[]}
            nothingFoundMessage="등록된 계정이 없습니다."
          />
          
          <Textarea
            label="본문 내용"
            placeholder="SNS에 게시할 내용을 입력하세요"
            minRows={5}
          />

          <FileInput
            label="미디어 업로드"
            placeholder="이미지 또는 동영상 선택"
            leftSection={<IconUpload size={16} />}
            multiple
          />

          <TextInput
            label="예약 시간"
            type="datetime-local"
          />

          <Group justify="flex-end" mt="xl">
            <Button variant="outline">취소</Button>
            <Button>예약 등록</Button>
          </Group>
        </Stack>
      </Paper>
    </Stack>
  );
}
