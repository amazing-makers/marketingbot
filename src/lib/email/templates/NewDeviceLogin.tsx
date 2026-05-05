import * as React from 'react';
import { Html, Head, Body, Container, Heading, Text, Hr, Section, Button } from '@react-email/components';

interface NewDeviceLoginEmailProps {
    name: string;
    ipAddress: string;
    userAgentSummary: string; // 예: "Chrome on Windows"
    loginAt: string; // YYYY-MM-DD HH:mm
    securityUrl: string;
}

/**
 * Phase 34 — 새 디바이스/IP 에서 로그인 시 사용자에게 알림.
 */
export function NewDeviceLoginEmail({ name, ipAddress, userAgentSummary, loginAt, securityUrl }: NewDeviceLoginEmailProps) {
    return (
        <Html>
            <Head />
            <Body style={main}>
                <Container style={container}>
                    <Section style={header}>
                        <Heading style={h1}>🔐 새 위치에서 로그인</Heading>
                    </Section>

                    <Section style={content}>
                        <Text style={text}>{name}님, 안녕하세요.</Text>
                        <Text style={text}>
                            평소와 다른 환경에서 마케팅봇 계정에 로그인이 감지되었습니다.
                        </Text>

                        <Section style={infoBox}>
                            <Text style={infoRow}><strong>일시:</strong> {loginAt}</Text>
                            <Text style={infoRow}><strong>IP 주소:</strong> {ipAddress}</Text>
                            <Text style={infoRow}><strong>기기·브라우저:</strong> {userAgentSummary}</Text>
                        </Section>

                        <Text style={text}>
                            <strong>본인이 아닌가요?</strong><br />
                            즉시 비밀번호를 변경하고 알 수 없는 세션을 종료해주세요.
                        </Text>

                        <Button href={securityUrl} style={button}>
                            비밀번호 변경하기
                        </Button>

                        <Text style={smallText}>
                            본인의 정상적인 로그인이라면 이 메일을 무시하셔도 됩니다.
                            너무 자주 받으신다면 알림 환경설정에서 끌 수 있습니다.
                        </Text>
                    </Section>

                    <Hr style={hr} />

                    <Section style={footer}>
                        <Text style={footerText}>
                            주식회사 어메이커스 · help@amakers.co.kr
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
const h1 = { color: '#dc2626', fontSize: '20px', fontWeight: '800' as const, margin: '0' };
const content = { padding: '10px 0' };
const text = { color: '#212529', fontSize: '14px', lineHeight: '1.6' };
const infoBox = { background: '#f3f4f6', borderRadius: '8px', padding: '14px', margin: '16px 0' };
const infoRow = { fontSize: '13px', color: '#374151', margin: '4px 0', lineHeight: '1.6' };
const button = { backgroundColor: '#dc2626', color: '#ffffff', padding: '12px 24px', borderRadius: '8px', textDecoration: 'none', fontWeight: '700' as const, fontSize: '14px', display: 'inline-block', marginTop: '8px' };
const smallText = { fontSize: '12px', color: '#6b7280', marginTop: '16px', lineHeight: '1.6' };
const hr = { borderColor: '#e5e7eb', margin: '30px 0' };
const footer = { padding: '0 10px' };
const footerText = { fontSize: '12px', color: '#9ca3af', textAlign: 'center' as const };
