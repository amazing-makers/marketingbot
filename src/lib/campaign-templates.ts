export interface CampaignTemplateVariable {
    name: string;
    placeholder: string;
}

export interface CampaignTemplate {
    id: string;
    industry: string;
    title: string;
    description: string;
    contentTemplate: string;
    suggestedChannels: string[];
    suggestedTime: string;
    variables: CampaignTemplateVariable[];
    icon: string;
}

export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
    {
        id: 'restaurant-new-menu',
        industry: '음식점',
        title: '신메뉴 출시 알림',
        description: '새 메뉴 사진과 함께 매장 위치·전화번호 안내',
        contentTemplate: '🍽️ {{매장명}} 신메뉴 출시!\n\n{{메뉴명}} - {{가격}}원\n{{메뉴설명}}\n\n📍 {{매장주소}}\n📞 {{전화번호}}\n\n#{{매장명}} #신메뉴 #맛집',
        suggestedChannels: ['INSTAGRAM', 'NAVER_BLOG', 'FACEBOOK'],
        suggestedTime: '오전 11시 (점심 시간 직전)',
        variables: [
            { name: '매장명', placeholder: '예: 김씨네 식당' },
            { name: '메뉴명', placeholder: '예: 트러플 파스타' },
            { name: '가격', placeholder: '예: 18,000' },
            { name: '메뉴설명', placeholder: '한 줄 설명' },
            { name: '매장주소', placeholder: '서울 강남구...' },
            { name: '전화번호', placeholder: '02-123-4567' },
        ],
        icon: '🍽️',
    },
    {
        id: 'restaurant-event',
        industry: '음식점',
        title: '이벤트/할인 공지',
        description: '특정 기간 할인 또는 이벤트 안내',
        contentTemplate: '🎉 {{이벤트명}} 이벤트!\n\n📅 {{기간}}\n💰 {{혜택}}\n\n자세한 내용은 매장에서!\n📍 {{매장주소}}\n\n#이벤트 #할인 #{{매장명}}',
        suggestedChannels: ['INSTAGRAM', 'NAVER_CAFE', 'FACEBOOK'],
        suggestedTime: '오후 6시 (저녁 약속 시간)',
        variables: [
            { name: '이벤트명', placeholder: '예: 주말 50% 할인' },
            { name: '기간', placeholder: '예: 5/1 ~ 5/15' },
            { name: '혜택', placeholder: '예: 전 메뉴 50% 할인' },
            { name: '매장주소', placeholder: '서울...' },
            { name: '매장명', placeholder: '...' },
        ],
        icon: '🎉',
    },
    {
        id: 'salon-new-style',
        industry: '미용실',
        title: '새 스타일 비포애프터',
        description: '시술 결과 사진 + 스타일 설명',
        contentTemplate: '✨ {{스타일명}}\n\n시술 시간: {{시간}}\n예상 가격: {{가격}}원\n\n{{스타일설명}}\n\n📞 {{전화번호}} 예약 환영\n#{{미용실명}} #헤어스타일',
        suggestedChannels: ['INSTAGRAM', 'NAVER_BLOG'],
        suggestedTime: '오후 2시 (점심 후 휴식 시간)',
        variables: [
            { name: '스타일명', placeholder: '예: 시스루 뱅 단발' },
            { name: '시간', placeholder: '예: 1시간 30분' },
            { name: '가격', placeholder: '예: 80,000' },
            { name: '스타일설명', placeholder: '...' },
            { name: '미용실명', placeholder: '...' },
            { name: '전화번호', placeholder: '...' },
        ],
        icon: '💇',
    },
    {
        id: 'academy-enrollment',
        industry: '학원',
        title: '신학기/특강 모집',
        description: '강좌 모집 공지',
        contentTemplate: '📚 {{강좌명}} 모집!\n\n📅 {{기간}}\n👨‍🏫 {{강사}}\n💰 {{수강료}}\n📞 {{전화번호}}\n\n조기 등록 시 {{혜택}}!\n#{{학원명}} #{{과목}}',
        suggestedChannels: ['NAVER_BLOG', 'NAVER_CAFE', 'INSTAGRAM'],
        suggestedTime: '오후 6시 (퇴근 후)',
        variables: [
            { name: '강좌명', placeholder: '예: 영어 회화 봄학기' },
            { name: '기간', placeholder: '예: 3/1 ~ 5/31' },
            { name: '강사', placeholder: '...' },
            { name: '수강료', placeholder: '...' },
            { name: '전화번호', placeholder: '...' },
            { name: '혜택', placeholder: '예: 10% 할인' },
            { name: '학원명', placeholder: '...' },
            { name: '과목', placeholder: '...' },
        ],
        icon: '📚',
    },
    {
        id: 'ecommerce-product',
        industry: '쇼핑몰',
        title: '신상품 입고',
        description: '신상품 소개 + 구매 링크',
        contentTemplate: '🛍️ {{상품명}} 입고!\n\n{{상품설명}}\n\n💰 {{가격}}원 (정상가 {{정가}}원)\n📦 {{배송정보}}\n\n👉 {{구매링크}}\n#쇼핑 #신상품',
        suggestedChannels: ['INSTAGRAM', 'FACEBOOK', 'NAVER_BLOG', 'THREADS'],
        suggestedTime: '오후 8시 (퇴근 후 쇼핑)',
        variables: [
            { name: '상품명', placeholder: '...' },
            { name: '상품설명', placeholder: '...' },
            { name: '가격', placeholder: '...' },
            { name: '정가', placeholder: '...' },
            { name: '배송정보', placeholder: '예: 무료배송' },
            { name: '구매링크', placeholder: '...' },
        ],
        icon: '🛍️',
    },
    {
        id: 'cafe-new-drink',
        industry: '카페',
        title: '시즌 음료 출시',
        description: '계절 한정 음료 홍보',
        contentTemplate: '☕ 시즌 한정 {{음료명}}\n\n{{음료설명}}\n\n💰 {{가격}}원\n📅 {{판매기간}}\n\n📍 {{매장주소}}\n#{{카페명}} #{{시즌}}',
        suggestedChannels: ['INSTAGRAM', 'THREADS'],
        suggestedTime: '오전 10시 (출근 전)',
        variables: [
            { name: '음료명', placeholder: '예: 봄꽃 딸기 라떼' },
            { name: '음료설명', placeholder: '...' },
            { name: '가격', placeholder: '...' },
            { name: '판매기간', placeholder: '...' },
            { name: '매장주소', placeholder: '...' },
            { name: '카페명', placeholder: '...' },
            { name: '시즌', placeholder: '예: 봄' },
        ],
        icon: '☕',
    },
    {
        id: 'realestate-listing',
        industry: '부동산',
        title: '매물 소개',
        description: '신규 매물 정보',
        contentTemplate: '🏠 {{매물유형}}\n\n📍 {{위치}}\n💰 {{가격}}\n📐 {{면적}}\n\n{{특징}}\n\n📞 문의: {{전화번호}}\n#{{지역}} #부동산',
        suggestedChannels: ['NAVER_CAFE', 'NAVER_BLOG'],
        suggestedTime: '오후 7시',
        variables: [
            { name: '매물유형', placeholder: '예: 아파트 매매' },
            { name: '위치', placeholder: '...' },
            { name: '가격', placeholder: '...' },
            { name: '면적', placeholder: '...' },
            { name: '특징', placeholder: '...' },
            { name: '전화번호', placeholder: '...' },
            { name: '지역', placeholder: '...' },
        ],
        icon: '🏠',
    },
    {
        id: 'gym-promotion',
        industry: '헬스장',
        title: '회원 모집 프로모션',
        description: '신규 회원 할인 이벤트',
        contentTemplate: '💪 {{헬스장명}} 신규 회원 모집!\n\n🎁 {{혜택}}\n📅 {{기간}}\n📞 {{전화번호}}\n📍 {{주소}}\n\n#헬스 #PT #{{지역}}',
        suggestedChannels: ['INSTAGRAM', 'NAVER_BLOG'],
        suggestedTime: '오후 7시 (퇴근 후 운동)',
        variables: [
            { name: '헬스장명', placeholder: '...' },
            { name: '혜택', placeholder: '예: 3개월 등록 시 1개월 무료' },
            { name: '기간', placeholder: '...' },
            { name: '전화번호', placeholder: '...' },
            { name: '주소', placeholder: '...' },
            { name: '지역', placeholder: '...' },
        ],
        icon: '💪',
    },
    {
        id: 'fashion-coordinated',
        industry: '의류',
        title: '오늘의 코디',
        description: '데일리 룩 제안',
        contentTemplate: '👗 오늘의 코디\n\n{{설명}}\n\n상의: {{상의}} ({{상의가격}})\n하의: {{하의}} ({{하의가격}})\n신발: {{신발}}\n\n#오늘의룩 #ootd',
        suggestedChannels: ['INSTAGRAM', 'THREADS'],
        suggestedTime: '오전 8시 (출근 전)',
        variables: [
            { name: '설명', placeholder: '...' },
            { name: '상의', placeholder: '...' },
            { name: '상의가격', placeholder: '...' },
            { name: '하의', placeholder: '...' },
            { name: '하의가격', placeholder: '...' },
            { name: '신발', placeholder: '...' },
        ],
        icon: '👗',
    },
    {
        id: 'general-announcement',
        industry: '일반',
        title: '공지사항',
        description: '범용 공지/안내',
        contentTemplate: '📢 {{제목}}\n\n{{본문}}\n\n📞 {{연락처}}',
        suggestedChannels: ['INSTAGRAM', 'NAVER_BLOG', 'FACEBOOK'],
        suggestedTime: '오전 10시',
        variables: [
            { name: '제목', placeholder: '...' },
            { name: '본문', placeholder: '...' },
            { name: '연락처', placeholder: '...' },
        ],
        icon: '📢',
    },
];

export const TEMPLATE_INDUSTRIES = Array.from(new Set(CAMPAIGN_TEMPLATES.map(t => t.industry)));

export function getTemplateById(id: string): CampaignTemplate | undefined {
    return CAMPAIGN_TEMPLATES.find(t => t.id === id);
}

export function getTemplatesByIndustry(industry: string): CampaignTemplate[] {
    return CAMPAIGN_TEMPLATES.filter(t => t.industry === industry);
}

export function applyTemplateVariables(template: string, values: Record<string, string>): string {
    let result = template;
    for (const [name, value] of Object.entries(values)) {
        const placeholder = `{{${name}}}`;
        result = result.split(placeholder).join(value || placeholder);
    }
    return result;
}
