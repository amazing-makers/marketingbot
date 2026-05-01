# CLAUDE.md: SNS Auto Platform Guidelines

## Project Tech Stack
- **Frontend**: Next.js 16 (App Router), React 19, Mantine 9
- **Backend**: Next.js API Routes, Prisma 7, Supabase (PostgreSQL)
- **Desktop**: Tauri + Playwright
- **Auth**: NextAuth.js v5 (Beta)
- **Language**: TypeScript

## Build & Development
- `npm run dev` - Start development server
- `npm run build` - Build production application
- `npx prisma generate` - Generate Prisma client
- `npx prisma migrate dev` - Run database migrations

## Code Standards
- **Components**: Functional components with hooks. Use Mantine for UI.
- **Styling**: Vanilla CSS or Mantine system properties. No Tailwind.
- **Types**: Strict TypeScript usage. Prefer interfaces over types for objects.
- **Directives**: Always use `"use client";` for components using Mantine hooks or context.
- **Naming**: PascalCase for components, camelCase for variables/functions, kebab-case for directories.

## Architecture Rules
- Keep logic in `src/app/actions` or `src/lib`.
- API endpoints in `src/app/api`.
- Sensitive data must be encrypted before storage (SnsAccount credentials).
- Desktop agent polls `/api/agent/poll` for tasks.
