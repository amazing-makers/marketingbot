import * as React from 'react';
import { Html, Head, Body, Container, Heading, Text, Section, Hr, Row, Column } from '@react-email/components';

interface FailureTask {
    id: string;
    channelType: string;
    accountName: string;
    error: string;
    time: string;
}

interface TaskFailureSummaryEmailProps {
    name: string;
    tasks: FailureTask[];
    date: string;
}

export function TaskFailureSummaryEmail({ name, tasks, date }: TaskFailureSummaryEmailProps) {
    return (
        <Html>
            <Head />
            <Body style={main}>
                <Container style={container}>
                    <Heading style={h1}>작업 실패 요약 리포트 ⚠️</Heading>
                    <Text style={text}>{name}님, 안녕하세요. {date}에 발생한 실패 작업 내역을 안내해 드립니다.</Text>
                    
                    <Section style={listSection}>
                        {tasks.map((task) => (
                            <Section key={task.id} style={taskItem}>
                                <Row>
                                    <Column style={{ width: '80%' }}>
                                        <Text style={channelLabel}>[{task.channelType}] {task.accountName}</Text>
                                        <Text style={errorText}>{task.error}</Text>
                                    </Column>
                                    <Column align="right">
                                        <Text style={timeText}>{task.time}</Text>
                                    </Column>
                                </Row>
                            </Section>
                        ))}
                    </Section>

                    <Text style={tipText}>
                        * 에이전트가 실행 중인지 확인해 주세요. <br />
                        * 채널 연결 세션이 만료되었을 수 있습니다. 대시보드에서 상태를 확인해 보세요.
                    </Text>

                    <Hr style={hr} />
                    <Text style={footerText}>주식회사 어메이커스 · 마케팅봇 알림 센터</Text>
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
    color: '#fa5252',
    fontSize: '22px',
    fontWeight: '700',
    textAlign: 'center' as const,
    margin: '20px 0',
};

const text = {
    color: '#495057',
    fontSize: '15px',
    lineHeight: '24px',
};

const listSection = {
    margin: '24px 0',
};

const taskItem = {
    borderBottom: '1px solid #f1f3f5',
    padding: '12px 0',
};

const channelLabel = {
    fontSize: '14px',
    fontWeight: '700',
    color: '#212529',
    margin: '0 0 4px 0',
};

const errorText = {
    fontSize: '13px',
    color: '#fa5252',
    margin: '0',
};

const timeText = {
    fontSize: '12px',
    color: '#868e96',
    margin: '0',
};

const tipText = {
    fontSize: '13px',
    color: '#868e96',
    backgroundColor: '#f8f9fa',
    padding: '12px',
    borderRadius: '4px',
    lineHeight: '20px',
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
