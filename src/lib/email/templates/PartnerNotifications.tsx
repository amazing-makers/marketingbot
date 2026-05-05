import * as React from 'react';
import { Html, Head, Body, Container, Heading, Text, Button, Hr, Section } from '@react-email/components';

const main = { background: '#f6f9fc', fontFamily: 'system-ui, -apple-system, sans-serif' };
const container = { background: '#fff', margin: '0 auto', padding: '24px', maxWidth: '560px', borderRadius: '8px' };
const h1 = { color: '#1a1a1a', fontSize: '22px', margin: '0 0 16px' };
const text = { color: '#333', fontSize: '15px', lineHeight: '1.6', margin: '12px 0' };
const card = { background: '#faf5ff', padding: '16px', borderRadius: '8px', border: '1px solid #e4d4ff', margin: '16px 0' };
const cardLabel = { color: '#7c3aed', fontSize: '11px', fontWeight: 600 as const, textTransform: 'uppercase' as const, margin: '4px 0' };
const cardValue = { color: '#1a1a1a', fontSize: '20px', fontWeight: 800 as const, margin: '4px 0' };
const btn = { background: '#7c3aed', color: '#fff', padding: '10px 24px', borderRadius: '6px', textDecoration: 'none', fontWeight: 600 as const, fontSize: '14px', display: 'inline-block' };
const hr = { borderColor: '#e6e6e6', margin: '20px 0' };
const footer = { color: '#999', fontSize: '12px', textAlign: 'center' as const, margin: '8px 0' };

// ─── 신규 추천 사용자 가입 ───
export function NewReferralEmail({
    partnerName,
    referredEmail,
    referredName,
    referralCode,
    dashboardUrl,
}: {
    partnerName: string;
    referredEmail: string;
    referredName: string | null;
    referralCode: string;
    dashboardUrl: string;
}) {
    return (
        <Html>
            <Head />
            <Body style={main}>
                <Container style={container}>
                    <Heading style={h1}>🎉 새 추천 사용자 가입!</Heading>
                    <Text style={text}>
                        {partnerName} 님, 추천 코드 <strong>{referralCode}</strong> 로 새로운 사용자가 가입했습니다.
                    </Text>
                    <Section style={card}>
                        <Text style={cardLabel}>가입자</Text>
                        <Text style={cardValue}>{referredName || referredEmail}</Text>
                        <Text style={{ color: '#666', fontSize: '13px' }}>{referredEmail}</Text>
                    </Section>
                    <Text style={text}>
                        해당 사용자가 유료 플랜으로 업그레이드하면 매월 자동으로 commission 이 누적됩니다.
                    </Text>
                    <Section style={{ textAlign: 'center', padding: '16px 0' }}>
                        <Button style={btn} href={dashboardUrl}>파트너 대시보드 →</Button>
                    </Section>
                    <Hr style={hr} />
                    <Text style={footer}>amakers · help@amakers.co.kr</Text>
                </Container>
            </Body>
        </Html>
    );
}

// ─── 새 commission 누적 ───
export function NewCommissionEmail({
    partnerName,
    period,
    amount,
    referredCount,
    dashboardUrl,
}: {
    partnerName: string;
    period: string; // "2026-05"
    amount: number;
    referredCount: number;
    dashboardUrl: string;
}) {
    return (
        <Html>
            <Head />
            <Body style={main}>
                <Container style={container}>
                    <Heading style={h1}>💰 {period} commission 정산 대기</Heading>
                    <Text style={text}>{partnerName} 님, 지난달 commission 이 계산되었습니다.</Text>
                    <Section style={card}>
                        <Text style={cardLabel}>{period} commission</Text>
                        <Text style={cardValue}>₩{amount.toLocaleString()}</Text>
                        <Text style={{ color: '#666', fontSize: '13px' }}>{referredCount}명의 추천 사용자에게서 발생</Text>
                    </Section>
                    <Text style={text}>
                        관리자 확인 후 입금 처리됩니다. 입금 일정은 보통 다음 달 첫 영업일.
                    </Text>
                    <Section style={{ textAlign: 'center', padding: '16px 0' }}>
                        <Button style={btn} href={dashboardUrl}>상세 보기 →</Button>
                    </Section>
                    <Hr style={hr} />
                    <Text style={footer}>amakers · help@amakers.co.kr</Text>
                </Container>
            </Body>
        </Html>
    );
}

// ─── 티어 승급 ───
export function TierUpgradeEmail({
    partnerName,
    fromTier,
    toTier,
    fromRate,
    toRate,
    perks,
    dashboardUrl,
}: {
    partnerName: string;
    fromTier: string;
    toTier: string;
    fromRate: number;
    toRate: number;
    perks: string[];
    dashboardUrl: string;
}) {
    return (
        <Html>
            <Head />
            <Body style={main}>
                <Container style={container}>
                    <Heading style={h1}>🏆 등급 승급 축하드립니다!</Heading>
                    <Text style={text}>
                        {partnerName} 님, <strong>{fromTier}</strong> 에서 <strong>{toTier}</strong> 로 등급이 올라갔어요.
                    </Text>
                    <Section style={card}>
                        <Text style={cardLabel}>새 수수료율</Text>
                        <Text style={cardValue}>{(fromRate * 100).toFixed(0)}% → {(toRate * 100).toFixed(0)}%</Text>
                    </Section>
                    <Text style={text}><strong>새로 활성화된 혜택:</strong></Text>
                    <ul style={{ color: '#333', fontSize: '14px', lineHeight: '1.8' }}>
                        {perks.map((p, i) => <li key={i}>{p}</li>)}
                    </ul>
                    <Section style={{ textAlign: 'center', padding: '16px 0' }}>
                        <Button style={btn} href={dashboardUrl}>대시보드에서 확인 →</Button>
                    </Section>
                    <Hr style={hr} />
                    <Text style={footer}>amakers · help@amakers.co.kr</Text>
                </Container>
            </Body>
        </Html>
    );
}
