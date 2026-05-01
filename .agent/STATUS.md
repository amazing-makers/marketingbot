# Project Status: Marketingbot (마케팅봇)

## 현재 상태 (2026-05-01)
- **프로젝트 이름 확정**: marketingbot (모든 마케팅 채널 자동화 — SNS·이메일·SMS·블로그 등)
- **아키텍처**: Docker 기반 → Next.js + Supabase + Tauri 하이브리드 구조로 전환
- **Phase 1 완료**: 프로젝트 골격 (Next.js 16 + Mantine 9 + Prisma 7) + 폴더 rename (sns-auto → marketingbot) + 빌드 검증 + 로컬 Git 커밋
- **다음 즉시 작업**: GitHub 레포 생성 (`amazing-makers/marketingbot`) + push
- **Phase 2 사전준비**: Supabase 프로젝트 생성 후 Session mode URI 확보

## 주요 마일스톤
- [x] Phase 1: 프로젝트 기초 스캐폴딩 (Next.js 16 + Mantine 9 + Prisma 7)
- [ ] Phase 2: Supabase 연동 및 NextAuth 인증 구현
- [ ] Phase 3: SNS 계정 연동 로직 (Encryption/Decryption)
- [ ] Phase 4: 게시물 예약 및 관리 UI 고도화
- [ ] Phase 5: 데스크톱 에이전트 개발 (Tauri + Playwright)
- [ ] Phase 6: DeepL API 번역 연동
- [ ] Phase 7: 베타 테스트 및 안정화

## 최근 변경 사항
- Prisma 7 설정 및 1차 모델 정의 (`User`, `SnsAccount`, `ScheduledPost`, `License`) — Phase 2에서 multi-channel 모델로 확장 예정 (`MarketingChannel`, `Campaign`, `ScheduledTask`, `AgentInstance`)
- Mantine 9 기반 대시보드 레이아웃(AppShell) 및 페이지 뼈대 구축
- 빌드 안정화를 위한 "use client" 지시어 적용 및 Prisma Config 최적화
- 폴더 rename: C:\sns-auto → C:\marketingbot (robocopy /MOVE), 모든 git 히스토리·미커밋 변경 보존
- package.json name: sns-auto → marketingbot
- AGENTS.md 멀티채널 컨텍스트로 갱신

## 다음 작업 (Phase 2)
- Supabase 프로젝트 생성 및 `DATABASE_URL` 연결
- NextAuth.js (Beta) 기반의 로그인/회원가입 흐름 구현
- Prisma Migrate를 통한 데이터베이스 스키마 적용
