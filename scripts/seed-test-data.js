const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    // 1. Create a test user if none exists
    let user = await prisma.user.findUnique({ where: { email: 'test@amakers.co.kr' } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: 'test@amakers.co.kr',
          password: 'password_not_hashed_for_test', // doesn't matter for this test
          name: 'Test User',
          role: 'ADMIN'
        }
      });
      console.log('Created test user:', user.id);
    }

    // 2. Create a license for the user
    let license = await prisma.license.findFirst({ where: { userId: user.id } });
    if (!license) {
      license = await prisma.license.create({
        data: {
          userId: user.id,
          key: 'TEST-LICENSE-123',
          plan: 'FREE',
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      });
      console.log('Created test license:', license.key);
    } else {
      console.log('Existing license found:', license.key);
    }

    // 3. Create a channel
    let channel = await prisma.marketingChannel.findFirst({ where: { userId: user.id } });
    if (!channel) {
      channel = await prisma.marketingChannel.create({
        data: {
          userId: user.id,
          type: 'INSTAGRAM',
          accountName: 'Test Instagram',
          encryptedCredentials: JSON.stringify({ username: 'testuser', password: 'testpassword' }),
        }
      });
      console.log('Created test channel:', channel.id);
    }

    // 4. Create a campaign and task
    const campaign = await prisma.campaign.create({
      data: {
        userId: user.id,
        name: 'MVP Test Campaign',
        status: 'SCHEDULED',
        scheduledAt: new Date(),
        tasks: {
          create: {
            channelId: channel.id,
            content: 'Hello MarketingBot!',
            scheduledAt: new Date(),
            status: 'PENDING'
          }
        }
      }
    });
    console.log('Created test campaign with PENDING task:', campaign.id);

    console.log('--- TEST DATA READY ---');
    console.log('LICENSE_KEY:', license.key);

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
