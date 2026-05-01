import { 
  IconBrandInstagram, 
  IconBrandFacebook, 
  IconBrandThreads, 
  IconArticle, 
  IconUsersGroup,
  IconShare,
  IconCalendar,
  IconLock,
  IconTarget,
  IconChartBar,
  IconShieldCheck,
  IconBrandX,
  IconBrandYoutube,
  IconBrandTiktok
} from '@tabler/icons-react';

export const HERO = {
    titleHTML: '한 번 작성, <span style="color:var(--mantine-color-blue-6);font-weight:900">5개 채널</span> 동시 발행',
    sub: 'Instagram · Naver Blog · Naver Cafe · Facebook · Threads — 매일 똑같은 글 5번씩 복붙하던 시간을 마케팅봇이 돌려드립니다.',
    ctaPrimary: '14일 무료 체험 시작',
    ctaSecondary: '데모 영상 보기',
    demoVideoUrl: '', // 비어있으면 버튼 숨김 처리
};

export const PROBLEMS = [
    "5개 채널에 같은 글 매일 복붙하느라 1시간씩 날려요",
    "예약 시간 맞추려고 새벽까지 깨어있어요",
    "여러 SNS 계정 비밀번호 헷갈려서 매번 로그인해요",
    "캠페인 결과를 채널별로 따로 봐야 해서 분석이 어려워요",
    "외주 마케터 비용 (월 100만원+)이 부담돼요",
    "휴가 가면 SNS 운영이 멈춰서 신경 쓰여요",
];

export const CHANNELS = [
    { type: 'INSTAGRAM', label: 'Instagram', icon: IconBrandInstagram, color: 'pink', status: 'AVAILABLE' },
    { type: 'NAVER_BLOG', label: '네이버 블로그', icon: IconArticle, color: 'green', status: 'AVAILABLE' },
    { type: 'NAVER_CAFE', label: '네이버 카페', icon: IconUsersGroup, color: 'green', status: 'AVAILABLE' },
    { type: 'FACEBOOK', label: 'Facebook', icon: IconBrandFacebook, color: 'blue', status: 'AVAILABLE' },
    { type: 'THREADS', label: 'Threads', icon: IconBrandThreads, color: 'dark', status: 'AVAILABLE' },
    { type: 'X', label: 'X (Twitter)', icon: IconBrandX, color: 'gray', status: 'COMING_SOON' },
    { type: 'YOUTUBE', label: 'YouTube Shorts', icon: IconBrandYoutube, color: 'red', status: 'COMING_SOON' },
    { type: 'TIKTOK', label: 'TikTok', icon: IconBrandTiktok, color: 'dark', status: 'COMING_SOON' },
];

export const FEATURES = [
    { title: '멀티 채널 동시 발행', desc: '한 번 작성하면 5개 채널에 자동 게시. 채널별 최적화 자동 처리.', icon: IconShare },
    { title: '예약 발행', desc: '원하는 시간에 자동 발행. 새벽/주말 휴일에도 안 멈춥니다.', icon: IconCalendar },
    { title: '안전한 자격증명 보호', desc: 'AES-256-GCM 암호화. 사용자 PC 의 에이전트에서 직접 게시 = 클라우드에 비밀번호 평문 저장 X.', icon: IconLock },
    { title: '캠페인 단위 관리', desc: '하나의 캠페인 = 여러 채널 + 예약 시각. 이력 + 성공률 한 눈에.', icon: IconTarget },
    { title: '결과 모니터링', desc: '채널별 발행 성공/실패 + 에러 로그. 다시 시도 1클릭.', icon: IconChartBar },
    { title: '안전한 자동화', desc: '브라우저 기반 게시 = 사용자 행동과 동일. 봇 탐지 회피 기술 내장.', icon: IconShieldCheck },
];

export const PLANS = [
    { 
        key: 'TRIAL', label: '무료 체험', priceKrw: 0, period: '14일',
        features: ['5개 채널 모두 사용', '무제한 게시', '에이전트 1대', '커뮤니티 지원'],
        highlight: false, ctaText: '14일 무료 시작',
    },
    { 
        key: 'LITE', label: 'Lite', priceKrw: 19900, period: '월',
        features: ['1개 채널', '월 100개 게시', '에이전트 1대', '이메일 지원'],
        highlight: false, ctaText: '시작하기',
    },
    { 
        key: 'BASIC', label: 'Basic', priceKrw: 49900, period: '월',
        features: ['5개 채널 (현재 지원 모두)', '무제한 게시', '에이전트 2대', '이메일 + 카톡 지원'],
        highlight: true, ctaText: '시작하기',  // Most Popular
    },
    { 
        key: 'PRO', label: 'Pro', priceKrw: 99900, period: '월',
        features: ['20개 채널 (멀티 계정)', '무제한 게시', '에이전트 5대', '우선 기술 지원', '캠페인 템플릿'],
        highlight: false, ctaText: '시작하기',
    },
    { 
        key: 'ENTERPRISE', label: 'Enterprise', priceKrw: null, period: '별도',
        features: ['무제한 채널', '전담 매니저', '맞춤 SLA', '온프레미스 옵션', '학습/교육 지원'],
        highlight: false, ctaText: '문의하기',
    },
];

export const FAQS = [
    { q: '왜 데스크톱 앱이 필요한가요? 클라우드만으로는 안 되나요?', a: 'SNS 자동화는 사용자의 IP·세션·계정으로 진행되어야 차단되지 않습니다. 클라우드에서 직접 자동화하면 모든 사용자가 같은 IP를 공유하게 되어 즉시 차단됩니다. 마케팅봇은 사용자 컴퓨터(서브컴퓨터 권장)의 에이전트가 게시를 직접 실행합니다.' },
    { q: '서브컴퓨터가 꼭 필요한가요?', a: '필수는 아니지만 권장합니다. 게시 중 다른 작업을 하면 브라우저 자동화에 방해될 수 있어, 자동화 전용 PC(노트북, 미니PC) 가 가장 안정적입니다. 메인 컴퓨터에서도 잘 작동합니다.' },
    { q: '계정 차단 위험은 없나요?', a: '사람과 같은 속도(랜덤 지연 + 인간적 타이핑)로 동작하며, 봇 탐지 회피 기술을 적용했습니다. 단, 하루 50개 이상 동일 채널에 자동 게시하면 차단 위험이 있으니 적정선 내에서 사용을 권장합니다.' },
    { q: '데이터는 안전한가요?', a: 'SNS 비밀번호는 AES-256-GCM 으로 암호화되어 클라우드에 저장됩니다. 게시는 사용자 PC 의 에이전트에서 직접 실행되어 평문 비밀번호가 외부로 나가지 않습니다.' },
    { q: '결제는 어떻게 하나요?', a: '14일 무료 체험은 카드 등록 없이 시작 가능합니다. 체험 기간 종료 후 자동 결제 X. 유료 전환 시 PortOne(국내 PG) 으로 카드 결제 또는 계좌이체.' },
    { q: '환불 가능한가요?', a: '결제 후 7일 내 미사용 시 100% 환불, 사용 중에도 일할 계산 환불. 자세한 내용은 환불정책 페이지 참고.' },
    { q: '여러 SNS 계정을 운영할 수 있나요?', a: '네, Pro 플랜부터 최대 20개 채널(멀티 계정 포함) 지원. 채널마다 별도 세션 관리되어 계정이 섞이지 않습니다.' },
    { q: '에이전트는 Mac 에서도 동작하나요?', a: '현재 Windows 만 지원. macOS / Linux 는 2026년 하반기 출시 예정.' },
];

export const COMPANY_INFO = {
    name: '주식회사 어메이커스',
    serviceName: '마케팅봇',
    ceo: '백승화',
    bizNo: '501-86-02053',
    onlineBizNo: '2021-인천부평-1570',
    address: '인천 미추홀구 장고개로42번길 51 2층 놀라운스튜디오',
    email: 'help@amakers.co.kr',
    tel: '1600-9221',
};
