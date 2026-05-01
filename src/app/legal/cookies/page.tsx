import LegalDocument from '@/components/legal/LegalDocument';

export const metadata = {
  title: '쿠키정책 | 마케팅봇',
  description: '마케팅봇 서비스 쿠키정책 안내 페이지입니다.',
};

const CONTENT = `
## 제1조 (쿠키의 정의 및 이용 목적)
쿠키는 귀하가 사이트를 방문할 때 귀하의 장치에 저장되는 작은 텍스트 파일입니다. 주식회사 어메이커스(이하 "회사")는 다음과 같은 목적으로 쿠키를 이용합니다.
1. 세션 관리 및 회원 인증
2. 사용자 기본 설정 저장
3. 서비스 기능 분석 및 개선

## 제2조 (쿠키 설정 거부 방법)
귀하는 웹 브라우저의 옵션을 선택함으로써 모든 쿠키를 허용하거나, 쿠키가 저장될 때마다 확인을 거치거나, 모든 쿠키의 저장을 거부할 수 있습니다.
- 설정 방법 (크롬): 웹 브라우저 우측 상단의 설정 > 개인정보 및 보안 > 쿠키 및 기타 사이트 데이터

---
**부칙**
이 정책은 2026년 5월 1일부터 시행됩니다. (v1.1 갱신)
`;

export default function CookiesPage() {
  return (
    <LegalDocument
      title="쿠키정책"
      content={CONTENT}
      version="v1.1"
      updatedAt="2026년 5월 1일"
    />
  );
}
