const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');
const { createCipheriv, randomBytes, scryptSync } = require('crypto');

// 암호화 키 (Step 2에서 생성한 키와 동일해야 함)
process.env.ENCRYPTION_KEY = 'v+IQrEVpdFw8eMSqlDj/U56fscpLWKP0MTPEyNiGKowhQfxXjxttwl4jS7eoRkN7';

// 복사해온 암호화 로직 (src/lib/crypto/aes.ts 와 동일)
function encryptJSON(obj) {
    const ALGORITHM = 'aes-256-gcm';
    const IV_LENGTH = 12;
    const KEY_LENGTH = 32;
    const TAG_LENGTH = 16;
    const secret = process.env.ENCRYPTION_KEY;
    const key = scryptSync(secret, 'marketingbot-salt-v1', KEY_LENGTH);
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    const plaintext = JSON.stringify(obj);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    const user = await prisma.user.findFirst({ where: { email: 'test@amakers.co.kr' } });
    if (!user) throw new Error('Test user not found. Run seed-test-data.js first.');

    // 1. 암호화된 채널 생성
    const creds = { username: 'enc_user_2026', password: 'secure_password_123' };
    const encrypted = encryptJSON(creds);
    
    const channel = await prisma.marketingChannel.create({
      data: {
        userId: user.id,
        type: 'INSTAGRAM',
        accountName: 'Encrypted Instagram',
        encryptedCredentials: encrypted,
      }
    });
    console.log('Created encrypted channel:', channel.id);
    console.log('Encrypted Value (Base64):', encrypted);

    // 2. 캠페인 및 태스크 생성
    const campaign = await prisma.campaign.create({
      data: {
        userId: user.id,
        name: 'Phase 4 Encryption Test',
        status: 'SCHEDULED',
        scheduledAt: new Date(),
        tasks: {
          create: {
            channelId: channel.id,
            content: 'Encrypted message test',
            scheduledAt: new Date(),
            status: 'PENDING'
          }
        }
      }
    });
    console.log('Created campaign with pending task:', campaign.id);

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
