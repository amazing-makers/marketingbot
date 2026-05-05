'use client';

import { ActionIcon, Tooltip, Loader } from '@mantine/core';
import { IconMicrophone, IconPlayerStop } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import { notifications } from '@mantine/notifications';

/**
 * Phase 22 — Web Speech API 기반 음성 → 텍스트 입력.
 *
 * 사용:
 *   <VoiceInputButton onTranscript={(text) => setContent(prev => prev + ' ' + text)} />
 *
 * 브라우저 호환성: Chrome/Edge/Safari (WebKit). Firefox 미지원.
 * 한국어 인식 우선 (lang='ko-KR').
 */

interface Props {
    onTranscript: (text: string) => void;
    lang?: string;
    size?: number;
    /** 누적 모드 — 중간 결과도 onTranscript 로 전달 */
    interim?: boolean;
}

export default function VoiceInputButton({ onTranscript, lang = 'ko-KR', size = 16, interim = false }: Props) {
    const [supported, setSupported] = useState(false);
    const [recording, setRecording] = useState(false);
    const recognitionRef = useRef<any>(null);
    const lastFinalRef = useRef<string>('');

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        setSupported(!!SR);
    }, []);

    const start = () => {
        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SR) {
            notifications.show({ color: 'orange', title: '음성 인식 미지원', message: 'Chrome / Edge / Safari 브라우저에서만 작동합니다' });
            return;
        }

        const r = new SR();
        r.lang = lang;
        r.continuous = true;
        r.interimResults = interim;

        r.onresult = (e: any) => {
            let final = '';
            let interimText = '';
            for (let i = e.resultIndex; i < e.results.length; i++) {
                const transcript = e.results[i][0].transcript;
                if (e.results[i].isFinal) final += transcript;
                else interimText += transcript;
            }
            if (final && final !== lastFinalRef.current) {
                lastFinalRef.current = final;
                onTranscript(final.trim());
            } else if (interim && interimText) {
                onTranscript(interimText.trim());
            }
        };

        r.onerror = (e: any) => {
            console.warn('[voice] error', e.error);
            if (e.error === 'not-allowed') {
                notifications.show({ color: 'red', title: '마이크 권한 필요', message: '브라우저 주소창의 자물쇠 → 마이크 허용' });
            } else if (e.error !== 'no-speech') {
                notifications.show({ color: 'orange', title: '음성 인식 오류', message: e.error });
            }
            setRecording(false);
        };

        r.onend = () => setRecording(false);

        try {
            r.start();
            recognitionRef.current = r;
            setRecording(true);
            notifications.show({
                color: 'violet',
                title: '🎤 듣고 있어요',
                message: '말씀하시면 자동으로 입력됩니다 (다시 누르면 중지)',
                autoClose: 3000,
            });
        } catch (e: any) {
            notifications.show({ color: 'red', title: '시작 실패', message: e?.message || '실패' });
            setRecording(false);
        }
    };

    const stop = () => {
        try {
            recognitionRef.current?.stop();
        } catch { /* ignore */ }
        setRecording(false);
    };

    if (!supported) return null;

    return (
        <Tooltip label={recording ? '음성 입력 중지' : '🎤 음성으로 입력 (한국어)'} withArrow>
            <ActionIcon
                size={size + 12}
                variant={recording ? 'filled' : 'light'}
                color={recording ? 'red' : 'violet'}
                onClick={recording ? stop : start}
                aria-label="음성 입력"
            >
                {recording ? <Loader size={size} color="white" /> : <IconMicrophone size={size} />}
            </ActionIcon>
        </Tooltip>
    );
}
