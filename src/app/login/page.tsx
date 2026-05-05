"use client";

import { TextInput, PasswordInput, Button, Paper, Title, Container, Stack, Anchor, Text } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { recordLoginEvent } from '@/app/actions/authActions';

export default function LoginPage() {
  const router = useRouter();
  const form = useForm({
    initialValues: {
      email: '',
      password: '',
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : '유효한 이메일 형식이 아닙니다.'),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    const result = await signIn('credentials', {
      email: values.email,
      password: values.password,
      redirect: false,
    });

    if (result?.error) {
      notifications.show({
        title: '로그인 실패',
        message: '이메일 또는 비밀번호가 올바르지 않습니다.',
        color: 'red',
      });
    } else {
      notifications.show({
        title: '로그인 성공',
        message: '대시보드로 이동합니다.',
        color: 'green',
      });
      // Phase 34 — 새 디바이스 로그인 감지 (fire-and-forget)
      try {
        const session = await getSession();
        const userId = (session?.user as any)?.id;
        if (userId) {
          recordLoginEvent(userId).catch(() => {});
        }
      } catch { /* ignore */ }
      router.push('/dashboard');
      router.refresh();
    }
  };

  return (
    <Container size={420} my={40}>
      <Title ta="center" fw={900}>환영합니다!</Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        계정이 없으신가요?{' '}
        <Anchor size="sm" component={Link} href="/register">
          회원가입
        </Anchor>
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput 
              label="이메일" 
              placeholder="hello@amakers.co.kr" 
              required 
              {...form.getInputProps('email')}
            />
            <PasswordInput 
              label="비밀번호" 
              placeholder="비밀번호를 입력하세요" 
              required 
              {...form.getInputProps('password')}
            />
            <Button fullWidth mt="xl" type="submit">
              로그인
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}
