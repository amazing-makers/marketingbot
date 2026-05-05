import { Stack, Title, Text } from '@mantine/core';
import AiCompareClient from './AiCompareClient';

export const metadata = { title: 'AI 모델 비교 | 마케팅봇' };
export const dynamic = 'force-dynamic';

export default function AiComparePage() {
    return (
        <Stack gap="md">
            <Stack gap={2}>
                <Title order={2}>🆚 AI 모델 비교</Title>
                <Text size="sm" c="dimmed">
                    같은 프롬프트로 여러 AI 엔진을 동시 호출 → 결과를 비교하고 가장 좋은 출력을 선택해서 캠페인으로 가져갑니다.
                </Text>
            </Stack>
            <AiCompareClient />
        </Stack>
    );
}
