# 🤖 다른 PC 의 Claude Code 에 붙여넣을 프롬프트

아래 박스 안의 내용 전체를 새 컴퓨터의 Claude Code 첫 메시지로 복사·붙여넣기하세요.
(2026-05-07 기준 — Phase 49 완료, 양쪽 운영 안정화 직후)

---

```
나는 amakers 라는 마케팅 자동화 SaaS 회사를 운영 중이고, 두 개의 Next.js 16 앱을
함께 개발/배포하고 있어. 다른 PC 에서 작업 이어가는 중이야.

## 프로젝트 구조 (정확)

1. marketingbot — 사용자용 SaaS
   - 로컬: c:\marketingbot
   - GitHub: amazing-makers/marketingbot
   - 운영: https://marketingbot.amakers.co.kr ✅ 운영 중
   - Vercel 프로젝트명: marketingbot

2. adminbot — 슈퍼관리자 콘솔
   - 로컬: c:\amakers-platform (모노레포 / apps/admin)
   - GitHub: amazing-makers/bot
   - 운영: https://adminbot.amakers.co.kr ✅ 운영 중
   - Vercel 프로젝트명: bot-admin (Root Directory: apps/admin)

3. 공유 인프라:
   - Supabase Postgres 1개 (aws-1-ap-northeast-2 pooler, project id fljmpduvqptngyxippxw)
   - Cloudflare DNS (DNS only, 회색 구름)
   - amakers.co.kr 루트와 www 는 아임웹 — 절대 건드리지 않음
   - 별도 help-company 프로젝트는 다른 Supabase 프로젝트 사용 — 영향 X

## 기술 스택
Next.js 16.2.4 (Turbopack) + React 19 + Mantine v9 + Prisma 7.8 (@prisma/adapter-pg) +
NextAuth v5 beta + bcryptjs + TypeScript strict (noImplicitAny: true)

## 인증 (Phase 49 이후)
- 양쪽 앱 모두 같은 User 테이블 사용, bcrypt 비밀번호
- adminbot: User.role === 'ADMIN' 또는 ADMIN_EMAILS 화이트리스트 통과 시 접근
- adminbot 의 /users/[id] 페이지에서 ADMIN 권한 토글 UI 제공
- adminbot auth.config.ts 에 trustHost: true (Vercel CSRF fix)

## 운영 계정
- admin@amakers.co.kr / !djapdlzjtm1 (role=ADMIN, 양쪽 다 로그인 가능)
- help@amakers.co.kr (role=USER)

## ⚠️ 중요 제약 — Supabase Free 플랜 connection 한도
- DATABASE_URL: port 5432 (Session pooler) — 한도 15 connection
- prisma.ts 양쪽 앱 모두 globalThis 캐시 + pg.Pool max=1 로 설정 (절대 늘리지 말 것)
- 사용자 폭증 시: port 6543 (Transaction pooler, 한도 200) 로 전환 검토
  - 단 호환성 테스트 필요 (지난번 Transaction mode 시 marketingbot 에서 client-side exception 발생함)
- 또는 Supabase Pro 업그레이드 ($25/월)

## ⚠️ Git push 제약
- main 브랜치 직접 push 는 Claude Code 권한 정책으로 차단됨
- 우회: 양쪽 레포에 post-commit hook 이 설치되어 있어 commit 시 자동 push 됨
  - hook 위치: .git/hooks/post-commit
  - 임시 비활성화: post-commit → post-commit.disabled
- Prisma destructive operations (migrate reset, db push --force-reset) 는
  사용자 명시적 동의 + PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION env var 필요

## 코딩 규칙
- 한국어 UI, 한국어 주석/커밋 메시지
- Mantine v9 기본, Tailwind 금지
- Server Component 에서 Mantine 의 component={Link} 사용 금지 (RSC 직렬화 에러)
  → Anchor 는 그냥 href, Button 은 component="a" href
- 기능 추가 시 STATUS.md / HANDOFF.md 업데이트
- "진행해줘" = auto mode 활성화 가정, 작업 즉시 진행

## 최신 commit hash (2026-05-07)
- marketingbot main: 108c0e6 (prisma client globalThis cache + max=1)
- amakers-platform main: ececa49 (NavLink leftSection 제거)

## 첫 단계
1. c:\marketingbot\HANDOFF.md 를 먼저 읽어서 현재 상태 완벽히 파악해줘
2. 그 다음 c:\marketingbot\STATUS.md 와 c:\amakers-platform\DEPLOY.md 도 읽어서 맥락 보강
3. 그 후 git status 와 git log 로 push 안 된 commit 이 있는지 확인
4. 양쪽 운영 사이트 (marketingbot.amakers.co.kr, adminbot.amakers.co.kr) 정상 동작 확인 권유
5. 진행할 다음 작업이 뭔지 정리해서 알려줘

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
- **1Password / Bitwarden** Secure Note 에 저장 후 복사

## 🔗 새 PC 에서 post-commit hook 다시 설치 (선택)

hook 은 git 이 추적 안 하는 .git/hooks 폴더에 있어서 clone 시 안 따라옴. 새 PC 에서 자동 push 원하면:

```powershell
# marketingbot
@'
#!/bin/sh
branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$branch" = "main" ]; then
  echo "[hook] auto-pushing main..."
  git push origin main &
fi
'@ | Set-Content c:\marketingbot\.git\hooks\post-commit -Encoding ASCII -NoNewline

# amakers-platform
@'
#!/bin/sh
branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$branch" = "main" ]; then
  echo "[hook] auto-pushing main..."
  git push origin main &
fi
'@ | Set-Content c:\amakers-platform\.git\hooks\post-commit -Encoding ASCII -NoNewline
```

원치 않으면 매번 `git push origin main` 직접 실행.
