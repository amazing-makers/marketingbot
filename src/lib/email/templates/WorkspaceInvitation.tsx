import * as React from 'react';
import { Html, Head, Body, Container, Heading, Text, Button, Hr, Section } from '@react-email/components';

interface WorkspaceInvitationEmailProps {
    inviterName: string;
    workspaceName: string;
    role: string;
    message?: string;
    inviteUrl: string;
    expiresInDays: number;
}

const ROLE_LABELS: Record<string, string> = {
    ADMIN: '관리자',
    MEMBER: '멤버',
    VIEWER: '뷰어 (읽기 전용)',
};

export function WorkspaceInvitationEmail({
    inviterName,
    workspaceName,
    role,
    message,
    inviteUrl,
    expiresInDays,
}: WorkspaceInvitationEmailProps) {
    return (
        <Html>
            <Head />
            <Body style={main}>
                <Container style={container}>
                    <Section style={header}>
                        <Heading style={h1}>🤝 워크스페이스 초대</Heading>
                    </Section>

                    <Section style={content}>
                        <Text style={text}>
                            <strong>{inviterName}</strong> 님이 마케팅봇의 워크스페이스에 초대했습니다.
                        </Text>

                        <Section style={cardBox}>
                            <Text style={cardLabel}>워크스페이스</Text>
                            <Text style={cardValue}>🏢 {workspaceName}</Text>
                            <Hr style={hrLight} />
                            <Text style={cardLabel}>부여될 권한</Text>
                            <Text style={cardValue}>{ROLE_LABELS[role] || role}</Text>
                        </Section>

                        {message && (
                            <Section style={messageBox}>
                                <Text style={messageLabel}>💬 초대 메시지</Text>
                                <Text style={messageText}>{message}</Text>
                            </Section>
                        )}

                        <Section style={btnSection}>
                            <Button style={btn} href={inviteUrl}>
                                초대 수락하기
                            </Button>
                        </Section>

                        <Text style={smallText}>
                            계정이 없으셔도 됩니다 — 클릭 후 가입하면 자동으로 워크스페이스에 합류됩니다.
                            <br />이 초대는 <strong>{expiresInDays}일 후 만료</strong>됩니다.
                        </Text>

                        <Hr style={hr} />

                        <Text style={footer}>
                            본인이 초대받지 않으셨다면 이 메일을 무시하시면 됩니다.<br />
                            문의: help@amakers.co.kr
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
}

const main = { background: '#f6f9fc', fontFamily: 'system-ui, -apple-system, sans-serif' };
const container = { background: '#fff', margin: '0 auto', padding: '24px', maxWidth: '560px', borderRadius: '8px' };
const header = { textAlign: 'center' as const, padding: '20px 0' };
const h1 = { color: '#1a1a1a', fontSize: '24px', margin: 0 };
const content = { padding: '0 16px' };
const text = { color: '#333', fontSize: '15px', lineHeight: '1.6', margin: '12px 0' };
const cardBox = { background: '#faf5ff', padding: '16px', borderRadius: '8px', border: '1px solid #e4d4ff', margin: '20px 0' };
const cardLabel = { color: '#7c3aed', fontSize: '11px', fontWeight: 600 as const, textTransform: 'uppercase' as const, margin: '4px 0' };
const cardValue = { color: '#1a1a1a', fontSize: '16px', fontWeight: 700 as const, margin: '4px 0 12px' };
const messageBox = { background: '#f0f9ff', padding: '12px 16px', borderRadius: '6px', borderLeft: '3px solid #3b82f6', margin: '16px 0' };
const messageLabel = { color: '#1e40af', fontSize: '11px', fontWeight: 600 as const, margin: 0 };
const messageText = { color: '#1e3a8a', fontSize: '14px', margin: '4px 0', whiteSpace: 'pre-wrap' as const };
const btnSection = { textAlign: 'center' as const, padding: '24px 0' };
const btn = { background: '#7c3aed', color: '#fff', padding: '12px 32px', borderRadius: '6px', textDecoration: 'none', fontWeight: 600 as const, fontSize: '15px' };
const smallText = { color: '#666', fontSize: '13px', textAlign: 'center' as const, margin: '8px 0' };
const hr = { borderColor: '#e6e6e6', margin: '24px 0' };
const hrLight = { borderColor: '#e4d4ff', margin: '8px 0' };
const footer = { color: '#999', fontSize: '12px', textAlign: 'center' as const, margin: '8px 0' };
