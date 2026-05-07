# MarketingBot Project Status

**최근 갱신**: 2026-05-07 (Phase 49 — adminbot 운영 배포 + bcrypt 인증)

> 📘 **신규 PC 인수인계**: [`HANDOFF.md`](./HANDOFF.md) + [`NEXT_PC_PROMPT.md`](./NEXT_PC_PROMPT.md) 참조

## 🌐 운영 상태 (Phase 49 시점)

| 사이트 | 상태 |
|---|---|
| https://marketingbot.amakers.co.kr | ✅ Production 운영 중 |
| https://adminbot.amakers.co.kr | 🟡 commit `af8fdb7` (NextAuth trustHost) push 후 검증 대기 |

---

## 🚀 진행 현황

### 인프라·운영 (~95%)
- **Phase 1~5**: 프로젝트 초기화 / DB+Auth / 대시보드 MVP / AES-256 암호화 / 에이전트 5개 어댑터 (IG·NaverBlog·NaverCafe·FB·Threads) [DONE]
- **P0-2~4**: 온보딩, 랜딩+법률+가격제, Vercel 배포 준비 [DONE]
- **P1-5**: Resend 이메일 (welcome + 일일 실패 + 주간 리포트) [DONE]
- **P1-6**: 대시보드 4종 차트 (Mantine Charts) [DONE]
- **P1-7**: 에이전트 storage state 암호화 (DPAPI) [DONE]
- **P1-8**: 캠페인 템플릿 10개 (9개 업종) [DONE]
- **P2-A**: 에이전트 자동 업데이트 (electron-updater + GitHub Releases) [DONE]
- **P2-B**: GitHub Actions release.yml (tag → .exe 빌드 + Release) [DONE]
- **P2-C**: 채널 lock + 30초 cooldown + 좀비 task 복구 cron [DONE]
- **P2-D**: Sentry (client/server/edge) [DONE]
- **P2-E**: 사용자 매뉴얼 /help 8섹션 [DONE]
- **P2-F**: PostHog 통합 (provider + identify + 서버 capture + EVENTS) [DONE]

### Phase 3 — sns-auto-platform 기능 복원 (이번 라운드)
- **P3-a**: Prisma 스키마 — UserAiConfig + TranslationCache + AiUsageCounter + ChannelType +11 (글로벌 SNS 10 + Telegram) [DONE]
- **P3-b**: AI 라이브러리 4종 포팅
  - `lib/ai/engine-config.ts` — 사용자별 5엔진 우선순위 + 모델 + 암호화 키 + 예산
  - `lib/ai/caption.ts` — 16 플랫폼 × 5 포맷 (sns_caption / sns_micro / sns_business / blog / video), vision 지원
  - `lib/ai/translator.ts` — DeepL Free/Pro + LibreTranslate + AI(Groq/Ollama/Claude), 14언어, 30일 캐시
  - `lib/ai/image-gen.ts` — Pollinations(무료) → DALL-E → Imagen, 예산 자동 차단
- **P3-c**: AI 설정 UI `/dashboard/settings/ai` — 4탭 (API 키 / 엔진·모델 / 번역 / 예산·UTM) + ping 테스트 [DONE]
- **P3-d**: 캠페인 생성 페이지에 AI 통합 — "AI 캡션 생성" 모달 (채널별) + "AI 이미지 생성" 모달 (3비율) [DONE]
- **P3-e**: MarketingChannel.region + .language 필드 (12지역 × 14언어) — 채널 카드/등록 폼 갱신 [DONE]
- **P3-f**: 캠페인 생성 시 채널 language 자동 감지 → DeepL/AI 폴백 자동 번역 → 채널별 ScheduledTask 본문 생성 [DONE]
- **P3-g**: Telegram 클라우드 publisher (HTTP-only, 에이전트 불필요)
  - `lib/publishers/telegram.ts` — sendMessage / sendPhoto, 4096자 분할
  - `lib/publishers/index.ts` — dispatcher (CLOUD_PUBLISHED_CHANNELS vs 에이전트 위임)
  - `executeTaskNow` server action — 즉시 발행
  - `/api/cron/dispatch-cloud-publishers` — 5분마다 PENDING + scheduledAt 도래분 자동 처리
  - 채널 등록 폼에 BotFather 가이드 + bot token + chat_id 필드 [DONE]

### 부수 fix
- **빌드 fix**: @sentry/nextjs v9→v10 (Next 16 호환), zombie cron 주석 syntax, /help 페이지 Anchor+Link RSC 직렬화

### Phase 4 — 운영 기능·UX 폴리싱
- **P4-a**: WordPress 클라우드 publisher (REST API HTTP-only — site URL + username + Application Password) [DONE]
- **P4-b**: 캠페인 상세에 "지금 발행" 버튼 — Telegram/WordPress 즉시 트리거 [DONE]
- **P4-c**: 캠페인 작성 30초 idle 자동 저장 — CampaignDraft 모델, 진입 시 복원, 생성 성공 시 삭제 [DONE]
- **P4-d**: AI 사용량 대시보드 — `/dashboard/settings/ai` 사용량 탭, 월별 호출수·추정 비용 (DALL-E $0.04, Imagen $0.02) [DONE]
- **P4-e**: Webhook 외부 트리거 — UserWebhookToken 모델, 32자 hex 토큰, 분당 60·일 200 rate limit, /api/webhook/[token]/publish 엔드포인트 + UI 토큰 발급/관리 [DONE]

### Phase 5 — Discord + 운영 자동화 + 스마트 스케줄링
- **P5-a**: Discord webhook publisher (HTTP-only) [DONE]
- **P5-b**: 자동 청소 cron (`/api/cron/cleanup-drafts`) [DONE]
- **P5-c**: prime-time 자동 예약 추천 [DONE]

### Phase 6 — 미디어 인프라 + 추가 publisher + 다중 브랜드
- **P6-1**: Cloudflare R2 (S3-compatible) 통합 [DONE]
  - `lib/storage/r2.ts` — S3Client 캐시, uploadToR2 / deleteFromR2 / verifyR2Config
  - aiContentActions: AI 이미지 생성 시 R2 설정 시 자동 업로드 → URL 반환, 미설정 시 dataUrl 폴백
  - storageActions: 사용자 업로드 / 삭제 / 테스트 server actions
  - 환경변수: R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL
- **P6-2**: Sharp 이미지 비율 자동 변환 [DONE]
  - `lib/media/image-resize.ts` — 6 preset (square 1:1, portrait 4:5, portrait_tall 2:3, vertical_story 9:16, landscape 16:9, wide 1.91:1)
  - CHANNEL_PRESETS — 21 채널별 권장 preset 매핑
  - resizeImage / resizeForChannels (병렬 unique) / inspectImage
  - storageActions.processImageForChannels: 1 이미지 → 채널들의 unique preset 으로 병렬 변환 → R2 업로드 → byChannelId 매핑 반환
- **P6-3**: 텍스트 오버레이 (서버 sharp + SVG composite) [DONE]
  - `lib/media/text-overlay.ts` — applyTextOverlay (위치 top/center/bottom × left/center/right, 그림자, 박스 배경, 줄바꿈)
  - storageActions.addTextOverlay → R2 업로드 또는 inline 폴백
- **P6-4**: LinkedIn UGC Posts publisher (HTTP-only, OAuth 2.0) [DONE]
  - `lib/publishers/linkedin.ts` — text-only (3000자), /v2/me 자동 URN 추출, visibility PUBLIC/CONNECTIONS
  - 401 → channel.status PENDING_AUTH 자동 전환
- **P6-5**: X (Twitter) /2/tweets publisher [DONE]
  - `lib/publishers/x.ts` — text-only, OAuth 2.0 user access token (Bearer), refresh_token 자동 갱신
  - weighted 280 chars 검증 (한글 = 2 weight)
  - ⚠️ Free tier 월 1500 tweet 한도
- **P6-6**: YouTube — STUB (수동 업로드 안내만) [DONE]
  - `lib/publishers/youtube.ts` — 동영상 자동 업로드 미지원 (Vercel serverless 50MB body 한도)
  - /channels?mine=true 로 채널 정보 검증, Studio 링크 알림만 보내고 task FAILED 처리
  - Phase 7 후보: 에이전트가 사용자 PC 영상 직접 업로드 (Vercel quota 우회)
- **P6-7**: Workspace 모델 골격 (다중 브랜드) [DONE]
  - schema: Workspace (id/name/slug/owner/plan/brand) + WorkspaceMember (role 4종)
  - User.currentWorkspaceId 옵션 컬럼
  - actions/workspaceActions.ts: createWorkspace / listMyWorkspaces / switchWorkspace / inviteWorkspaceMember / removeWorkspaceMember / getCurrentWorkspace
  - 현재 채널/캠페인은 user.id 기준 (호환성). 별도 단계에서 workspaceId 마이그레이션 예정
- **P6-8**: prime-time 분할 발행 UI [DONE]
  - server action `createSplitCampaign` — 1 캠페인 + 다음 N개 황금시간대 × M채널 = N×M ScheduledTask 생성
  - 캠페인 생성 폼: "🔀 분할 발행 모드" 토글 + 횟수(2/3/5/7/10회) + 채널×횟수 카운터 표시

## 📊 sns-auto-platform 비전 대비 진행률
- 인프라·AI 코어: **~95%**
- 발행 어댑터: **~58%** (11/19 — IG · 네이버블로그 · 네이버카페 · FB · Threads + Telegram + WordPress + Discord + LinkedIn + X + YouTube[stub])
- 미디어 변환 (오버레이/비율/영상): **~70%** (Sharp 6 preset + 채널 자동 매핑 + SVG 오버레이 추가, 영상 변환은 미지원)
- 자동화 워크플로우 (폴더감시·prime-time·webhook·retry): **~75%** (prime-time 추천 + 분할 발행)
- 운영 기능 (다중브랜드·사용량UI·자동청소·드래프트): **~75%** (Workspace 골격 추가)
- **미디어 호스팅 (R2/CDN)**: **~80%** 신규

## 📦 Phase 7–49 개요 (2026-05-04 ~ 2026-05-07)

### Phase 7–24 — 기능 확장
- Phase 9: Series mode v2 (4→3개)
- Phase 12: Stripe Subscription
- Phase 13: Reseller / ReferralCode / ReferralCommission
- Phase 14: PartnerClient (파트너 대행 고객사)
- Phase 17: WorkspaceInvitation
- Phase 18: Workspace data isolation
- Phase 19: PartnerClientReport (월간 PDF)
- Phase 20: Notification (인앱 알림 센터)
- Phase 21: ClientInvoice
- Phase 22: Web Push subscription
- Phase 24: CaptionTemplate + ActivityLog + UserNotificationChannel

### Phase 25–37 — 관리/운영
- Phase 25: UserFeedback (5점 + 코멘트)
- Phase 26: Campaign·CampaignSeries 에 tags TEXT[]
- Phase 31: AdminActionsPanel + 감사 로그
- Phase 32: Trial 만료 배너 + 브로드캐스트 이메일
- Phase 34: 새 디바이스 로그인 감지
- Phase 36: 사용자 활동 히트맵 (24×7)
- Phase 37: Stripe 결제 모니터링 페이지

### Phase 38–47 — 온보딩 & UX
- Phase 38–42: Stepper 온보딩, Interactive Tour
- Phase 43: 첫 발행 축하 모달 + 5분 Quick Publish
- Phase 44: 샘플 데이터 모드 + grace period + PWA 강화
- Phase 45: AI 비용 예산 알림 + 랜딩 신뢰 시그널 + 다크 캘린더
- Phase 46: 워크스페이스 활동 로그 + sticky 미리보기 + 일괄 트라이얼 연장
- Phase 47: 채널 미리보기 디바이스 토글 + 본인 활동 메트릭 위젯 + 이메일 템플릿 카탈로그

### Phase 48 — Refer + Pricing + Engagement
- 친구 추천 링크 (`/dashboard/refer`) — 추천 통계, 7일 트라이얼 보너스
- `/pricing` 폴리싱 — 신뢰 시그널 + 비교표 + FAQ Accordion
- Admin Engagement Score — cold/warm/hot/champion 라벨 + 4팩터 가중평균

### Phase 49 — adminbot 운영 배포
- Vercel `bot-admin` 프로젝트 등록 (Root Directory: apps/admin)
- TS 빌드 fix: build 전에 `prisma generate` 선행
- bcrypt + DB role 기반 admin 인증 (env var `ADMIN_PASSWORD` 의존 제거)
- `isAdminEmail(email, role)` — `User.role === 'ADMIN'` 즉시 통과
- 17개 페이지 가드 일괄 업데이트
- `/users/[id]` 에 ADMIN 권한 토글 UI (자기·마지막 ADMIN 강등 차단)
- 로그인 페이지: raw fetch → `signIn()` 헬퍼 (CSRF 자동 처리)
- `auth.config.ts` 에 `trustHost: true` (MissingCSRF 해결)

## 📌 다음 단계 (Phase 50+ 후보)
- 묶음 요금제 (`Subscription.enabledApps`) — MARKETING/DESIGN/MOCKUP suite
- SSO 통합 쿠키 (`.amakers.co.kr` domain) — marketingbot ↔ adminbot 단일 로그인
- 메인 허브 페이지 (`hub.amakers.co.kr` 또는 별도 amakers-platform 레포)
- designbot / mockupbot 추가 (모노레포 확장)
- Web Push 토큰 자동 갱신
- 다국어 i18n (한·영·일)

## 📌 이전 다음 단계 (Phase 7 후보)
1. **YouTube 동영상 자동 업로드**: 에이전트(Tauri) 가 사용자 PC 영상 직접 업로드 — Vercel 50MB 우회
2. **이미지/영상 미디어 라이브러리 UI**: R2 업로드 객체 목록 + 재사용 + 삭제
3. **LinkedIn / X / YouTube OAuth flow**: 사용자가 토큰 직접 입력 대신 "연결" 버튼으로 OAuth flow
4. **Workspace 채널·캠페인 마이그레이션**: 채널/캠페인 모델에 workspaceId 추가 + 데이터 분리 (기존 user.id 데이터 보존)
5. **클라이언트 사이드 캔버스 편집기**: 텍스트 오버레이 편집 (Konva 또는 fabric.js)
6. **영상 비율 자동 변환**: ffmpeg-wasm 또는 외부 처리 서비스 (Vercel Pro 1024MB Edge 함수)
7. **추가 publisher**: WhatsApp Business / TikTok / Pinterest (모두 OAuth/비즈니스 인증 필요)

## ⚠️ 사용자 액션 필요 (운영 적용)

### 필수
1. **Prisma migrate**: `npx prisma migrate deploy` — DISCORD enum + Workspace + WorkspaceMember 마이그레이션 (총 2개 신규 + 누적분)
2. **Vercel CRON_SECRET**: 새 cron 보안 위해 환경변수 등록 — cleanup-drafts 도 같은 secret 사용

### 권장 (무료/저비용)
3. **무료 AI 키 등록**: `/dashboard/settings/ai` 에서 Gemini + Groq + DeepL (각 5분, 무료)
4. **R2 환경변수 등록 (이미지 자동 업로드 활성화)**:
   - Cloudflare R2 → 버킷 생성 → API 토큰 발급 (Object Read & Write)
   - Vercel: R2_ENDPOINT (https://<account>.r2.cloudflarestorage.com), R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL (Custom Domain 또는 r2.dev)
   - 무료 10GB / 월 10M egress 무제한 (S3 와 차별점)
5. **첫 클라우드 채널** (각 5분):
   - Telegram (BotFather)
   - WordPress (Application Password)
   - Discord (서버 → 채널 → 웹후크)

### 고급 (인증 필요)
6. **LinkedIn**: Developer Portal → OAuth 2.0 Token Generator (60일 유효) → 마케팅봇 채널 추가
7. **X (Twitter)**: Developer Portal → OAuth 2.0 user access token → 마케팅봇 채널 추가 (⚠️ Free 1500 tweet/월)
8. **YouTube**: 현재 stub (수동 업로드 알림만). Phase 7 에서 에이전트 자동 업로드 예정

### 선택 기능
9. **Webhook 토큰**: `/dashboard/settings/webhooks` 에서 발급 → Zapier/Make 연동
10. **prime-time**: 캠페인 생성 폼에서 "🎯 최적 시간 자동" 버튼 또는 "🔀 분할 발행 모드" 활성화
11. **Workspace 다중 브랜드**: server actions 준비됨 (`/dashboard/workspaces` UI 는 향후 추가)
