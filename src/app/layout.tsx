import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ColorSchemeScript, MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { SessionProvider } from "next-auth/react";
import dayjs from "dayjs";
import "dayjs/locale/ko";
import "./globals.css";
import { PostHogProvider } from "@/components/providers/PostHogProvider";
import { PostHogIdentify } from "@/components/providers/PostHogIdentify";

// dayjs 한국어 설정
dayjs.locale("ko");

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "마케팅봇 - 한 번 작성, 5개 채널 동시 발행",
  description: "Instagram·Naver·Facebook·Threads 마케팅 자동화 끝판왕. 매일 30분 절약. 14일 무료 체험으로 시작하세요.",
  openGraph: {
    title: "마케팅봇 - 마케팅 자동화의 새로운 표준",
    description: "5개 SNS 채널 동시 발행. 예약·자동·안전한 에이전트 기반 시스템.",
    url: 'https://marketingbot.co.kr',
    siteName: 'MarketingBot',
    locale: 'ko_KR',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        <ColorSchemeScript />
      </head>
      <body>
        <SessionProvider>
          <PostHogProvider>
            <PostHogIdentify />
            <MantineProvider defaultColorScheme="auto">
              <Notifications />
              {children}
            </MantineProvider>
          </PostHogProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
