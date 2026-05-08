import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import "@/lib/env"; // 환경변수 검증 강제

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials);

        if (parsedCredentials.success) {
          const { email, password } = parsedCredentials.data;
          const user = await prisma.user.findUnique({ where: { email } });

          if (!user) return null;

          const passwordsMatch = await bcrypt.compare(password, user.password);
          if (passwordsMatch) return user;
        }

        return null;
      },
    }),
    // Phase 50 — 같은 PC 에서 한 번 비밀번호로 인증한 계정은 trusted device token 으로
    // 비밀번호 없이 전환 가능. raw token 은 httpOnly cookie 에만 보관, DB 에 bcrypt hash 만 저장.
    Credentials({
      id: 'trusted-device',
      credentials: { userId: {}, token: {} },
      async authorize(credentials) {
        const userId = (credentials?.userId ?? '').toString();
        const token = (credentials?.token ?? '').toString();
        if (!userId || !token) return null;

        const tds = await prisma.trustedDevice.findMany({
          where: { userId, expiresAt: { gt: new Date() } },
          orderBy: { createdAt: 'desc' },
          take: 5,
        });

        for (const td of tds) {
          if (await bcrypt.compare(token, td.tokenHash)) {
            // 사용 시각 기록 (race ok — 정확도보다 가용성)
            prisma.trustedDevice.update({
              where: { id: td.id },
              data: { lastUsedAt: new Date() },
            }).catch(() => {});

            const user = await prisma.user.findUnique({ where: { id: userId } });
            return user || null;
          }
        }
        return null;
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
