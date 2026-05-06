/**
 * Phase 42 — 업종별 빠른 시작 마법사 프리셋.
 *
 * 사용자가 가입 시 선택한 업종에 따라:
 *   - 추천 캡션 템플릿 3개 자동 등록
 *   - 추천 SNS 플랫폼 안내
 *   - 추천 발행 빈도 안내
 *
 * 신규 업종 추가 시: INDUSTRY_PRESETS 에 키 추가만 하면 됨.
 */

export interface IndustryPreset {
    id: string;
    label: string;
    emoji: string;
    description: string;
    /** 추천 SNS 플랫폼 (사용자에게 안내용) */
    recommendedChannels: string[];
    /** 추천 발행 빈도 */
    recommendedFrequency: string;
    /** 자동 등록할 템플릿 3개 */
    templates: Array<{
        name: string;
        body: string;
        hashtags: string;
        category: string;
    }>;
}

export const INDUSTRY_PRESETS: Record<string, IndustryPreset> = {
    cafe: {
        id: 'cafe',
        label: '카페·디저트',
        emoji: '☕',
        description: '신메뉴·시즌 음료·디저트 인증샷 자동 발행',
        recommendedChannels: ['Instagram', 'Naver Blog', 'Threads'],
        recommendedFrequency: '매일 오전 9시·오후 3시 (오픈·티타임)',
        templates: [
            {
                name: '신메뉴 출시',
                body: '🌟 새로운 [메뉴이름] 출시!\n\n달콤하고 부드러운 [메뉴이름] 이 우리 카페에 새로 들어왔어요.\n오늘만의 특별한 한 잔, 지금 만나보세요 ☕\n\n📍 [매장 위치]\n⏰ 평일 [영업시간]',
                hashtags: '#카페신메뉴 #신메뉴 #카페추천 #카페그램 #일상 #데일리',
                category: '카페·디저트',
            },
            {
                name: '시즌 한정 메뉴',
                body: '🍂 [계절] 한정 [메뉴이름]\n\n이번 시즌만 만날 수 있는 특별한 음료예요.\n향긋한 [재료]와 [재료]의 완벽한 조합!\n\n#오늘의커피 #시즌메뉴',
                hashtags: '#계절메뉴 #시즌한정 #카페투어 #카페스타그램 #힐링',
                category: '카페·디저트',
            },
            {
                name: '주말 이벤트',
                body: '🎁 주말 깜짝 이벤트!\n\n이번 주말 [날짜] 동안 [메뉴이름] 주문 시 [혜택].\n친구·가족과 함께 즐기는 따뜻한 시간 ❤️\n\n📌 매장 방문 한정',
                hashtags: '#주말이벤트 #이벤트 #카페할인 #놀러오세요',
                category: '카페·디저트',
            },
        ],
    },
    restaurant: {
        id: 'restaurant',
        label: '식당·요식업',
        emoji: '🍽️',
        description: '메뉴 사진·런치 특가·후기 마케팅',
        recommendedChannels: ['Instagram', 'Naver Blog', 'Naver Cafe'],
        recommendedFrequency: '주 3-4회 (점심·저녁 시간 전)',
        templates: [
            {
                name: '오늘의 메뉴',
                body: '🍽️ 오늘의 추천 메뉴\n\n[메뉴이름] - [가격]\n[설명: 식재료·조리법·맛]\n\n📍 [매장명] · [위치]\n⏰ [영업시간]',
                hashtags: '#맛스타그램 #맛집 #점심추천 #저녁추천 #일상',
                category: '식당',
            },
            {
                name: '런치 특가',
                body: '🥢 평일 런치 특가\n\n[날짜] 까지 [메뉴이름] [할인율]% 할인!\n바쁜 점심시간, 든든한 한 끼 어떠세요?\n\n📌 평일 [시간] 한정',
                hashtags: '#런치특가 #점심할인 #직장인점심 #맛집',
                category: '식당',
            },
            {
                name: '단골 후기 감사',
                body: '💌 단골 손님 후기 감사합니다\n\n"[후기 인용]"\n— [고객 이름] 님\n\n앞으로도 더 맛있고 정성 가득한 음식으로 보답하겠습니다.\n오늘도 든든한 한 끼 되세요 🙏',
                hashtags: '#리뷰감사 #단골 #맛집후기 #감사합니다',
                category: '식당',
            },
        ],
    },
    beauty: {
        id: 'beauty',
        label: '뷰티·화장품',
        emoji: '💄',
        description: '제품 리뷰·사용법·고객 변신 사례',
        recommendedChannels: ['Instagram', 'Naver Blog', 'TikTok'],
        recommendedFrequency: '주 3-5회 (저녁 시간대 효과적)',
        templates: [
            {
                name: '신제품 출시',
                body: '✨ 신제품 출시 안내\n\n[제품명] 이 드디어 출시됐어요!\n💫 주요 성분: [성분]\n💫 효과: [효과]\n💫 추천 피부 타입: [타입]\n\n오늘 첫 구매 시 특별 혜택!',
                hashtags: '#신제품 #뷰티 #화장품추천 #스킨케어 #데일리뷰티',
                category: '뷰티·화장품',
            },
            {
                name: '사용법 꿀팁',
                body: '💡 [제품명] 200% 활용법\n\n1️⃣ [단계]\n2️⃣ [단계]\n3️⃣ [단계]\n\n팁: [추가 팁]',
                hashtags: '#뷰티팁 #화장팁 #스킨케어팁 #메이크업',
                category: '뷰티·화장품',
            },
            {
                name: 'Before & After',
                body: '🪞 Before vs After\n\n[제품명] 사용 후 [기간] 변화\n\n✨ [변화 1]\n✨ [변화 2]\n✨ [변화 3]\n\n실제 고객님 후기 ❤️',
                hashtags: '#비포애프터 #리얼후기 #뷰티스타그램 #피부관리',
                category: '뷰티·화장품',
            },
        ],
    },
    fashion: {
        id: 'fashion',
        label: '의류·패션',
        emoji: '👕',
        description: '신상 룩북·스타일링 팁·할인 행사',
        recommendedChannels: ['Instagram', 'TikTok', 'Pinterest'],
        recommendedFrequency: '주 4-6회 (오후·저녁)',
        templates: [
            {
                name: '신상 룩북',
                body: '👗 [시즌] 신상 ARRIVAL\n\n새로운 컬렉션이 도착했어요.\n포인트: [디자인 포인트]\n어울리는 룩: [코디 추천]\n\n온/오프라인 동시 판매 중',
                hashtags: '#신상 #룩북 #데일리룩 #ootd #코디',
                category: '의류·패션',
            },
            {
                name: '스타일링 팁',
                body: '✨ [아이템] 스타일링 가이드\n\n1. [스타일1] → 데일리 추천\n2. [스타일2] → 데이트룩\n3. [스타일3] → 출근룩\n\n어떤 스타일이 가장 마음에 드세요?',
                hashtags: '#스타일링 #코디팁 #패션팁 #데일리코디',
                category: '의류·패션',
            },
            {
                name: '시즌 세일',
                body: '🔥 [기간] 한정 SALE\n\n인기 아이템 [할인율]% 할인!\n👉 [상품1]\n👉 [상품2]\n👉 [상품3]\n\n빠르게 사라지는 사이즈도 있으니 서두르세요!',
                hashtags: '#세일 #할인 #쇼핑 #패션',
                category: '의류·패션',
            },
        ],
    },
    fitness: {
        id: 'fitness',
        label: '헬스장·요가·필라테스',
        emoji: '💪',
        description: '운동 루틴·회원 후기·트레이너 팁',
        recommendedChannels: ['Instagram', 'YouTube', 'TikTok'],
        recommendedFrequency: '주 3-5회 (아침·저녁 운동 시간)',
        templates: [
            {
                name: '오늘의 운동 루틴',
                body: '💪 오늘의 운동 추천\n\n🔥 [부위] 집중 루틴\n1. [운동1] - [횟수]\n2. [운동2] - [횟수]\n3. [운동3] - [횟수]\n\n포인트: [주의사항·팁]',
                hashtags: '#헬스타그램 #운동 #홈트 #피트니스 #데일리운동',
                category: '헬스·요가',
            },
            {
                name: '회원 변화 사례',
                body: '✨ 회원님 변화 이야기\n\n[기간] 동안 [회원이름] 님의 변화\n시작: [시작 상태]\n현재: [현재 상태]\n비결: [비결]\n\n다음 주인공이 되어보세요 🔥',
                hashtags: '#비포애프터 #변화 #다이어트 #체중감량 #건강',
                category: '헬스·요가',
            },
            {
                name: '신규 회원 이벤트',
                body: '🎁 신규 회원 특별 혜택\n\n[기간] 등록 시:\n✅ [혜택1]\n✅ [혜택2]\n✅ [혜택3]\n\n📍 [매장 위치]\n📞 [연락처]',
                hashtags: '#신규회원 #헬스장이벤트 #건강한삶 #운동시작',
                category: '헬스·요가',
            },
        ],
    },
    education: {
        id: 'education',
        label: '교육·학원·강의',
        emoji: '📚',
        description: '커리큘럼·합격 후기·무료 자료',
        recommendedChannels: ['Naver Blog', 'Naver Cafe', 'YouTube'],
        recommendedFrequency: '주 2-3회 (저녁·주말)',
        templates: [
            {
                name: '신규 강좌 안내',
                body: '📚 신규 강좌 OPEN\n\n[강좌명] - [대상]\n👨‍🏫 강사: [강사 정보]\n📅 일정: [기간]\n💰 수강료: [가격]\n\n선착순 [인원]명 한정 모집!',
                hashtags: '#학원 #강의 #교육 #공부 #학습',
                category: '교육·강의',
            },
            {
                name: '합격·수료 후기',
                body: '🎓 [학생이름] 님 합격 축하\n\n"[합격 후기 인용]"\n\n[지원 학교/시험] 합격!\n수강 기간: [기간]\n주요 비결: [비결]\n\n다음 합격자는 당신입니다 ✨',
                hashtags: '#합격후기 #공부법 #학습후기 #감사합니다',
                category: '교육·강의',
            },
            {
                name: '무료 자료 제공',
                body: '🎁 무료 자료 다운로드\n\n[자료명] 무료 배포 중!\n📌 포함 내용:\n- [내용1]\n- [내용2]\n- [내용3]\n\n👉 댓글에 "신청" 남기시면 DM 으로 보내드려요',
                hashtags: '#무료자료 #공부자료 #학습 #교육',
                category: '교육·강의',
            },
        ],
    },
    saas: {
        id: 'saas',
        label: 'IT·SaaS',
        emoji: '💻',
        description: '제품 업데이트·고객 사례·기능 소개',
        recommendedChannels: ['LinkedIn', 'X', 'Threads', 'Naver Blog'],
        recommendedFrequency: '주 3-4회 (평일 오후)',
        templates: [
            {
                name: '새 기능 출시',
                body: '🚀 New Feature Released\n\n[기능명] 가 추가됐어요!\n\n💡 무엇이 가능해졌나요?\n- [기능1]\n- [기능2]\n- [기능3]\n\n👉 지금 바로 사용해보세요 [링크]',
                hashtags: '#newfeature #saas #productupdate #tech',
                category: 'IT·SaaS',
            },
            {
                name: '고객 사례 공유',
                body: '🏆 Customer Success\n\n[고객사명] 이 [성과] 달성!\n\n사용 기능:\n✅ [기능1]\n✅ [기능2]\n\n결과: [결과 수치]\n\n"[고객 인용]" — [담당자]',
                hashtags: '#customerstory #b2b #productivity #automation',
                category: 'IT·SaaS',
            },
            {
                name: '팁·튜토리얼',
                body: '💡 Pro Tip\n\n[기능] 200% 활용법\n\n1. [단계1]\n2. [단계2]\n3. [단계3]\n\nbonus: [추가 팁]',
                hashtags: '#protip #tutorial #howto #productivity',
                category: 'IT·SaaS',
            },
        ],
    },
    other: {
        id: 'other',
        label: '기타',
        emoji: '✨',
        description: '범용 마케팅 템플릿',
        recommendedChannels: ['Instagram', 'Naver Blog', 'Facebook'],
        recommendedFrequency: '주 2-3회',
        templates: [
            {
                name: '신상품·서비스 소개',
                body: '✨ 새로운 [상품/서비스]\n\n[상품명/서비스명]\n주요 특징: [특징]\n가격: [가격]\n\n📍 [위치/온라인]\n💬 문의: [연락처]',
                hashtags: '#신상품 #추천 #일상',
                category: '기타',
            },
            {
                name: '이벤트 안내',
                body: '🎁 특별 이벤트\n\n[이벤트명]\n📅 [기간]\n🎁 혜택: [혜택]\n👉 참여 방법: [방법]\n\n많은 참여 부탁드려요!',
                hashtags: '#이벤트 #프로모션',
                category: '기타',
            },
            {
                name: '감사 인사',
                body: '🙏 감사합니다\n\n[이유: 회원수·기간 등]\n저희를 이용해주신 모든 분께 진심으로 감사드립니다.\n\n앞으로도 더 좋은 [상품/서비스] 로 보답하겠습니다 ❤️',
                hashtags: '#감사 #고객감사 #이용감사',
                category: '기타',
            },
        ],
    },
};

export const INDUSTRY_LIST = Object.values(INDUSTRY_PRESETS);
