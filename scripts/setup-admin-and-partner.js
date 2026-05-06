/**
 * 셋업 스크립트:
 *   1. admin@amakers.co.kr 사용자 생성 (또는 기존 비밀번호 갱신)
 *   2. help@amakers.co.kr 를 ACTIVE 파트너로 등록
 *
 * 실행: node scripts/setup-admin-and-partner.js
 */

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');
const bcrypt = require('bcryptjs');
const dayjs = require('dayjs');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    console.error('DATABASE_URL 환경변수가 없습니다. .env.local 로드 필요.');
    process.exit(1);
}
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const ADMIN_EMAIL = 'admin@amakers.co.kr';
const ADMIN_PASSWORD = '!djapdlzjtm1';
const PARTNER_EMAIL = 'help@amakers.co.kr';

async function setupAdmin() {
    console.log(`\n[1/2] 관리자 계정 ${ADMIN_EMAIL} 처리 중...`);
    const hashed = await bcrypt.hash(ADMIN_PASSWORD, 10);
    const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });

    if (existing) {
        await prisma.user.update({
            where: { email: ADMIN_EMAIL },
            data: { password: hashed, role: 'ADMIN' },
        });
        console.log(`   ✓ 기존 사용자 비밀번호 갱신 (id: ${existing.id})`);
    } else {
        const user = await prisma.user.create({
            data: {
                email: ADMIN_EMAIL,
                password: hashed,
                name: 'Amakers Admin',
                role: 'ADMIN',
                onboardingCompletedAt: new Date(),
            },
        });
        // 14일 트라이얼 라이센스
        const generateKey = () => {
            const part = () => Math.random().toString(36).substring(2, 6).toUpperCase();
            return `MB-${part()}-${part()}-${part()}-${part()}`;
        };
        await prisma.license.create({
            data: {
                userId: user.id,
                key: generateKey(),
                plan: 'FREE_TRIAL',
                validUntil: dayjs().add(365, 'day').toDate(),
            },
        });
        console.log(`   ✓ 새 관리자 계정 생성 (id: ${user.id}) + 1년 라이센스`);
    }
}

async function setupPartner() {
    console.log(`\n[2/2] 파트너 ${PARTNER_EMAIL} 처리 중...`);
    const user = await prisma.user.findUnique({ where: { email: PARTNER_EMAIL } });
    if (!user) {
        console.error(`   ✗ 사용자를 찾을 수 없어요. ${PARTNER_EMAIL} 로 먼저 회원가입하세요.`);
        return;
    }

    const existing = await prisma.reseller.findUnique({ where: { userId: user.id } });
    if (existing) {
        if (existing.status !== 'ACTIVE') {
            await prisma.reseller.update({
                where: { id: existing.id },
                data: { status: 'ACTIVE' },
            });
            console.log(`   ✓ 기존 파트너 상태를 ACTIVE 로 변경 (id: ${existing.id})`);
        } else {
            console.log(`   ✓ 이미 ACTIVE 파트너 (id: ${existing.id}, name: ${existing.name})`);
        }
        return;
    }

    // 신규 파트너 생성 + 기본 referral code
    const reseller = await prisma.reseller.create({
        data: {
            userId: user.id,
            name: user.name || 'Amakers Help',
            contactEmail: PARTNER_EMAIL,
            taxStatus: 'BUSINESS',
            commissionRate: 0.1,
            status: 'ACTIVE',
            notes: '내부 파트너 — 자체 고객사 관리용',
        },
    });

    const generateCode = () => {
        const part = () => Math.random().toString(36).substring(2, 6).toUpperCase();
        return `HELP-${part()}`;
    };
    const code = await prisma.referralCode.create({
        data: {
            resellerId: reseller.id,
            code: generateCode(),
            description: '내부 추천 코드',
            active: true,
        },
    });
    console.log(`   ✓ 신규 파트너 생성 (id: ${reseller.id}, code: ${code.code})`);
}

async function main() {
    try {
        await setupAdmin();
        await setupPartner();
        console.log('\n✅ 모든 셋업 완료\n');
    } catch (e) {
        console.error('실패:', e);
        process.exitCode = 1;
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

main();
