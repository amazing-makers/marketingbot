"use client";

import { TextInput, PasswordInput, Button, Paper, Title, Container, Stack, Anchor, Text } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { registerUser } from '@/app/actions/authActions';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
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

    const result = await registerUser(formData);

    if (result.error) {
      notifications.show({
        title: '회원가입 실패',
        message: '이미 존재하는 이메일이거나 입력값이 올바르지 않습니다.',
        color: 'red',
      });
    } else {
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
