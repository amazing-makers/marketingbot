import { Container, Title, Text, Stack, Paper, Code, Anchor, Group, Box, Badge, Table } from '@mantine/core';
import { IconWebhook, IconExternalLink, IconKey, IconBolt } from '@tabler/icons-react';
import Link from 'next/link';

export const metadata = { title: 'API 문서 | 마케팅봇' };
export const dynamic = 'force-dynamic';

export default function ApiDocsPage() {
    return (
        <Container size="md" py="xl">
            <Stack gap="xl">
                <Stack gap={2}>
                    <Group gap={6}>
                        <IconWebhook size={28} />
                        <Title order={1}>API 문서</Title>
                    </Group>
                    <Text c="dimmed">
                        Zapier, Make, n8n, 자체 자동화 도구에서 마케팅봇 API 를 호출하는 방법.
                    </Text>
                </Stack>

                {/* 인증 */}
                <Paper withBorder p="lg" radius="md">
                    <Group gap={6} mb="sm">
                        <IconKey size={18} />
                        <Title order={3}>1. 인증 (Webhook 토큰)</Title>
                    </Group>
                    <Text size="sm" mb="md">
                        대시보드에서 webhook 토큰을 발급받으세요. URL 자체에 토큰이 포함되어 별도 헤더 불필요.
                    </Text>
                    <Anchor component={Link} href="/dashboard/settings/webhooks" size="sm" fw={600}>
                        🔗 Webhook 토큰 관리 페이지로 이동 →
                    </Anchor>
                    <Box mt="md">
                        <Text size="xs" c="dimmed" mb={4}>토큰 형식</Text>
                        <Code block>https://marketingbot.amakers.co.kr/api/webhook/<strong>{`{TOKEN}`}</strong>/publish</Code>
                    </Box>
                </Paper>

                {/* 엔드포인트 */}
                <Paper withBorder p="lg" radius="md">
                    <Group gap={6} mb="sm">
                        <IconBolt size={18} />
                        <Title order={3}>2. 캠페인 즉시 발행</Title>
                    </Group>
                    <Group gap={6} mb="sm">
                        <Badge color="green" variant="filled">POST</Badge>
                        <Code>/api/webhook/{`{token}`}/publish</Code>
                    </Group>
                    <Text size="sm" mb="md">
                        본문(content)을 받아 사용자의 활성 채널들에 즉시 또는 예약 발행합니다. 자동 번역 지원.
                    </Text>

                    <Title order={5} mt="md" mb="xs">요청 본문</Title>
                    <Table verticalSpacing="xs">
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>필드</Table.Th>
                                <Table.Th>타입</Table.Th>
                                <Table.Th>필수</Table.Th>
                                <Table.Th>설명</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            <Table.Tr>
                                <Table.Td><Code>content</Code></Table.Td>
                                <Table.Td>string</Table.Td>
                                <Table.Td>✓</Table.Td>
                                <Table.Td>발행 본문 (한국어 권장, 자동 번역됨)</Table.Td>
                            </Table.Tr>
                            <Table.Tr>
                                <Table.Td><Code>channelIds</Code></Table.Td>
                                <Table.Td>string[]</Table.Td>
                                <Table.Td>-</Table.Td>
                                <Table.Td>채널 ID 배열. 미지정 시 사용자의 모든 ACTIVE 채널</Table.Td>
                            </Table.Tr>
                            <Table.Tr>
                                <Table.Td><Code>name</Code></Table.Td>
                                <Table.Td>string</Table.Td>
                                <Table.Td>-</Table.Td>
                                <Table.Td>캠페인 이름 (기본: "Webhook trigger 시각")</Table.Td>
                            </Table.Tr>
                            <Table.Tr>
                                <Table.Td><Code>scheduledAt</Code></Table.Td>
                                <Table.Td>string</Table.Td>
                                <Table.Td>-</Table.Td>
                                <Table.Td>ISO 8601 일시. 미지정 시 즉시 발행</Table.Td>
                            </Table.Tr>
                            <Table.Tr>
                                <Table.Td><Code>sourceLanguage</Code></Table.Td>
                                <Table.Td>string</Table.Td>
                                <Table.Td>-</Table.Td>
                                <Table.Td>본문 언어 (기본 'ko')</Table.Td>
                            </Table.Tr>
                            <Table.Tr>
                                <Table.Td><Code>autoTranslate</Code></Table.Td>
                                <Table.Td>boolean</Table.Td>
                                <Table.Td>-</Table.Td>
                                <Table.Td>채널 언어로 자동 번역 (기본 true)</Table.Td>
                            </Table.Tr>
                        </Table.Tbody>
                    </Table>

                    <Title order={5} mt="md" mb="xs">cURL 예시</Title>
                    <Code block>{`curl -X POST https://marketingbot.amakers.co.kr/api/webhook/YOUR_TOKEN/publish \\
  -H "Content-Type: application/json" \\
  -d '{
    "content": "오늘의 신메뉴! 바닐라 라떼 출시 🥛",
    "name": "신메뉴 출시"
  }'`}</Code>

                    <Title order={5} mt="md" mb="xs">성공 응답 (200)</Title>
                    <Code block>{`{
  "success": true,
  "campaignId": "clxx...",
  "tasksCreated": 3,
  "channels": ["INSTAGRAM", "FACEBOOK", "X"]
}`}</Code>

                    <Title order={5} mt="md" mb="xs">에러 응답</Title>
                    <Table verticalSpacing="xs">
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>상태</Table.Th>
                                <Table.Th>의미</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            <Table.Tr>
                                <Table.Td><Badge color="red" variant="light">401</Badge></Table.Td>
                                <Table.Td>Invalid or disabled token</Table.Td>
                            </Table.Tr>
                            <Table.Tr>
                                <Table.Td><Badge color="orange" variant="light">429</Badge></Table.Td>
                                <Table.Td>Rate limit exceeded (분당 60건 또는 일 200건)</Table.Td>
                            </Table.Tr>
                            <Table.Tr>
                                <Table.Td><Badge color="orange" variant="light">400</Badge></Table.Td>
                                <Table.Td>요청 본문 검증 실패 (필수 필드 누락 등)</Table.Td>
                            </Table.Tr>
                            <Table.Tr>
                                <Table.Td><Badge color="red" variant="light">500</Badge></Table.Td>
                                <Table.Td>서버 오류</Table.Td>
                            </Table.Tr>
                        </Table.Tbody>
                    </Table>
                </Paper>

                {/* Rate Limit */}
                <Paper withBorder p="lg" radius="md">
                    <Title order={3} mb="sm">3. Rate Limit</Title>
                    <Text size="sm" mb="md">
                        토큰 단위로 카운트합니다. 응답 헤더에 남은 한도가 노출됩니다.
                    </Text>
                    <Table verticalSpacing="xs">
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>윈도우</Table.Th>
                                <Table.Th>한도</Table.Th>
                                <Table.Th>응답 헤더</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            <Table.Tr>
                                <Table.Td>1분</Table.Td>
                                <Table.Td>60건</Table.Td>
                                <Table.Td><Code>X-RateLimit-Minute-Remaining</Code></Table.Td>
                            </Table.Tr>
                            <Table.Tr>
                                <Table.Td>24시간</Table.Td>
                                <Table.Td>200건</Table.Td>
                                <Table.Td><Code>X-RateLimit-Day-Remaining</Code></Table.Td>
                            </Table.Tr>
                        </Table.Tbody>
                    </Table>
                </Paper>

                {/* 통합 가이드 */}
                <Paper withBorder p="lg" radius="md">
                    <Title order={3} mb="sm">4. 통합 가이드</Title>
                    <Stack gap="md">
                        <Box>
                            <Group gap={6} mb={4}>
                                <Badge color="orange" variant="light">Zapier</Badge>
                                <Text fw={600} size="sm">Webhooks by Zapier</Text>
                            </Group>
                            <Text size="xs" c="dimmed">
                                Action: "POST" → URL 에 토큰 URL · Body Type: JSON · Data 에 content 필드 매핑
                            </Text>
                        </Box>
                        <Box>
                            <Group gap={6} mb={4}>
                                <Badge color="violet" variant="light">Make.com</Badge>
                                <Text fw={600} size="sm">HTTP Module</Text>
                            </Group>
                            <Text size="xs" c="dimmed">
                                Make a request → Method POST → URL · Headers Content-Type: application/json · Body application/json
                            </Text>
                        </Box>
                        <Box>
                            <Group gap={6} mb={4}>
                                <Badge color="teal" variant="light">n8n</Badge>
                                <Text fw={600} size="sm">HTTP Request Node</Text>
                            </Group>
                            <Text size="xs" c="dimmed">
                                Method POST · Send Body → JSON · Body Parameters: name=content, value=<Code>{`{{ $json.text }}`}</Code>
                            </Text>
                        </Box>
                    </Stack>
                </Paper>

                {/* 관련 문서 */}
                <Paper withBorder p="md" radius="md" bg="var(--mantine-color-default-hover)">
                    <Group gap="md" wrap="wrap">
                        <Anchor component={Link} href="/dashboard/settings/webhooks" size="sm">
                            🔗 Webhook 토큰 관리
                        </Anchor>
                        <Anchor component={Link} href="/help" size="sm">
                            📚 도움말 메인
                        </Anchor>
                        <Anchor href="mailto:help@amakers.co.kr" size="sm">
                            ✉️ 통합 문의
                        </Anchor>
                    </Group>
                </Paper>
            </Stack>
        </Container>
    );
}
