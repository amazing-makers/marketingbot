# MarketingBot Project Status

**최근 갱신**: 2026-05-03 (P3 라운드 — sns-auto-platform 기능 복원)

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

## 📊 sns-auto-platform 비전 대비 진행률
- 인프라·AI 코어: **~95%** (lib + UI + 캠페인 통합 완료)
- 발행 어댑터: **~30%** (5/19 + Telegram 추가 = 6/19, 클라우드 직접 발행 패턴 정립)
- 미디어 변환 (오버레이/비율/영상): **~5%**
- 자동화 워크플로우 (폴더감시·prime-time·webhook·retry): **~15%**
- 운영 기능 (다중브랜드·사용량UI·자동청소·드래프트): **~15%**

## 📌 다음 단계 (Phase 4 후보)
1. **추가 클라우드 publisher**: WordPress (REST API), Tistory (Open API), X(Twitter API v2), LinkedIn (REST API), YouTube (Data API v3) — 모두 HTTP-only 패턴 활용
2. **R2 통합**: AI 이미지 생성 → R2 자동 업로드 → 캠페인 mediaUrls 자동 채우기
3. **drafts 자동 저장**: 30초 idle 임시저장 (sns-auto-platform `drafts.py` 포팅)
4. **사용량 대시보드 UI**: AiUsageCounter 시각화
5. **prime-time 자동 예약**: region별 황금 시간대 계산 (한국 9시, 미국 8PM…)
6. **webhook 외부 트리거**: 사용자별 토큰 + rate limit 60/시간

## ⚠️ 사용자 액션 필요 (운영 적용)
1. **Prisma migrate**: `npx prisma migrate deploy` — UserAiConfig + TranslationCache + AiUsageCounter + region/language + TELEGRAM enum 적용
2. **Vercel CRON_SECRET**: 새 cron 보안 위해 환경변수 등록 (없으면 dev 모드만 동작)
3. **무료 AI 키 등록**: `/dashboard/settings/ai` 에서 Gemini + Groq + DeepL (각 발급 5분, 무료)
4. **첫 Telegram 채널**: BotFather → `/newbot` → 채널 추가 → /accounts 등록 → 즉시 작동 (에이전트 없이)
