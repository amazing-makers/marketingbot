import * as React from 'react';
import { Html, Head, Body, Container, Heading, Text, Button, Hr, Section } from '@react-email/components';

interface TrialExpiringEmailProps {
    name: string;
    daysRemaining: number;
    expiresAt: string; // YYYY-MM-DD
    upgradeUrl: string;
    pricingUrl: string;
}

const URGENCY_COPY: Record<number, { title: string; emoji: string }> = {
    7: { title: '체험 기간이 1주일 남았어요', emoji: '⏰' },
    3: { title: '체험 기간 D-3 — 결제 추천', emoji: '🚨' },
    1: { title: '내일 체험 종료 — 지금 결제하면 끊김 없이 사용', emoji: '⚡' },
};

export function TrialExpiringEmail({ name, daysRemaining, expiresAt, upgradeUrl, pricingUrl }: TrialExpiringEmailProps) {
    const copy = URGENCY_COPY[daysRemaining] || URGENCY_COPY[7];
    return (
        <Html>
            <Head />
            <Body style={main}>
                <Container style={container}>
                    <Section style={header}>
                        <Heading style={h1}>{copy.emoji} {copy.title}</Heading>
                    </Section>

                    <Section style={content}>
                        <Text style={text}>{name}님, 안녕하세요!</Text>
                        <Text style={text}>
                            마케팅봇 무료 체험이 <strong style={highlight}>{daysRemaining}일</strong> 후
                            (<strong>{expiresAt}</strong>) 종료됩니다.
                        </Text>

                        <Section style={planBox}>
                            <Text style={planLabel}>체험 후 자동 다운그레이드 시</Text>
                            <Text style={planText}>
                                ❌ 자동 발행 중단<br />
                                ❌ AI 캡션·이미지 생성 일일 한도 도달<br />
                                ❌ 시리즈 자동 운영 일시정지<br />
                                ❌ 슬랙·디스코드 webhook 알림 비활성
                            </Text>
                        </Section>

                        <Text style={text}>
                            계속 사용하시려면 지금 결제해주세요. 체험 기간 종료 전에 결제하면
                            <strong> 끊김 없이</strong> 캠페인이 유지됩니다.
                        </Text>

                        <Button href={upgradeUrl} style={button}>
                            지금 결제하기 (월 9,900원부터)
                        </Button>

                        <Text style={smallText}>
                            <a href={pricingUrl} style={linkStyle}>플랜 비교 보기 →</a>
                        </Text>
                    </Section>

                    <Hr style={hr} />

                    <Section style={footer}>
                        <Text style={footerText}>
                            주식회사 어메이커스 · help@amakers.co.kr · 1600-9221<br />
                            이 메일이 불필요하면 대시보드 → 알림 설정에서 끌 수 있습니다.
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
}

const main = { backgroundColor: '#f6f9fc', fontFamily: '-apple-system,Segoe UI,Roboto,sans-serif' };
const container = { backgroundColor: '#ffffff', margin: '0 auto', padding: '40px 24px', borderRadius: '8px', maxWidth: '560px' };
const header = { textAlign: 'center' as const, marginBottom: '20px' };
const h1 = { color: '#dc2626', fontSize: '22px', fontWeight: '800' as const, margin: '0' };
const content = { padding: '10px 0' };
const text = { color: '#212529', fontSize: '15px', lineHeight: '1.6' };
const highlight = { color: '#dc2626', fontSize: '18px' };
const planBox = { background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '16px', margin: '20px 0' };
const planLabel = { fontSize: '12px', color: '#dc2626', fontWeight: '700' as const, margin: '0 0 8px' };
const planText = { fontSize: '14px', color: '#7f1d1d', margin: '0', lineHeight: '1.8' };
const button = { backgroundColor: '#7c3aed', color: '#ffffff', padding: '14px 28px', borderRadius: '8px', textDecoration: 'none', fontWeight: '700' as const, fontSize: '15px', display: 'inline-block', marginTop: '12px' };
const smallText = { fontSize: '13px', color: '#6b7280', textAlign: 'center' as const, marginTop: '12px' };
const linkStyle = { color: '#7c3aed', textDecoration: 'underline' };
const hr = { borderColor: '#e5e7eb', margin: '30px 0' };
const footer = { padding: '0 10px' };
const footerText = { fontSize: '12px', color: '#9ca3af', textAlign: 'center' as const, lineHeight: '1.6' };
