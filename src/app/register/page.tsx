"use client";

import { TextInput, PasswordInput, Button, Paper, Title, Container, Stack, Anchor, Text, Badge, Group } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { registerUser } from '@/app/actions/authActions';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState, Suspense } from 'react';

function RegisterPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refFromUrl = (searchParams.get('ref') || '').trim().toUpperCase();
  const refByFromUrl = (searchParams.get('refby') || '').trim().toUpperCase();
  const [referralCode, setReferralCode] = useState(refFromUrl);
  const [refByCode, setRefByCode] = useState(refByFromUrl);

  // localStorage 백업 — ?ref= 또는 ?refby= 가 있으면 30일 보관
  useEffect(() => {
    if (refFromUrl) {
      try {
        localStorage.setItem('amakers_ref', refFromUrl);
        localStorage.setItem('amakers_ref_at', String(Date.now()));
      } catch { /* SSR 환경 무시 */ }
    } else {
      try {
        const stored = localStorage.getItem('amakers_ref');
        const storedAt = Number(localStorage.getItem('amakers_ref_at') || 0);
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
        if (stored && Date.now() - storedAt < thirtyDaysMs) {
          setReferralCode(stored);
        }
      } catch { /* ignore */ }
    }
    // refby 도 동일 30일 보관
    if (refByFromUrl) {
      try {
        localStorage.setItem('amakers_refby', refByFromUrl);
        localStorage.setItem('amakers_refby_at', String(Date.now()));
      } catch { /* ignore */ }
    } else {
      try {
        const stored = localStorage.getItem('amakers_refby');
        const storedAt = Number(localStorage.getItem('amakers_refby_at') || 0);
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
        if (stored && Date.now() - storedAt < thirtyDaysMs) {
          setRefByCode(stored);
        }
      } catch { /* ignore */ }
    }
  }, [refFromUrl, refByFromUrl]);

  const form = useForm({
    initialValues: {
      name: '',
      email: '',
      password: '',
    },
    validate: {
      name: (value) => (value.length < 2 ? '이름을 입력하세요.' : null),
      email: (value) => (/^\S+@\S+$/.test(value) ? null : '유효한 이메일 형식이 아닙니다.'),
      password: (value) => (value.length < 6 ? '비밀번호는 6자 이상이어야 합니다.' : null),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    const formData = new FormData();
    formData.append('name', values.name);
    formData.append('email', values.email);
    formData.append('password', values.password);
    if (referralCode) formData.append('referralCode', referralCode);
    if (refByCode) formData.append('refByCode', refByCode);

    const result = await registerUser(formData);

    if (result.error) {
      notifications.show({
        title: '회원가입 실패',
        message: '이미 존재하는 이메일이거나 입력값이 올바르지 않습니다.',
        color: 'red',
      });
    } else {
      // 가입 성공 시 referral 토큰 정리
      try {
        localStorage.removeItem('amakers_ref');
        localStorage.removeItem('amakers_ref_at');
        localStorage.removeItem('amakers_refby');
        localStorage.removeItem('amakers_refby_at');
      } catch { /* ignore */ }
      notifications.show({
        title: '회원가입 성공',
        message: '로그인 페이지로 이동합니다.',
        color: 'green',
      });
      router.push('/login');
    }
  };

  return (
    <Container size={420} my={40}>
      <Title ta="center" fw={900}>계정 생성</Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        이미 계정이 있으신가요?{' '}
        <Anchor size="sm" component={Link} href="/login">
          로그인
        </Anchor>
      </Text>

      {referralCode && (
        <Group justify="center" mt="md">
          <Badge color="violet" variant="light" size="lg">
            🎁 파트너 추천 코드 적용됨: {referralCode}
          </Badge>
        </Group>
      )}
      {refByCode && (
        <Group justify="center" mt="md">
          <Badge color="pink" variant="light" size="lg">
            👥 친구 초대 코드 적용됨: {refByCode}
          </Badge>
        </Group>
      )}

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput
              label="이름"
              placeholder="홍길동"
              required
              {...form.getInputProps('name')}
            />
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
              가입하기
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<Container size={420} my={40}><Text>로딩중...</Text></Container>}>
      <RegisterPageInner />
    </Suspense>
  );
}
