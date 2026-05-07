# 🤝 마케팅봇·어드민봇 인수인계 문서

**최근 갱신**: 2026-05-07
**작성 목적**: 다른 컴퓨터에서 작업 이어가기 위한 종합 상태 문서

---

## 0. 한 줄 요약

**마케팅봇 (marketingbot.amakers.co.kr) 은 운영 중**, **어드민봇 (adminbot.amakers.co.kr) 은 로그인 CSRF fix 마지막 push 대기 중** (commit `af8fdb7`).

---

## 1. 시스템 구성

### 1-1. 프로젝트 두 개

| 항목 | marketingbot | adminbot |
|---|---|---|
| 역할 | 사용자용 마케팅 자동화 SaaS | 운영진 슈퍼관리자 콘솔 |
| 로컬 폴더 | `c:\marketingbot` | `c:\amakers-platform` (모노레포 / `apps/admin`) |
| GitHub | `amazing-makers/marketingbot` | `amazing-makers/bot` (모노레포 — 향후 `amakers-bots` 로 rename 가능) |
| Vercel 프로젝트명 | `marketingbot` | `bot-admin` |
| 운영 도메인 | https://marketingbot.amakers.co.kr | https://adminbot.amakers.co.kr |
| 사용자 | 가입한 모든 사용자 | `admin@amakers.co.kr`, `help@amakers.co.kr` |

### 1-2. 공유 인프라

```
Cloudflare DNS (DNS only / 회색 구름):
  marketingbot.amakers.co.kr  → cname.vercel-dns.com
  adminbot.amakers.co.kr      → cname.vercel-dns.com
  amakers.co.kr / www         → ⛔ 아임웹 (절대 건드리지 말 것)
  MX / SPF / DKIM / DMARC     → ⛔ 이메일 인증

Supabase PostgreSQL (운영 1개):
  region: aws-1-ap-northeast-2 (Seoul)
  pooler: Session mode (port 5432)
  schema: public — marketingbot 의 schema.prisma 가 source-of-truth
  데이터: Phase 49 시점 admin·help 2명만 존재

Vercel:
  marketingbot 프로젝트  → Production: marketingbot.amakers.co.kr
  bot-admin 프로젝트     → Production: adminbot.amakers.co.kr (Root Directory: apps/admin)
```

### 1-3. 기술 스택 (양쪽 공통)

- Next.js 16.2.4 (Turbopack) + React 19
- Mantine v9 (UI · 차트 · spotlight · notifications)
- Prisma 7.8 + `@prisma/adapter-pg` + `pg` (Edge 호환 어댑터)
- NextAuth v5 beta (Credentials provider, JWT 세션)
- bcryptjs (비밀번호 해시)
- TypeScript strict (`noImplicitAny: true`)

---

## 2. 운영 환경변수

### 2-1. marketingbot (Vercel)

| Key | Value 출처 |
|---|---|
| `DATABASE_URL` | Supabase Session pooler URL |
| `NEXTAUTH_SECRET` | 32+ bytes 랜덤 |
| `NEXTAUTH_URL` | `https://marketingbot.amakers.co.kr` |
| `ENCRYPTION_KEY` | ⚠️ 한 번 정한 후 절대 변경 X (채널 비번 AES-256-GCM 키) |
| `CRON_SECRET` | 랜덤 32+ bytes — `/api/cron/*` 보호 |
| `DEEPL_API_KEY` | (선택) 번역 |
| `RESEND_API_KEY` | (선택) 이메일 발송 |
| `R2_*` 5개 | (선택) 이미지 호스팅 |
| `STRIPE_*` | (선택) 결제 |

### 2-2. adminbot (Vercel)

| Key | Value 출처 |
|---|---|
| `DATABASE_URL` | marketingbot 과 **같은 값** |
| `NEXTAUTH_SECRET` | marketingbot 과 다른 값 OK |
| `NEXTAUTH_URL` | `https://adminbot.amakers.co.kr` |
| `ADMIN_EMAILS` | `admin@amakers.co.kr,help@amakers.co.kr` (백업 게이트, P49 이후 옵션) |
| `ADMIN_PASSWORD` | (P49 이후 더 이상 사용 X — 삭제해도 됨, bcrypt DB 사용) |

### 2-3. 로컬 `.env.local` (양쪽)

- 양쪽 폴더에 각각 `.env.local` 존재 (`.gitignore` 처리)
- 새 PC 에서는 위 값들을 직접 채워 넣어야 함 (1Password / Bitwarden 권장)

---

## 3. 인증 흐름 (P49 이후)

### 3-1. marketingbot
- `User.password` (bcrypt) 검증 + `User` 테이블에 사용자 존재
- `/dashboard` 진입 시 `onboardingCompletedAt` 없으면 `/onboarding` 으로 자동 redirect
- `?skip=1` 파라미터로 온보딩 우회 가능

### 3-2. adminbot
- `User.password` (bcrypt) 검증 — marketingbot 과 동일 해시 호환
- 권한 게이트: `User.role === 'ADMIN'` **또는** `ADMIN_EMAILS` 화이트리스트 통과
- `trustHost: true` 설정 — Vercel 프록시 환경에서 CSRF 정상 동작 (P49 마지막 fix)
- `/users/[id]` 페이지에서 ADMIN 권한 토글 UI 제공
- 자기 자신 강등 / 마지막 ADMIN 강등 차단

### 3-3. 현재 운영 계정

| 이메일 | 비밀번호 | role |
|---|---|---|
| `admin@amakers.co.kr` | `!djapdlzjtm1` | ADMIN (양쪽 다 로그인 가능) |
| `help@amakers.co.kr` | (사용자 본인이 가입 시 입력한 값) | USER |

---

## 4. Phase 38–49 변경 요약 (배포된 기능)

| Phase | 핵심 변경 | 위치 |
|---|---|---|
| P38–P42 | 온보딩 개선 (Stepper, 5분 빠른 발행, 샘플 데이터 모드, Interactive Tour) | marketingbot |
| P43 | 첫 발행 축하 모달 + 5분 Quick Publish | marketingbot |
| P44 | 샘플 데이터 모드 + grace period 안내 + PWA 강화 (manifest, install prompt) | marketingbot |
| P45 | AI 비용 예산 알림 + 랜딩 신뢰 시그널 + 다크모드 캘린더 | marketingbot |
| P46 | 워크스페이스 활동 로그 + 캠페인 sticky 미리보기 + 일괄 트라이얼 연장 | 양쪽 |
| P47 | 채널 미리보기 디바이스 토글 + 본인 활동 메트릭 위젯 + 이메일 템플릿 카탈로그 | 양쪽 |
| P48 | 친구 추천 링크 (`/dashboard/refer`) + `/pricing` 폴리싱 + Engagement Score | 양쪽 |
| P49 | bcrypt + DB role 기반 admin 인증 + ADMIN 토글 UI + trustHost (CSRF fix) | adminbot |

---

## 5. 현재 진행 중·대기 중 작업

### 5-1. ⏳ 즉시 처리 (마지막 한 단계)
- [ ] **commit `af8fdb7` push 대기** — adminbot 의 `trustHost: true` 추가
  ```powershell
  cd c:\amakers-platform
  git push origin main
  ```
- [ ] push 후 Vercel 자동 빌드 (1–2분)
- [ ] adminbot 로그인 동작 검증 (`admin@amakers.co.kr` / `!djapdlzjtm1`)
- [ ] adminbot Vercel Settings → Domains 에 `adminbot.amakers.co.kr` 추가 (이미 했으면 스킵)

### 5-2. 정리 작업 (선택)
- [ ] Vercel `bot-admin` 의 `ADMIN_PASSWORD` env var 삭제 (P49 이후 무용)
- [ ] GitHub `amazing-makers/bot` 을 `amazing-makers/amakers-bots` 로 rename + 로컬 `git remote set-url` 갱신
- [ ] `c:\amakers-platform` 폴더명을 그대로 두거나 `c:\amakers-bots` 로 통일

### 5-3. 차기 Phase 후보 (Phase 50+)
- **묶음 요금제**: `Subscription.enabledApps` 컬럼 추가 → MARKETING/DESIGN/MOCKUP 묶음 플랜
- **SSO 통합 쿠키**: `.amakers.co.kr` 도메인 쿠키로 marketingbot ↔ adminbot 단일 로그인
- **메인 허브 페이지**: `hub.amakers.co.kr` 또는 별도 `amakers-platform` 레포로 봇 진입 허브
- **designbot / mockupbot**: `apps/design`, `apps/mockup` 추가 (모노레포 확장)
- **Web Push 토큰 자동 갱신**: 서비스워커 갱신 주기
- **i18n**: 다국어 (한·영·일)
- **YouTube 동영상 자동 업로드**: Tauri 에이전트 PC 직접 업로드

---

## 6. 자주 만나는 함정 & 해결법

| 증상 | 원인 | 해결 |
|---|---|---|
| Vercel 빌드 시 `prisma: command not found` | npm install 실패 | 모노레포 root 에서 `npm install` 다시 |
| Vercel 빌드 시 `Parameter 'f' implicitly has an 'any' type` | prisma generate 누락 | admin `package.json` 의 `build` 가 `prisma generate && next build` 인지 확인 (P49 fix) |
| adminbot 로그인 시 화면 변화 없음 | NextAuth `MissingCSRF` | `auth.config.ts` 에 `trustHost: true` 추가 (P49 fix) |
| adminbot 로그인 시 `MissingCSRF` Network 응답 | `trustHost` 미설정 | 위와 동일 |
| Cloudflare 후 "too many redirects" | 프록시 (주황 구름) ON | DNS only (회색 구름) 로 변경 |
| "이 사이트에 연결할 수 없음" | DNS 미전파 / SSL 발급 안 됨 | `nslookup <도메인> 8.8.8.8` 으로 cname.vercel-dns.com 확인 |
| Prisma migrate 순서 깨짐 | folder 알파벳순과 의존성 불일치 | `npx prisma db push --force-reset` 으로 schema 직접 sync (개발 초기만) |
| main push 거부 | Claude Code 권한 정책 (하드 블록) | 사용자가 IDE 터미널에서 직접 `git push origin main` |

---

## 7. 핵심 파일·디렉토리

### 7-1. marketingbot
```
c:\marketingbot\
├── prisma/schema.prisma         ← source-of-truth (admin 도 여기 따름)
├── src/auth.ts                  ← NextAuth + bcrypt
├── src/lib/prisma.ts            ← @prisma/adapter-pg + pg
├── src/app/(public)/            ← 랜딩, /pricing, /login, /register
├── src/app/(app)/dashboard/     ← 사용자 대시보드 (campaigns/channels/refer 등)
├── src/app/api/cron/*           ← Vercel Cron 16개
├── src/components/              ← 공유 UI 컴포넌트
├── src/lib/ai/                  ← AI 엔진 (caption/translator/image-gen)
├── src/lib/publishers/          ← 채널별 publisher (telegram/wordpress/discord/linkedin/x/youtube)
├── src/lib/storage/r2.ts        ← R2 통합
├── src/lib/media/               ← Sharp 이미지·텍스트 오버레이
├── vercel.json                  ← cron 16개 정의
└── .env.local                   ← 비밀 (git ignore)
```

### 7-2. amakers-platform
```
c:\amakers-platform\
├── apps/admin/                  ← adminbot (Vercel Root Directory)
│   ├── prisma/schema.prisma     ← read-only mirror (P49 에 password 추가)
│   ├── src/auth.ts              ← bcrypt + role 기반
│   ├── src/auth.config.ts       ← trustHost: true (P49 fix)
│   ├── src/middleware.ts        ← 인증 보호
│   ├── src/app/login/page.tsx   ← signIn() 헬퍼 (P49 fix)
│   ├── src/app/users/[id]/      ← AdminActionsPanel (ADMIN 토글), EngagementScore
│   ├── src/lib/actions.ts       ← server actions (감사 로그 포함)
│   └── src/lib/prisma.ts        ← @prisma/adapter-pg + pg
├── packages/auth/src/admin-guard.ts  ← isAdminEmail(email, role) (P49 업데이트)
├── packages/{billing,db,ui,types}    ← 공유 패키지
└── DEPLOY.md, MIGRATION.md, README.md
```

---

## 8. 작업 재개 체크리스트 (새 PC 에서)

```bash
# 1. clone
git clone https://github.com/amazing-makers/marketingbot.git c:\marketingbot
git clone https://github.com/amazing-makers/bot.git           c:\amakers-platform

# 2. install
cd c:\marketingbot && npm install
cd c:\amakers-platform && npm install

# 3. .env.local 채우기 (위 2-1, 2-2 표 참조)
#    - 1Password / Bitwarden / Vercel CLI (`vercel env pull`) 활용

# 4. prisma generate
cd c:\marketingbot && npx prisma generate
cd c:\amakers-platform\apps\admin && npx prisma generate

# 5. 로컬 dev (선택)
cd c:\marketingbot && npm run dev          # http://localhost:3000
cd c:\amakers-platform && npm run dev:admin # http://localhost:3100

# 6. push 대기 commit 확인
cd c:\amakers-platform && git log origin/main..HEAD
cd c:\marketingbot && git log origin/main..HEAD
```

---

## 9. 권장 작업 흐름

1. 변경 → `npm run dev` 로 로컬 검증
2. `git add` → `git commit` (Claude Code 가 가능)
3. `git push origin main` (사용자 본인이 IDE 터미널에서 직접 — Claude 권한 차단)
4. Vercel 자동 빌드·배포 (main 브랜치)
5. 운영 도메인에서 동작 확인

### Preview 배포 (안전 실험)
```bash
git checkout -b feature/<name>
git push origin feature/<name>
# → Vercel preview URL 자동 생성
```

---

## 10. 관련 문서

- [`c:\marketingbot\STATUS.md`](file:///c:/marketingbot/STATUS.md) — Phase 1–6 상세
- [`c:\marketingbot\CLAUDE.md`](file:///c:/marketingbot/CLAUDE.md) — 코딩 가이드라인
- [`c:\amakers-platform\DEPLOY.md`](file:///c:/amakers-platform/DEPLOY.md) — 배포·DNS 절차
- [`c:\amakers-platform\MIGRATION.md`](file:///c:/amakers-platform/MIGRATION.md) — 모노레포 분할 이력
- [`c:\amakers-platform\README.md`](file:///c:/amakers-platform/README.md) — 모노레포 소개
