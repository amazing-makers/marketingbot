"use client";

import { Container, Title, Text, Button, Group, Stack } from "@mantine/core";

export default function LandingPage() {
  return (
    <Container size="md" py={100}>
      <Stack align="center" gap="xl">
        <Title order={1} size={48} fw={900} ta="center">
          SNS 마케팅의 모든 것, <br />
          <Text span c="blue" inherit>자동화</Text>로 시작하세요
        </Title>
        
        <Text size="xl" c="dimmed" ta="center" maw={600}>
          Docker 설치 없이 클릭 한 번으로 시작하는 데스크톱 기반 SNS 자동화 솔루션.
          지금 바로 대시보드에서 예약하고 에이전트를 통해 발행하세요.
        </Text>

        <Group gap="md">
          <Button size="lg" variant="filled">대시보드 시작하기</Button>
          <Button size="lg" variant="outline">데스크톱 앱 다운로드</Button>
        </Group>

        <Stack gap="xs" align="center" mt={50}>
          <Text fw={700}>지원 플랫폼</Text>
          <Group gap="lg">
            <Text>Instagram</Text>
            <Text>Naver Blog</Text>
            <Text>Threads</Text>
            <Text>X (Twitter)</Text>
          </Group>
        </Stack>
      </Stack>
    </Container>
  );
}
