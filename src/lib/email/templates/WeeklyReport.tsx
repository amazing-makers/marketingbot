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
}

export function WeeklyReportEmail({ name, period, stats, channelStats }: WeeklyReportEmailProps) {
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
                            </Column>
                            <Column style={statBox}>
                                <Text style={statLabel}>성공</Text>
                                <Text style={statValueSuccess}>{stats.success}</Text>
                            </Column>
                            <Column style={statBox}>
                                <Text style={statLabel}>성공률</Text>
                                <Text style={statValue}>{stats.successRate}%</Text>
                            </Column>
                        </Row>
                    </Section>

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
