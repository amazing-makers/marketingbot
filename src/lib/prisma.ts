import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __mbPrisma: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var __mbPgPool: pg.Pool | undefined;
}

function createClient(): PrismaClient {
  const pool =
    globalThis.__mbPgPool ??
    new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: 1, // serverless: lambda 당 1 connection — Supabase Session pooler 15 한도 보호
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });

  if (!globalThis.__mbPgPool) {
    globalThis.__mbPgPool = pool;
  }

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

// production 환경에서도 lambda 재사용 시 캐시 (cold start 비용 + connection 절약)
export const prisma: PrismaClient = globalThis.__mbPrisma ?? createClient();

if (!globalThis.__mbPrisma) {
  globalThis.__mbPrisma = prisma;
}
