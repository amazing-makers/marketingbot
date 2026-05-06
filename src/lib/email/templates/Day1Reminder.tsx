import * as React from 'react';
import { Html, Head, Body, Container, Heading, Text, Button, Hr, Section } from '@react-email/components';

interface Props {
    name: string;
    hasChannels: boolean;
    hasCampaigns: boolean;
    nextStepUrl: string;
    industry: string | null;
}

/**
 * Phase 42 — 가입 24-48시간 사이 첫 캠페인 안 만든 사용자 리마인드.
 *
 * 진행 상황에 따라 다른 카피:
 *   - 채널·캠페인 모두 X → 첫 단계 안내
 *   - 채널만 O, 캠페인 X → 첫 캠페인 작성 권유
 */
export function Day1ReminderEmail({ name, hasChannels, hasCampaigns, nextStepUrl, industry }: Props) {
    let title = '';
    let body = '';
    let cta = '';

    if (!hasChannels) {
        title = '👋 첫 채널을 연결해보세요';
        body = '마케팅봇은 SNS 채널 (인스타·페이스북·블로그 등) 을 연결해야 시작할 수 있어요.\n5분이면 첫 채널 연결 끝!';
        cta = '채널 연결하기';
    } else if (!hasCampaigns) {
        title = '🚀 채널 연결 완료! 이제 첫 게시물을 만들어볼까요?';
        body = `${industry ? `${industry} 업종에 맞는 ` : ''}AI 캡션 + 이미지를 자동 생성해서 클릭 한 번으로 모든 채널에 동시 발행할 수 있어요.\n\n첫 캠페인은 5분이면 충분해요.`;
        cta = '첫 캠페인 만들기';
    }

    return (
        <Html>
            <Head />
            <Body style={main}>
                <Container style={container}>
                    <Section style={header}>
                        <Heading style={h1}>{title}</Heading>
                    </Section>

                    <Section style={content}>
                        <Text style={text}>{name}님, 어제 마케팅봇에 가입해주셨네요. 🎉</Text>
                        <Text style={text}>{body.split('\n').map((l, i) => <span key={i}>{l}<br /></span>)}</Text>

                        <Section style={tipsBox}>
                            <Text style={tipTitle}>💡 알고 계셨나요?</Text>
                            <Text style={tipItem}>✓ AI 가 캡션·해시태그·이미지를 자동 생성</Text>
                            <Text style={tipItem}>✓ 14개 언어 자동 번역 (해외 SNS 도 OK)</Text>
                            <Text style={tipItem}>✓ 한 번 설정하면 며칠·몇 주 자동 발행 (시리즈)</Text>
                            <Text style={tipItem}>✓ 14일 무료 체험 — 신용카드 등록 불필요</Text>
                        </Section>

                        <Button href={nextStepUrl} style={button}>
                            {cta} →
                        </Button>

                        <Text style={smallText}>
                            도움이 필요하시면 언제든 답장 주세요. 마케팅봇 팀이 친절하게 도와드릴게요.
                        </Text>
                    </Section>

                    <Hr style={hr} />

                    <Section style={footer}>
                        <Text style={footerText}>
                            주식회사 어메이커스 · help@amakers.co.kr · 1600-9221<br />
                            이 메일이 불필요하면 알림 설정에서 끌 수 있습니다.
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
const tipsBox = { background: '#faf5ff', border: '1px solid #ddd6fe', borderRadius: '8px', padding: '16px', margin: '20px 0' };
const tipTitle = { fontSize: '13px', color: '#6b21a8', fontWeight: '700' as const, margin: '0 0 8px' };
const tipItem = { fontSize: '13px', color: '#5b21b6', margin: '4px 0', lineHeight: '1.7' };
const button = { backgroundColor: '#7c3aed', color: '#ffffff', padding: '14px 28px', borderRadius: '8px', textDecoration: 'none', fontWeight: '700' as const, fontSize: '15px', display: 'inline-block', marginTop: '12px' };
const smallText = { fontSize: '13px', color: '#6b7280', textAlign: 'center' as const, marginTop: '20px' };
const hr = { borderColor: '#e5e7eb', margin: '30px 0' };
const footer = { padding: '0 10px' };
const footerText = { fontSize: '12px', color: '#9ca3af', textAlign: 'center' as const, lineHeight: '1.6' };
