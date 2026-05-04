import {
    Html, Head, Body, Container, Section, Text, Heading, Hr, Link, Button,
    Tailwind, Preview
} from '@react-email/components';

interface Props {
    userName: string;
    seriesName: string;
    seriesId: string;
    totalPosts: number;
    completedPosts: number;
    failedPosts: number;
    successCount: number;
    failedTaskCount: number;
    appUrl: string;
}

export function SeriesCompletedEmail({
    userName, seriesName, seriesId, totalPosts, completedPosts, failedPosts,
    successCount, failedTaskCount, appUrl,
}: Props) {
    const allSuccess = failedPosts === 0 && failedTaskCount === 0;
    const seriesUrl = `${appUrl}/dashboard/campaigns/series/${seriesId}`;
    const successRate = (completedPosts + failedPosts) > 0
        ? Math.round((successCount / (successCount + failedTaskCount)) * 100)
        : 0;

    return (
        <Html>
            <Head />
            <Preview>{`🤖 시리즈 "${seriesName}" 완료 — ${completedPosts}/${totalPosts} 발행`}</Preview>
            <Tailwind>
                <Body className="bg-gray-50 font-sans">
                    <Container className="bg-white rounded-lg shadow-sm my-10 p-8 max-w-xl">
                        <Heading className="text-2xl font-bold mb-2">
                            {allSuccess ? '🎉' : '✅'} 시리즈 완료!
                        </Heading>
                        <Text className="text-gray-700 mb-6">
                            안녕하세요 {userName}님, 자동화 시리즈 <strong>"{seriesName}"</strong> 가 모든 발행을 끝냈어요.
                        </Text>

                        <Section className="bg-gray-50 rounded-lg p-6 mb-6">
                            <Text className="text-xs text-gray-500 mb-1 uppercase font-bold">결과 요약</Text>
                            <table className="w-full">
                                <tr>
                                    <td className="py-2 text-gray-600">총 발행</td>
                                    <td className="py-2 text-right font-bold">{completedPosts} / {totalPosts}</td>
                                </tr>
                                <tr>
                                    <td className="py-2 text-gray-600">성공한 task</td>
                                    <td className="py-2 text-right font-bold text-teal-700">{successCount}건</td>
                                </tr>
                                {failedTaskCount > 0 && (
                                    <tr>
                                        <td className="py-2 text-gray-600">실패한 task</td>
                                        <td className="py-2 text-right font-bold text-red-700">{failedTaskCount}건</td>
                                    </tr>
                                )}
                                <tr>
                                    <td className="py-2 text-gray-600">성공률</td>
                                    <td className="py-2 text-right font-bold">{successRate}%</td>
                                </tr>
                                {failedPosts > 0 && (
                                    <tr>
                                        <td className="py-2 text-gray-600">시리즈 실행 실패</td>
                                        <td className="py-2 text-right font-bold text-orange-700">{failedPosts}회</td>
                                    </tr>
                                )}
                            </table>
                        </Section>

                        <Section className="text-center mb-6">
                            <Button
                                href={seriesUrl}
                                className="bg-violet-600 text-white px-6 py-3 rounded-md font-bold no-underline"
                            >
                                상세 결과 보기
                            </Button>
                        </Section>

                        {!allSuccess && (
                            <Section className="bg-orange-50 border-l-4 border-orange-400 p-4 mb-6 rounded">
                                <Text className="text-sm text-orange-900">
                                    ⚠️ 일부 발행이 실패했어요. 상세 페이지에서 실패 사유를 확인하고 같은 시리즈를 다시 만들거나,
                                    채널 토큰을 확인해주세요.
                                </Text>
                            </Section>
                        )}

                        <Hr className="border-gray-200 my-6" />
                        <Text className="text-xs text-gray-500 text-center">
                            마케팅봇 자동화 시리즈 알림 · <Link href={`${appUrl}/dashboard/settings/notifications`}>알림 설정</Link>
                        </Text>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
}
