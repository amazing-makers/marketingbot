"use client";

import { TextInput, PasswordInput, Button, Paper, Title, Container, Stack, Anchor, Text } from '@mantine/core';

export default function RegisterPage() {
  return (
    <Container size={420} my={40}>
      <Title ta="center" fw={900}>계정 생성</Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        이미 계정이 있으신가요?{' '}
        <Anchor size="sm" component="button">
          로그인
        </Anchor>
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <Stack>
          <TextInput label="이름" placeholder="홍길동" required />
          <TextInput label="이메일" placeholder="hello@amakers.co.kr" required />
          <PasswordInput label="비밀번호" placeholder="비밀번호를 입력하세요" required />
          <Button fullWidth mt="xl">
            가입하기
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
}
