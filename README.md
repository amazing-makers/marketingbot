# MarketingBot Dashboard

마케팅봇 SNS 자동화 플랫폼의 중앙 제어 대시보드입니다.

## 기술 스택
- **Framework**: Next.js 16 (App Router)
- **UI**: Mantine 9
- **DB**: Prisma + PostgreSQL (Supabase)
- **Auth**: NextAuth v5 (Beta)
- **Deployment**: Vercel

## Deployment (Vercel)

### 사전 준비
1. **Supabase 프로젝트**: PostgreSQL 데이터베이스 (Session mode URI 권장)
2. **Vercel 계정**: GitHub 레포지토리 연동 필요

### 환경변수 설정 (Vercel Dashboard)
Vercel 프로젝트 설정의 'Environment Variables' 섹션에 다음 항목을 입력하세요:

- `DATABASE_URL`: Supabase 연결 문자열 (포트 5432)
- `NEXTAUTH_SECRET`: `openssl rand -base64 32` 명령으로 생성한 랜덤 문자열
- `ENCRYPTION_KEY`: 자격증명 암호화용 랜덤 문자열 (최소 32자)
- `NEXTAUTH_URL`: (선택) Vercel 배포 시 `VERCEL_URL`로 자동 감지됩니다.

### 첫 배포 절차
1. Vercel에서 `amazing-makers/marketingbot` 레포지토리를 가져옵니다.
2. 위의 환경변수를 모두 설정합니다.
3. 배포(Deploy) 버튼을 누릅니다.
4. 배포가 완료된 후, 로컬 또는 Vercel 콘솔에서 데이터베이스 스키마를 동기화합니다:
   ```bash
   npx prisma migrate deploy
   ```

### 헬스체크 엔드포인트
- `https://your-domain.com/api/health`: 서비스 생존 확인
- `https://your-domain.com/api/ready`: DB 연결 상태 확인

## 로컬 개발
```bash
npm install
npm run dev
```
