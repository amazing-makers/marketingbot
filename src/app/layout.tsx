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
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "마케팅봇",
    statusBarStyle: "default",
  },
  openGraph: {
    title: "마케팅봇 - 마케팅 자동화의 새로운 표준",
    description: "5개 SNS 채널 동시 발행. 예약·자동·안전한 에이전트 기반 시스템.",
    url: 'https://marketingbot.co.kr',
    siteName: 'MarketingBot',
    locale: 'ko_KR',
    type: 'website',
  },
};

export const viewport = {
  themeColor: "#7c3aed",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover" as const,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        <ColorSchemeScript defaultColorScheme="auto" />
      </head>
      <body>
        <SessionProvider>
          <PostHogProvider>
            <PostHogIdentify />
            <MantineProvider defaultColorScheme="auto">
              <Notifications position="top-right" />
              {children}
              {/* Phase 41 — 모바일에서 토스트를 하단 탭바 위로 이동 */}
              <style>{`
                @media (max-width: 47.999em) {
                  .mantine-Notifications-root {
                    top: auto !important;
                    bottom: calc(72px + env(safe-area-inset-bottom, 0)) !important;
                    right: 8px !important;
                    left: 8px !important;
                    width: auto !important;
                    max-width: none !important;
                  }
                  .mantine-Notifications-notification {
                    margin-left: auto;
                    margin-right: auto;
                    max-width: 100%;
                  }
                }
              `}</style>
            </MantineProvider>
          </PostHogProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
