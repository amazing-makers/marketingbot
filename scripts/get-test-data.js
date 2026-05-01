const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    const license = await prisma.license.findFirst();
    console.log('LICENSE_KEY:', license ? license.key : 'None');
    const user = await prisma.user.findFirst();
    console.log('USER_ID:', user ? user.id : 'None');
    
    if (user) {
        let channel = await prisma.marketingChannel.findFirst({ where: { userId: user.id } });
        if (!channel) {
            channel = await prisma.marketingChannel.create({
                data: {
                    userId: user.id,
                    type: 'INSTAGRAM',
                    accountName: 'Test Account',
                    encryptedCredentials: JSON.stringify({ username: 'test', password: 'password' }),
                }
            });
            console.log('Created test channel:', channel.id);
        }
        
        let campaign = await prisma.campaign.findFirst({ where: { userId: user.id } });
        if (!campaign) {
            campaign = await prisma.campaign.create({
                data: {
                    userId: user.id,
                    name: 'Test Campaign',
                    status: 'SCHEDULED',
                    scheduledAt: new Date(),
                    tasks: {
                        create: {
                            channelId: channel.id,
                            content: 'Test content',
                            scheduledAt: new Date(),
                            status: 'PENDING'
                        }
                    }
                }
            });
            console.log('Created test campaign:', campaign.id);
        }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
