import * as React from 'react';
import { Html, Head, Body, Container, Heading, Text, Button, Hr, Section } from '@react-email/components';

interface TrialRecoveryEmailProps {
    name: string;
    expiredAt: string; // YYYY-MM-DD
    daysSinceExpired: number;
    upgradeUrl: string;
    pricingUrl: string;
}

/**
 * Phase 33 — 트라이얼 만료 후 7일 1회 발송.
 * 떠난 사용자를 다시 끌어오는 win-back 이메일.
 */
export function TrialRecoveryEmail({ name, expiredAt, daysSinceExpired, upgradeUrl, pricingUrl }: TrialRecoveryEmailProps) {
    return (
        <Html>
            <Head />
            <Body style={main}>
                <Container style={container}>
                    <Section style={header}>
                        <Heading style={h1}>{name}님, 다시 만나요 👋</Heading>
                    </Section>

                    <Section style={content}>
                        <Text style={text}>
                            마케팅봇 무료 체험이 <strong>{daysSinceExpired}일 전 ({expiredAt})</strong> 종료되었어요.
                        </Text>
                        <Text style={text}>
                            바쁘셨죠? 마케팅봇은 그동안 더 강력해졌습니다:
                        </Text>

                        <Section style={featureBox}>
                            <Text style={featureItem}>✨ <strong>모바일 카드 뷰</strong> — 휴대폰에서도 캠페인 관리</Text>
                            <Text style={featureItem}>📊 <strong>주간 다이제스트</strong> — 전주 대비 성과 비교</Text>
                            <Text style={featureItem}>🤖 <strong>에이전트 실시간 활동 로그</strong> — 모든 발행 추적</Text>
                            <Text style={featureItem}>🏷️ <strong>태그 필터</strong> — 캠페인·시리즈 빠르게 찾기</Text>
                            <Text style={featureItem}>⚡ <strong>일괄 작업</strong> — 여러 캠페인 한 번에 관리</Text>
                        </Section>

                        <Text style={text}>
                            이번에 결제하시면 첫 달 부담 없이 시작할 수 있어요.
                            기존 데이터(채널·캠페인·시리즈)는 그대로 유지됩니다.
                        </Text>

                        <Button href={upgradeUrl} style={button}>
                            플랜 보기 (월 9,900원부터)
                        </Button>

                        <Text style={smallText}>
                            궁금한 점이 있으신가요? <a href="mailto:help@amakers.co.kr" style={linkStyle}>help@amakers.co.kr</a> 로 답장 주세요.
                        </Text>
                    </Section>

                    <Hr style={hr} />

                    <Section style={footer}>
                        <Text style={footerText}>
                            주식회사 어메이커스 · help@amakers.co.kr · 1600-9221<br />
                            이 메일이 불필요하면 답장으로 알려주세요. 추가 발송 안 합니다.
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
const h1 = { color: '#7c3aed', fontSize: '22px', fontWeight: '800' as const, margin: '0' };
const content = { padding: '10px 0' };
const text = { color: '#212529', fontSize: '15px', lineHeight: '1.6' };
const featureBox = { background: '#faf5ff', border: '1px solid #ddd6fe', borderRadius: '8px', padding: '16px', margin: '20px 0' };
const featureItem = { fontSize: '14px', color: '#5b21b6', margin: '6px 0', lineHeight: '1.5' };
const button = { backgroundColor: '#7c3aed', color: '#ffffff', padding: '14px 28px', borderRadius: '8px', textDecoration: 'none', fontWeight: '700' as const, fontSize: '15px', display: 'inline-block', marginTop: '12px' };
const smallText = { fontSize: '13px', color: '#6b7280', textAlign: 'center' as const, marginTop: '20px' };
const linkStyle = { color: '#7c3aed', textDecoration: 'underline' };
const hr = { borderColor: '#e5e7eb', margin: '30px 0' };
const footer = { padding: '0 10px' };
const footerText = { fontSize: '12px', color: '#9ca3af', textAlign: 'center' as const, lineHeight: '1.6' };
