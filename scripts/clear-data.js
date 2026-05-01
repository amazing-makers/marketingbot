const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    const tasks = await prisma.scheduledTask.deleteMany();
    const campaigns = await prisma.campaign.deleteMany();
    const channels = await prisma.marketingChannel.deleteMany();
    console.log(`Cleared: ${tasks.count} tasks, ${campaigns.count} campaigns, ${channels.count} channels.`);
  } catch (err) {
    console.error('Error clearing data:', err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
