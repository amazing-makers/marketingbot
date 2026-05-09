import { z } from 'zod';

const envSchema = z.object({
    DATABASE_URL: z.string().url('Invalid DATABASE_URL'),
    NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 chars'),
    NEXTAUTH_URL: z.string().url('Invalid NEXTAUTH_URL').optional(),
    ENCRYPTION_KEY: z.string().min(32, 'ENCRYPTION_KEY must be at least 32 chars'),
    
    // 옵션 (Phase 5+)
    DEEPL_API_KEY: z.string().optional(),
    RESEND_API_KEY: z.string().optional(),
    RESEND_FROM_EMAIL: z.string().email().default('onboarding@resend.dev'),
    SENTRY_DSN: z.string().optional(),
    NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
    SENTRY_ORG: z.string().optional(),
    SENTRY_PROJECT: z.string().optional(),
    SENTRY_AUTH_TOKEN: z.string().optional(),
    NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
    NEXT_PUBLIC_POSTHOG_HOST: z.string().optional(),
    POSTHOG_API_KEY: z.string().optional(),
    CRON_SECRET: z.string().optional(),

    // Phase 50 — Instagram Graph API OAuth (Meta Developer App, 운영자 1회 등록)
    META_APP_ID: z.string().optional(),
    META_APP_SECRET: z.string().optional(),

    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

// 클라이언트 사이드에서는 process.env가 비어있을 수 있으므로 
// Next.js 환경에서는 이 validation이 주로 서버 사이드에서만 동작하도록 보장해야 함.
// 하지만 build 타임 체크용으로는 매우 효과적임.
export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
