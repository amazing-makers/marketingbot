import * as React from 'react';
import { Html, Head, Body, Container, Heading, Text, Section, Hr, Row, Column } from '@react-email/components';

interface WeeklyReportEmailProps {
    name: string;
    period: string;
    stats: {
        total: number;
        success: number;
        failure: number;
        successRate: number;
    };
    channelStats: {
        channelType: string;
        count: number;
    }[];
    /** Phase 30 — 전주 대비 변화 + 베스트 캠페인 */
    deltaTotal?: number;          // 전주 대비 발행 수 차이 (+ / -)
    deltaSuccessRate?: number;    // 전주 대비 성공률 % 차이
    topCampaign?: { name: string; count: number } | null;
    dashboardUrl?: string;
}

export function WeeklyReportEmail({
    name, period, stats, channelStats,
    deltaTotal, deltaSuccessRate, topCampaign, dashboardUrl,
}: WeeklyReportEmailProps) {
    const fmtDelta = (n?: number, suffix = '') => {
        if (n === undefined || n === null) return '';
        if (n === 0) return '변화 없음';
        const sign = n > 0 ? '▲' : '▼';
        return `${sign} ${Math.abs(n)}${suffix}`;
    };
    const deltaColor = (n?: number) => (n === undefined || n === 0) ? '#868e96' : (n > 0 ? '#40c057' : '#fa5252');
    return (
        <Html>
            <Head />
            <Body style={main}>
                <Container style={container}>
                    <Heading style={h1}>주간 마케팅 성과 리포트 📊</Heading>
                    <Text style={text}>{name}님, 지난 한 주간의 자동화 성과를 정리해 드립니다.</Text>
                    <Text style={periodText}>{period}</Text>
                    
                    <Section style={statsSection}>
                        <Row>
                            <Column style={statBox}>
                                <Text style={statLabel}>총 게시</Text>
                                <Text style={statValue}>{stats.total}</Text>
                                {deltaTotal !== undefined && (
                                    <Text style={{ ...deltaText, color: deltaColor(deltaTotal) }}>
                                        {fmtDelta(deltaTotal)}
                                    </Text>
                                )}
                            </Column>
                            <Column style={statBox}>
                                <Text style={statLabel}>성공</Text>
                                <Text style={statValueSuccess}>{stats.success}</Text>
                            </Column>
                            <Column style={statBox}>
                                <Text style={statLabel}>성공률</Text>
                                <Text style={statValue}>{stats.successRate}%</Text>
                                {deltaSuccessRate !== undefined && (
                                    <Text style={{ ...deltaText, color: deltaColor(deltaSuccessRate) }}>
                                        {fmtDelta(deltaSuccessRate, '%p')}
                                    </Text>
                                )}
                            </Column>
                        </Row>
                    </Section>

                    {topCampaign && (
                        <Section style={topSection}>
                            <Text style={subTitle}>🏆 이번 주 베스트 캠페인</Text>
                            <Text style={topCampaignName}>{topCampaign.name}</Text>
                            <Text style={topCampaignMeta}>{topCampaign.count}회 발행</Text>
                        </Section>
                    )}

                    <Section style={contentSection}>
                        <Text style={subTitle}>채널별 활동</Text>
                        {channelStats.map((cs) => (
                            <Row key={cs.channelType} style={channelRow}>
                                <Column>
                                    <Text style={channelName}>{cs.channelType}</Text>
                                </Column>
                                <Column align="right">
                                    <Text style={channelCount}>{cs.count}건</Text>
                                </Column>
                            </Row>
                        ))}
                    </Section>

                    {dashboardUrl && (
                        <Section style={ctaSection}>
                            <a href={dashboardUrl} style={ctaButton}>대시보드에서 자세히 보기 →</a>
                        </Section>
                    )}

                    <Hr style={hr} />
                    <Text style={footerText}>성공적인 마케팅 파트너, 마케팅봇</Text>
                </Container>
            </Body>
        </Html>
    );
}

const main = {
    backgroundColor: '#f6f9fc',
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
    backgroundColor: '#ffffff',
    margin: '0 auto',
    padding: '40px 20px',
    borderRadius: '8px',
    maxWidth: '560px',
};

const h1 = {
    color: '#228be6',
    fontSize: '22px',
    fontWeight: '700',
    textAlign: 'center' as const,
    margin: '20px 0',
};

const text = {
    color: '#495057',
    fontSize: '15px',
    textAlign: 'center' as const,
};

const periodText = {
    color: '#868e96',
    fontSize: '13px',
    textAlign: 'center' as const,
    marginBottom: '30px',
};

const statsSection = {
    backgroundColor: '#f8f9fa',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '30px',
};

const statBox = {
    textAlign: 'center' as const,
};

const statLabel = {
    fontSize: '12px',
    color: '#868e96',
    fontWeight: '700',
    marginBottom: '4px',
};

const statValue = {
    fontSize: '24px',
    fontWeight: '700',
    color: '#212529',
    margin: '0',
};

const statValueSuccess = {
    fontSize: '24px',
    fontWeight: '700',
    color: '#40c057',
    margin: '0',
};

const contentSection = {
    margin: '20px 0',
};

const subTitle = {
    fontSize: '16px',
    fontWeight: '700',
    color: '#495057',
    marginBottom: '15px',
};

const channelRow = {
    borderBottom: '1px solid #f1f3f5',
    padding: '10px 0',
};

const channelName = {
    fontSize: '14px',
    margin: '0',
};

const channelCount = {
    fontSize: '14px',
    fontWeight: '700',
    margin: '0',
};

const hr = {
    borderColor: '#e9ecef',
    margin: '30px 0',
};

const footerText = {
    fontSize: '12px',
    color: '#adb5bd',
    textAlign: 'center' as const,
};

const deltaText = {
    fontSize: '11px',
    fontWeight: '600' as const,
    margin: '4px 0 0',
};

const topSection = {
    backgroundColor: '#fff9db',
    border: '1px solid #ffe066',
    padding: '16px',
    borderRadius: '8px',
    margin: '20px 0',
    textAlign: 'center' as const,
};

const topCampaignName = {
    fontSize: '16px',
    fontWeight: '700' as const,
    color: '#212529',
    margin: '8px 0 4px',
};

const topCampaignMeta = {
    fontSize: '13px',
    color: '#868e96',
    margin: '0',
};

const ctaSection = {
    textAlign: 'center' as const,
    margin: '30px 0 10px',
};

const ctaButton = {
    backgroundColor: '#228be6',
    color: '#ffffff',
    padding: '12px 24px',
    borderRadius: '6px',
    textDecoration: 'none',
    fontWeight: '600' as const,
    fontSize: '14px',
    display: 'inline-block',
};
