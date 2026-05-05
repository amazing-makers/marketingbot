/**
 * 고객사 월간 리포트 PDF 템플릿 — @react-pdf/renderer 기반.
 * Gold+ 등급 파트너 혜택 / 수동 다운로드도 가능.
 */

import * as React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

interface ChannelStat {
    type: string;
    count: number;
}

export interface ClientMonthlyReportProps {
    period: string; // "2026-05"
    clientName: string;
    partnerName: string;
    industry?: string | null;
    totalCampaigns: number;
    totalPublished: number;
    totalFailed: number;
    channelMix: ChannelStat[];
    topPerformingCampaign?: string | null;
    generatedAt: Date;
}

// 한국어 폰트 등록 (Vercel/Edge 환경에서 작동하려면 Google Fonts CDN 사용)
// 빌드 시 폰트 다운로드 자동 — 초기 로드 시 약간 지연 가능
try {
    Font.register({
        family: 'NotoSansKR',
        fonts: [
            { src: 'https://fonts.gstatic.com/s/notosanskr/v36/PbyxFmXiEBPT4ITbgNA5Cgms3VYcOA-vvnIzzuoyeLTq8H4hfeE.woff', fontWeight: 400 },
            { src: 'https://fonts.gstatic.com/s/notosanskr/v36/PbyxFmXiEBPT4ITbgNA5Cgms3VYcOA-vvnIzzuoyeLTq8H4hfeE.woff', fontWeight: 700 },
        ],
    });
} catch {
    // 이미 등록된 경우 무시
}

const styles = StyleSheet.create({
    page: { padding: 40, fontFamily: 'NotoSansKR', fontSize: 10, color: '#1a1a1a' },
    header: { marginBottom: 24, borderBottom: '2 solid #7c3aed', paddingBottom: 12 },
    headerTitle: { fontSize: 24, fontWeight: 700, color: '#7c3aed' },
    headerSubtitle: { fontSize: 12, color: '#666', marginTop: 4 },
    section: { marginBottom: 20 },
    sectionTitle: { fontSize: 14, fontWeight: 700, marginBottom: 8, color: '#1a1a1a' },
    statsRow: { flexDirection: 'row', gap: 12 },
    statBox: { flex: 1, padding: 12, backgroundColor: '#faf5ff', borderRadius: 6, border: '1 solid #e4d4ff' },
    statLabel: { fontSize: 9, color: '#7c3aed', marginBottom: 4, textTransform: 'uppercase' },
    statValue: { fontSize: 22, fontWeight: 700, color: '#1a1a1a' },
    statHint: { fontSize: 9, color: '#666', marginTop: 4 },
    table: { marginTop: 8 },
    tableRow: { flexDirection: 'row', borderBottom: '1 solid #eee', padding: 6 },
    tableHeader: { backgroundColor: '#f5f5f5', fontWeight: 700 },
    tableCell: { flex: 1, fontSize: 10 },
    tableCellRight: { flex: 1, fontSize: 10, textAlign: 'right' },
    footer: { position: 'absolute', bottom: 30, left: 40, right: 40, borderTop: '1 solid #eee', paddingTop: 8, fontSize: 8, color: '#999', textAlign: 'center' },
    badge: { backgroundColor: '#faf5ff', color: '#7c3aed', padding: '2 6', borderRadius: 3, fontSize: 9, fontWeight: 700 },
    callout: { padding: 10, backgroundColor: '#f0f9ff', borderLeft: '3 solid #3b82f6', borderRadius: 4, marginTop: 8 },
});

export function ClientMonthlyReport(props: ClientMonthlyReportProps) {
    const successRate = props.totalCampaigns > 0
        ? Math.round((props.totalPublished / (props.totalPublished + props.totalFailed)) * 100) || 0
        : 0;
    const generatedAtKr = props.generatedAt.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* 헤더 */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>{props.period} 마케팅 리포트</Text>
                    <Text style={styles.headerSubtitle}>
                        {props.clientName} · 파트너: {props.partnerName}
                        {props.industry ? ` · ${props.industry}` : ''}
                    </Text>
                </View>

                {/* 핵심 지표 */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>핵심 지표</Text>
                    <View style={styles.statsRow}>
                        <View style={styles.statBox}>
                            <Text style={styles.statLabel}>총 캠페인</Text>
                            <Text style={styles.statValue}>{props.totalCampaigns}</Text>
                            <Text style={styles.statHint}>이번 달 작성된 캠페인</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={styles.statLabel}>발행 성공</Text>
                            <Text style={styles.statValue}>{props.totalPublished}</Text>
                            <Text style={styles.statHint}>채널에 게시 완료</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={styles.statLabel}>성공률</Text>
                            <Text style={styles.statValue}>{successRate}%</Text>
                            <Text style={styles.statHint}>실패 {props.totalFailed}건</Text>
                        </View>
                    </View>
                </View>

                {/* 채널 분포 */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>채널별 발행 분포</Text>
                    {props.channelMix.length === 0 ? (
                        <Text style={{ color: '#999', fontSize: 10 }}>이번 달 발행된 채널이 없습니다.</Text>
                    ) : (
                        <View style={styles.table}>
                            <View style={[styles.tableRow, styles.tableHeader]}>
                                <Text style={styles.tableCell}>채널</Text>
                                <Text style={styles.tableCellRight}>발행 수</Text>
                                <Text style={styles.tableCellRight}>점유율</Text>
                            </View>
                            {props.channelMix.map((c, i) => {
                                const total = props.channelMix.reduce((s, x) => s + x.count, 0);
                                const pct = total > 0 ? Math.round((c.count / total) * 100) : 0;
                                return (
                                    <View key={i} style={styles.tableRow}>
                                        <Text style={styles.tableCell}>{c.type}</Text>
                                        <Text style={styles.tableCellRight}>{c.count}</Text>
                                        <Text style={styles.tableCellRight}>{pct}%</Text>
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </View>

                {/* 인사이트 */}
                {props.topPerformingCampaign && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>주요 캠페인</Text>
                        <View style={styles.callout}>
                            <Text style={{ fontSize: 9, color: '#1e40af', marginBottom: 2 }}>가장 많이 발행된 캠페인</Text>
                            <Text style={{ fontSize: 11, fontWeight: 700, color: '#1e3a8a' }}>{props.topPerformingCampaign}</Text>
                        </View>
                    </View>
                )}

                {/* 다음 달 추천 */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>다음 달 추천 액션</Text>
                    <Text style={{ fontSize: 10, color: '#333', lineHeight: 1.6 }}>
                        {successRate >= 90 ? '✓ ' : '• '}이번 달 성공률 {successRate}% 달성. 같은 페이스 유지 권장.{'\n'}
                        {props.totalCampaigns < 10 ? '• 발행 빈도 증가 검토 (월 10회 이상 권장)\n' : ''}
                        {props.channelMix.length < 3 ? '• 채널 다각화 검토 (현재 ' + props.channelMix.length + '개 채널 활성)\n' : ''}
                        {'• 다음 달 콘텐츠 캘린더 미리 작성 권장'}
                    </Text>
                </View>

                {/* 푸터 */}
                <Text style={styles.footer} fixed>
                    {generatedAtKr} 생성 · amakers · marketingbot.amakers.co.kr
                </Text>
            </Page>
        </Document>
    );
}
