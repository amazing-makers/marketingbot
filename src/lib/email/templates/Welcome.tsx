import * as React from 'react';
import { Html, Head, Body, Container, Heading, Text, Button, Hr, Section, Link } from '@react-email/components';

interface WelcomeEmailProps {
    name: string;
    licenseKey: string;
    dashboardUrl: string;
}

export function WelcomeEmail({ name, licenseKey, dashboardUrl }: WelcomeEmailProps) {
    return (
        <Html>
            <Head />
            <Body style={main}>
                <Container style={container}>
                    <Section style={header}>
                        <Heading style={h1}>마케팅봇에 오신 것을 환영합니다! 🎉</Heading>
                    </Section>
                    
                    <Section style={content}>
                        <Text style={text}>{name}님, 안녕하세요!</Text>
                        <Text style={text}>마케팅봇의 14일 무료 체험이 시작되었습니다. 이제 5개 SNS 채널 동시 포스팅의 편리함을 경험해 보세요.</Text>
                        
                        <Section style={keySection}>
                            <Text style={keyLabel}>내 에이전트 라이선스 키</Text>
                            <Text style={keyText}>{licenseKey}</Text>
                        </Section>

                        <Text style={text}>에이전트를 설치한 후 위 키를 입력하여 활성화하세요.</Text>
                        
                        <Button href={dashboardUrl} style={button}>
                            대시보드로 이동
                        </Button>
                    </Section>

                    <Hr style={hr} />
                    
                    <Section style={footer}>
                        <Text style={footerText}>
                            주식회사 어메이커스 · help@amakers.co.kr · 1600-9221
                        </Text>
                        <Text style={footerText}>
                            인천광역시 미추홀구 장고개로42번길 51, 2층
                        </Text>
                    </Section>
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
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
};

const h1 = {
    color: '#1a1b1e',
    fontSize: '24px',
    fontWeight: '700',
    textAlign: 'center' as const,
    margin: '30px 0',
};

const text = {
    color: '#495057',
    fontSize: '16px',
    lineHeight: '26px',
};

const keySection = {
    backgroundColor: '#f8f9fa',
    padding: '20px',
    borderRadius: '6px',
    textAlign: 'center' as const,
    margin: '24px 0',
};

const keyLabel = {
    fontSize: '12px',
    color: '#868e96',
    fontWeight: '700',
    textTransform: 'uppercase' as const,
    marginBottom: '8px',
};

const keyText = {
    fontSize: '20px',
    color: '#228be6',
    fontWeight: '700',
    fontFamily: 'monospace',
};

const button = {
    backgroundColor: '#228be6',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '16px',
    fontWeight: '600',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'block',
    padding: '12px',
    margin: '30px 0',
};

const hr = {
    borderColor: '#e9ecef',
    margin: '40px 0',
};

const footer = {
    textAlign: 'center' as const,
};

const footerText = {
    fontSize: '12px',
    color: '#868e96',
    lineHeight: '18px',
    margin: '0',
};

const header = {};
const content = {};
