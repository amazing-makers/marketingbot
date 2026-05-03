# MarketingBot Project Status

**최근 갱신**: 2026-05-04 (Phase 5 라운드 — Discord publisher + 자동 청소 cron + prime-time 추천)

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
- **P5-a**: Discord webhook publisher (HTTP-only)
  - `lib/publishers/discord.ts` — sendMessage / embed (이미지 첨부 시 자동), 2000자 분할
  - dispatcher index.ts 에 case 'DISCORD' 추가, CLOUD_PUBLISHED_CHANNELS 에 등록
  - schema ChannelType 에 DISCORD enum 추가
  - 채널 등록 폼에 webhook URL + 발신자명 입력 + BotFather 비슷한 발급 가이드 [DONE]
- **P5-b**: 자동 청소 cron (`/api/cron/cleanup-drafts`)
  - 30일+ 미수정 CampaignDraft 삭제 (사용자가 잊은 임시 저장본 정리)
  - 만료된 TranslationCache 행 삭제
  - 7일+ UserWebhookHit (rate limit 카운터) 삭제
  - vercel.json schedule: '0 18 * * *' UTC = 매일 03:00 KST [DONE]
- **P5-c**: prime-time 자동 예약 추천
  - `lib/scheduling/prime-time.ts` — 12 region × 평균 3-4 황금시간대 매핑 (Sprout/HubSpot 보고서 기준)
  - 다음 prime-time 1개 / N개 / 라벨 추천 함수
  - server action `suggestPrimeTimeForChannels(channelIds)` — 다중 채널의 region 중 가장 빠른 황금시간대 선택
  - 캠페인 생성 폼에 "🎯 최적 시간 자동" 버튼 (DateTimePicker 위에 위치) [DONE]

## 📊 sns-auto-platform 비전 대비 진행률
- 인프라·AI 코어: **~95%** (lib + UI + 캠페인 통합 완료)
- 발행 어댑터: **~42%** (8/19 — IG · 네이버블로그 · 네이버카페 · FB · Threads + Telegram + WordPress + Discord)
- 미디어 변환 (오버레이/비율/영상): **~5%**
- 자동화 워크플로우 (폴더감시·prime-time·webhook·retry): **~50%** (prime-time 추천 + cleanup cron 추가)
- 운영 기능 (다중브랜드·사용량UI·자동청소·드래프트): **~55%** (자동 청소 cron 추가)

## 📌 다음 단계 (Phase 6 후보)
1. **R2 통합**: AI 이미지 생성 → R2 자동 업로드 → 캠페인 mediaUrls 자동 채우기 → Telegram/WordPress/Discord photoUrl 그대로 사용 가능
2. **이미지 비율 자동 변환**: ffmpeg or Sharp — 채널별 4:5 / 9:16 / 16:9 자동 크롭
3. **텍스트 오버레이 편집기**: 이미지 위 자막
4. **추가 publisher**: LinkedIn (회사 OAuth), X (paid API), YouTube (Data API v3) — 무료/저비용 우선
5. **다중 브랜드**: 한 시스템에서 여러 회사 격리 (User → Workspace 모델 도입)
6. **prime-time 분할 발행**: 같은 콘텐츠 N회 황금시간대 분할 (server action `suggestPrimeTimeSeriesForChannel` 이미 준비됨, UI 만 붙이면 됨)

## ⚠️ 사용자 액션 필요 (운영 적용)
1. **Prisma migrate**: `npx prisma migrate deploy` — DISCORD enum 추가 마이그레이션 1개 신규 + 누적분
2. **Vercel CRON_SECRET**: 새 cron 보안 위해 환경변수 등록 (없으면 dev 모드만 동작) — cleanup-drafts 도 같은 secret 사용
3. **무료 AI 키 등록**: `/dashboard/settings/ai` 에서 Gemini + Groq + DeepL (각 발급 5분, 무료)
4. **첫 클라우드 채널**: Telegram (BotFather) / WordPress (Application Password) / **Discord** (서버 → 채널 → 웹후크) — 5분 내 자동 발행 (에이전트 불필요)
5. **(선택) Webhook 토큰**: `/dashboard/settings/webhooks` 에서 발급 → Zapier · Make · 자체 자동화 연동
6. **(선택) prime-time 사용**: 캠페인 생성 시 채널 선택 후 "🎯 최적 시간 자동" 버튼 한 번에 region 별 황금시간대 적용
