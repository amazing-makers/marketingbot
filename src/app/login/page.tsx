"use client";

import { TextInput, PasswordInput, Button, Paper, Title, Container, Stack, Anchor, Text, Alert } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { signIn, getSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense, useEffect } from 'react';
import { IconUserPlus } from '@tabler/icons-react';
import { recordLoginEvent } from '@/app/actions/authActions';

function LoginInner() {
  const searchParams = useSearchParams();
  const prefillEmail = searchParams.get('email') || '';
  const isAddMode = searchParams.get('add') === '1';

  const form = useForm({
    initialValues: {
      email: prefillEmail,
      password: '',
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : '유효한 이메일 형식이 아닙니다.'),
    },
  });

  // ?email= 변경 시 form 동기화
  useEffect(() => {
    if (prefillEmail && form.values.email !== prefillEmail) {
      form.setFieldValue('email', prefillEmail);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillEmail]);

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
      // hard navigation — signIn 직후 router.push 는 신규 세션 쿠키가 server component 까지 전파되기 전에 navigate 되어 /dashboard 의 auth() 가 미인증으로 판단, /login 으로 튕기는 race condition 발생. window.location 으로 전체 reload 해 쿠키 반영 보장.
      window.location.href = '/dashboard';
    }
  };

  const title = isAddMode ? '다른 계정 추가' : '환영합니다!';
  const subtitle = isAddMode
    ? '추가할 계정의 이메일·비밀번호를 입력하세요. 로그인 후 헤더의 계정 메뉴에서 빠르게 전환할 수 있어요.'
    : null;

  return (
    <Container size={420} my={40}>
      <Title ta="center" fw={900}>{title}</Title>
      {subtitle ? (
        <Text c="dimmed" size="sm" ta="center" mt={5}>{subtitle}</Text>
      ) : (
        <Text c="dimmed" size="sm" ta="center" mt={5}>
          계정이 없으신가요?{' '}
          <Anchor size="sm" component={Link} href="/register">
            회원가입
          </Anchor>
        </Text>
      )}

      {prefillEmail && !isAddMode && (
        <Alert color="violet" icon={<IconUserPlus size={16} />} mt="md" variant="light">
          저장된 계정으로 전환합니다. <strong>{prefillEmail}</strong> 의 비밀번호를 입력해주세요.
        </Alert>
      )}

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
              autoFocus={!!prefillEmail}
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

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
