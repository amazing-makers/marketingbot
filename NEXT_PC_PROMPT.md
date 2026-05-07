# 🤖 다음 PC 에서 Claude Code 에 붙여넣을 프롬프트

아래 박스 안의 내용 전체를 새 컴퓨터의 Claude Code 첫 메시지로 복사·붙여넣기하세요.
Claude 가 즉시 컨텍스트를 이해하고 진행할 수 있게 작성됨.

---

```
나는 amakers 라는 마케팅 자동화 SaaS 회사를 운영 중이고, 두 개의 Next.js 16 앱을
함께 개발/배포하고 있어. 다른 PC 에서 작업 이어가는 중이야.

## 프로젝트 구조 (정확)

1. **marketingbot** — 사용자용 SaaS
   - 로컬: c:\marketingbot
   - GitHub: amazing-makers/marketingbot
   - 운영: https://marketingbot.amakers.co.kr
   - Vercel 프로젝트명: marketingbot

2. **adminbot** — 슈퍼관리자 콘솔
   - 로컬: c:\amakers-platform (모노레포 / apps/admin)
   - GitHub: amazing-makers/bot (rename 예정 → amakers-bots)
   - 운영: https://adminbot.amakers.co.kr
   - Vercel 프로젝트명: bot-admin (Root Directory: apps/admin)

3. 공유 인프라:
   - Supabase Postgres (aws-1-ap-northeast-2 pooler, port 5432)
   - Cloudflare DNS (DNS only, 회색 구름)
   - amakers.co.kr 루트와 www 는 아임웹 — 절대 건드리지 않음

## 기술 스택
Next.js 16.2.4 (Turbopack) + React 19 + Mantine v9 + Prisma 7.8 (@prisma/adapter-pg) +
NextAuth v5 beta + bcryptjs + TypeScript strict (noImplicitAny: true)

## 인증 (Phase 49 이후)
- 양쪽 앱 모두 같은 User 테이블 사용, bcrypt 비밀번호
- adminbot: User.role === 'ADMIN' 또는 ADMIN_EMAILS 화이트리스트 통과 시 접근
- adminbot 의 /users/[id] 페이지에서 ADMIN 권한 토글 UI 제공

## 운영 계정
- admin@amakers.co.kr / !djapdlzjtm1 (role=ADMIN, 양쪽 다 로그인 가능)
- help@amakers.co.kr (role=USER)

## 현재 상태 (마지막 작업 시점: 2026-05-07)
✅ marketingbot: 운영 중
✅ Supabase: 리셋 + schema 동기화 완료
✅ admin DB user 생성 완료 (bcrypt 해시 검증됨)
✅ adminbot Vercel 배포 + 로그인 CSRF fix 까지 완료
⏳ 마지막 commit `af8fdb7` (NextAuth trustHost: true) push 후 동작 검증 대기

## 중요 제약
- main 브랜치 직접 push 는 Claude Code 권한 정책으로 차단됨
  → 사용자(나)가 IDE 터미널에서 직접 `git push origin main` 실행해야 함
- Prisma destructive operations (`migrate reset`, `db push --force-reset`) 는
  사용자 명시적 동의 + PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION env var 필요

## 코딩 규칙
- 한국어 UI, 한국어 주석/커밋 메시지
- Mantine v9 기본 사용, Tailwind 금지
- 기능 추가 시 STATUS.md / HANDOFF.md 업데이트
- 개발 중 마음 편히 진행: 사용자가 "진행해줘" 라고 하면 자동 모드 활성화 가정
- "main 으로 직접 push 진행해줘" 같이 명시적으로 요청해야만 push 시도

## 첫 단계
1. c:\marketingbot\HANDOFF.md 를 먼저 읽어서 현재 상태 완벽히 파악해줘
2. 그 다음 c:\marketingbot\STATUS.md 와 c:\amakers-platform\DEPLOY.md 도 읽어서 맥락 보강
3. 그 후 git status 와 git log 로 push 안 된 commit 이 있는지 확인
4. 진행할 다음 작업이 뭔지 정리해서 알려줘

이 컨텍스트로 시작하자.
```

---

## 사용 방법

1. 다른 PC 에서 Claude Code 열기
2. 위 박스 안 텍스트 전체 복사
3. Claude Code 첫 메시지로 붙여넣기
4. Claude 가 HANDOFF.md 읽고 현황 정리 후 다음 행동 제안
5. 그 후 평소대로 "진행해줘" 등 자연스럽게 대화

## ⚠️ 다른 PC 셋업 사전 준비

새 PC 에 다음이 설치돼 있어야 함:
- Node.js 22+ (현재 24.13.0 사용 중)
- npm 10+
- Git
- VSCode + Claude Code 확장
- GitHub 인증 (Windows Credential Manager 또는 GH CLI)

그리고 `.env.local` 두 개를 새 PC 에 복사해야 함:
- `c:\marketingbot\.env.local`
- `c:\amakers-platform\apps\admin\.env.local`

복사 방법 추천:
- **Vercel CLI**: `vercel env pull .env.local` (가장 깔끔)
- **1Password / Bitwarden** 의 Secure Note 에 저장 후 복사
- **이메일·메신저로 자기 자신에게 전송** (보안상 비추천)
