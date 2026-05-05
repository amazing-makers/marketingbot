import * as React from 'react';
import { Html, Head, Body, Container, Heading, Text, Button, Hr, Section } from '@react-email/components';

interface NotificationItem {
    title: string;
    body: string | null;
    kind: string;
    createdAt: string; // YYYY-MM-DD HH:mm
}

interface Props {
    name: string;
    unreadCount: number;
    daysSinceLastVisit: number;
    items: NotificationItem[]; // 최대 10개
    notificationsUrl: string;
}

const KIND_EMOJI: Record<string, string> = {
    REFERRAL_NEW: '🎉',
    COMMISSION_NEW: '💰',
    TIER_UPGRADE: '🏆',
    WORKSPACE_INVITE: '🤝',
    SERIES_COMPLETE: '✅',
    TRIAL_EXPIRING: '⏰',
    TRIAL_RECOVERY: '🎁',
    LOGIN_NEW_DEVICE: '🔐',
    CHANNEL_ERROR: '🚨',
    SYSTEM: '📣',
};

export function NotificationDigestEmail({ name, unreadCount, daysSinceLastVisit, items, notificationsUrl }: Props) {
    return (
        <Html>
            <Head />
            <Body style={main}>
                <Container style={container}>
                    <Section style={header}>
                        <Heading style={h1}>📬 미확인 알림 {unreadCount}건</Heading>
                    </Section>

                    <Section style={content}>
                        <Text style={text}>{name}님, 안녕하세요.</Text>
                        <Text style={text}>
                            마지막 방문 후 <strong>{daysSinceLastVisit}일</strong> 동안
                            확인하지 않은 알림이 <strong>{unreadCount}건</strong> 쌓였어요.
                        </Text>

                        <Section style={listBox}>
                            {items.slice(0, 10).map((item, i) => (
                                <Section key={i} style={itemRow}>
                                    <Text style={itemEmoji}>{KIND_EMOJI[item.kind] || '📣'}</Text>
                                    <Section style={itemContent}>
                                        <Text style={itemTitle}>{item.title}</Text>
                                        {item.body && <Text style={itemBody}>{item.body.slice(0, 120)}</Text>}
                                        <Text style={itemTime}>{item.createdAt}</Text>
                                    </Section>
                                </Section>
                            ))}
                            {unreadCount > 10 && (
                                <Text style={moreText}>+ {unreadCount - 10}건 더</Text>
                            )}
                        </Section>

                        <Button href={notificationsUrl} style={button}>
                            대시보드에서 모두 확인
                        </Button>

                        <Text style={smallText}>
                            너무 자주 받으신다면 알림 설정에서 다이제스트 이메일을 끌 수 있습니다.
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
const h1 = { color: '#7c3aed', fontSize: '20px', fontWeight: '800' as const, margin: '0' };
const content = { padding: '10px 0' };
const text = { color: '#212529', fontSize: '14px', lineHeight: '1.6' };
const listBox = { background: '#f9fafb', borderRadius: '8px', padding: '8px', margin: '20px 0' };
const itemRow = { padding: '12px', borderBottom: '1px solid #e5e7eb' };
const itemEmoji = { fontSize: '18px', display: 'inline-block', verticalAlign: 'top', marginRight: '8px' };
const itemContent = { display: 'inline-block', verticalAlign: 'top' };
const itemTitle = { fontSize: '13px', fontWeight: '700' as const, color: '#212529', margin: '0 0 2px' };
const itemBody = { fontSize: '12px', color: '#6b7280', margin: '0 0 4px', lineHeight: '1.5' };
const itemTime = { fontSize: '10px', color: '#9ca3af', margin: '0' };
const moreText = { fontSize: '12px', color: '#7c3aed', textAlign: 'center' as const, padding: '12px', fontWeight: '600' as const };
const button = { backgroundColor: '#7c3aed', color: '#ffffff', padding: '12px 24px', borderRadius: '8px', textDecoration: 'none', fontWeight: '700' as const, fontSize: '14px', display: 'inline-block', marginTop: '8px' };
const smallText = { fontSize: '12px', color: '#6b7280', marginTop: '16px', lineHeight: '1.6' };
const hr = { borderColor: '#e5e7eb', margin: '30px 0' };
const footer = { padding: '0 10px' };
const footerText = { fontSize: '12px', color: '#9ca3af', textAlign: 'center' as const };
