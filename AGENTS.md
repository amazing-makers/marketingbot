# AGENTS.md: AI Assistant Instructions

## Context
This is **Marketingbot (마케팅봇)** — an all-channel marketing automation SaaS (SNS, email, SMS, blog, etc.).
Architecture: Cloud dashboard (Next.js + Vercel) + Desktop agent (Tauri + Playwright) hybrid.
Migrating from a previous Docker-based prototype.

## Agent Guidelines
1. **Mantine UI**: Always use Mantine 9 components for UI. Do not use Tailwind CSS.
2. **Prisma 7**: Prisma 7 uses `prisma.config.ts` for database connection URLs; `schema.prisma` should not contain the `url` property in the `datasource` block.
3. **Next.js 16 / React 19**: Cutting-edge versions. Ensure compatibility with React 19 (server components, etc.).
4. **Client/Server Balance**: Mantine-heavy pages → `"use client";`. Database access → Server Actions or API routes.
5. **Security**: Never expose API keys. Encrypt SNS/account credentials at rest.
6. **Build verification mandatory**: `npm run build` must PASS before any push.
7. **Korean responses**: User communicates in Korean. Respond in Korean.
8. **Husky pre-commit**: Use `--no-verify` only for husky bypass (vitest fails locally without DB).

## Working Directory
- Root: `C:\marketingbot`
- GitHub: `amazing-makers/marketingbot` (private)
- Backup Ref (legacy Docker code): `C:\sns-auto-platform-docker-backup-2026-04-30`

## Implementation Steps
Refer to `.agent/ROADMAP.md` for the current phase and goal.
Update `.agent/STATUS.md` after completing significant changes.

## Naming
- Project canonical name: **marketingbot**
- Korean: **마케팅봇**
- Brand short name: Marketingbot
