"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import dayjs from "dayjs";
import { z } from "zod";
import { headers } from "next/headers";
import crypto from "crypto";

const registerSchema = z.object({
  email: z.string().email("유효한 이메일을 입력하세요."),
  password: z.string().min(6, "비밀번호는 최소 6자 이상이어야 합니다."),
  name: z.string().min(2, "이름을 입력하세요."),
});

export async function registerUser(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;
  // Phase 13 — 리셀러 추천 코드 (선택, 가입 폼 hidden input 또는 ?ref= 쿼리에서 전달)
  const referralCode = (formData.get("referralCode") as string | null)?.trim() || null;
  // Phase 48 — 사용자 친구 초대 코드 (?refby=)
  const refByCode = (formData.get("refByCode") as string | null)?.trim() || null;

  // 유효성 검사
  const validatedFields = registerSchema.safeParse({ email, password, name });
  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors };
  }

  try {
    // 이메일 중복 확인
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { error: { email: ["이미 사용 중인 이메일입니다."] } };
    }

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, 10);

    // 추천 코드 해석 (있으면) — invalid/inactive 면 null 처리하고 가입은 진행
    let referredByCodeId: string | null = null;
    if (referralCode) {
      const code = await prisma.referralCode.findUnique({
        where: { code: referralCode.toUpperCase() },
        select: { id: true, active: true, reseller: { select: { status: true } } },
      });
      if (code?.active && code.reseller?.status === 'ACTIVE') {
        referredByCodeId = code.id;
      }
    }

    // 트랜잭션: 유저 생성 + 라이선스 부여 + 개인 워크스페이스 자동 생성 (Phase 29)
    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          referredByCodeId,
        },
      });

      // 14일 트라이얼 라이선스 생성 (MB-XXXX-XXXX-XXXX-XXXX)
      const generateKey = () => {
        const part = () => Math.random().toString(36).substring(2, 6).toUpperCase();
        return `MB-${part()}-${part()}-${part()}-${part()}`;
      };

      const newLicense = await tx.license.create({
        data: {
          userId: newUser.id,
          key: generateKey(),
          plan: "FREE_TRIAL",
          validUntil: dayjs().add(14, "day").toDate(),
        },
      });

      // Phase 29 — 개인 워크스페이스 자동 생성 (slug 충돌 시 ID suffix)
      const baseSlug = (name || email.split('@')[0])
        .toLowerCase()
        .replace(/[^a-z0-9가-힣\-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 40) || 'my-workspace';
      const slug = `${baseSlug}-${newUser.id.slice(-6)}`;

      const workspace = await tx.workspace.create({
        data: {
          name: `${name}의 워크스페이스`,
          slug,
          ownerId: newUser.id,
          plan: 'FREE',
        },
      });
      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: newUser.id,
          role: 'OWNER',
        },
      });
      await tx.user.update({
        where: { id: newUser.id },
        data: { currentWorkspaceId: workspace.id },
      });

      return { user: newUser, license: newLicense, workspace };
    });

    // 이메일 발송 (비동기, 가입 성공에 영향을 주지 않음)
    const { sendEmail } = await import("@/lib/email/send");
    const { WelcomeEmail } = await import("@/lib/email/templates/Welcome");

    const prefs = result.user.emailPreferences as any;
    if (prefs?.welcome !== false) {
      sendEmail({
        to: email,
        subject: "[마케팅봇] 가입을 환영합니다 🎉",
        react: WelcomeEmail({
          name: name,
          licenseKey: result.license.key,
          dashboardUrl: `${process.env.NEXTAUTH_URL || 'https://marketingbot.kr'}/dashboard`,
        }),
      }).catch(err => console.error("Welcome email failed:", err));
    }

    // Phase 48 — 친구 초대 코드 적용 (?refby=)
    if (refByCode) {
      import("@/app/actions/referActions").then(({ applyReferralCode }) => {
        applyReferralCode(result.user.id, refByCode).catch(() => { /* ignore */ });
      });
    }

    // PostHog 이벤트 (비동기, 실패해도 가입 영향 X)
    import("@/lib/analytics/posthog-server").then(({ captureEvent }) => {
      import("@/lib/analytics/events").then(({ EVENTS }) => {
        captureEvent({
          distinctId: result.user.id,
          event: EVENTS.USER_SIGNED_UP,
          properties: {
            email,
            plan: result.license.plan,
            $set: { email, name },
          },
        }).catch(() => {});
      });
    });

    // Phase 17 — 추천 코드로 가입한 경우 파트너에게 알림 (이메일 + 인앱)
    if (referredByCodeId) {
      (async () => {
        try {
          const code = await prisma.referralCode.findUnique({
            where: { id: referredByCodeId! },
            include: {
              reseller: {
                select: { id: true, userId: true, name: true, contactEmail: true, status: true, user: { select: { email: true } } },
              },
            },
          });
          if (!code || code.reseller.status !== 'ACTIVE') return;

          // 인앱 알림 (Phase 20)
          const { createNotification } = await import("@/lib/notifications/create");
          await createNotification({
            userId: code.reseller.userId,
            kind: 'REFERRAL_NEW',
            title: `새 추천 사용자 가입`,
            body: `${name} (${email}) 님이 ${code.code} 코드로 가입했어요`,
            link: '/dashboard/partner',
            metadata: { resellerId: code.reseller.id, referredEmail: email, code: code.code },
          });

          // 이메일 알림
          const partnerEmail = code.reseller.contactEmail || code.reseller.user.email;
          if (!partnerEmail) return;
          const { sendEmail } = await import("@/lib/email/send");
          const { NewReferralEmail } = await import("@/lib/email/templates/PartnerNotifications");
          await sendEmail({
            to: partnerEmail,
            subject: `🎉 ${code.code} — 새 추천 사용자 가입`,
            react: NewReferralEmail({
              partnerName: code.reseller.name,
              referredEmail: email,
              referredName: name,
              referralCode: code.code,
              dashboardUrl: `${process.env.NEXTAUTH_URL || 'https://marketingbot.amakers.co.kr'}/dashboard/partner`,
            }),
          });
        } catch (err) {
          console.warn('[partner notification] new referral failed', err);
        }
      })();
    }

    return { success: true };
  } catch (error) {
    console.error("Registration error:", error);
    return { error: { message: "회원가입 처리 중 오류가 발생했습니다." } };
  }
}

// ════════════════════════════════════════════════════════════
//  Phase 34 — 새 디바이스 로그인 알림
// ════════════════════════════════════════════════════════════

/**
 * 로그인 직후 호출 — UA + IP fingerprint 가 처음 보는 조합이면 사용자에게 알림.
 *
 * 90일 내에 같은 fingerprint 의 LOGIN_NEW_DEVICE 알림이 있었으면 skip.
 * Notification 테이블 자체를 fingerprint history 로 활용 — 별도 모델 불필요.
 *
 * fingerprint = SHA256(UA + IP-처음3옥텟). 첫 3옥텟만 사용 → 같은 ISP/네트워크면 동일.
 *
 * 호출 위치: login/page.tsx 의 signIn 성공 직후 (fire-and-forget).
 */
export async function recordLoginEvent(userId: string): Promise<{ ok: boolean; alerted?: boolean }> {
  try {
    const h = await headers();
    const userAgent = (h.get("user-agent") || "unknown").slice(0, 300);
    const ipRaw = h.get("x-forwarded-for")?.split(",")[0]?.trim()
      || h.get("x-real-ip")
      || "0.0.0.0";
    // IPv4 의 첫 3옥텟만 사용 (개인정보 보호 + ISP 단위 식별)
    const ipPrefix = ipRaw.includes(".") ? ipRaw.split(".").slice(0, 3).join(".") + ".0" : ipRaw;

    const fingerprint = crypto
      .createHash("sha256")
      .update(`${userAgent}|${ipPrefix}`)
      .digest("hex")
      .slice(0, 16);

    // 90일 내 같은 fingerprint 본 적 있는지
    const ninetyDaysAgo = dayjs().subtract(90, "day").toDate();
    const seen = await prisma.notification.findFirst({
      where: {
        userId,
        kind: "LOGIN_NEW_DEVICE",
        createdAt: { gte: ninetyDaysAgo },
      },
      select: { metadata: true },
    });

    // 같은 fingerprint 가 metadata 에 있으면 skip
    if (seen) {
      const meta = (seen.metadata as any) || {};
      if (meta.fingerprint === fingerprint) {
        return { ok: true, alerted: false };
      }
    }

    // 첫 로그인이면 (createdAt < 5분) skip — 가입 직후라 노이즈
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true, createdAt: true, emailPreferences: true },
    });
    if (!user) return { ok: false };
    if (dayjs().diff(user.createdAt, "minute") < 5) {
      return { ok: true, alerted: false };
    }

    // UA 간단 파싱 (Chrome on Windows / Safari on iPhone 등)
    const summary = summarizeUserAgent(userAgent);

    // 인앱 알림
    const { createNotification } = await import("@/lib/notifications/create");
    await createNotification({
      userId,
      kind: "LOGIN_NEW_DEVICE",
      title: `🔐 새 위치에서 로그인`,
      body: `${summary} · IP ${ipRaw}`,
      link: "/dashboard/settings/profile",
      metadata: { fingerprint, ipAddress: ipRaw, userAgent: userAgent.slice(0, 100) },
    });

    // 이메일 발송 (조용히 실패)
    if (user.email) {
      const prefs = (user.emailPreferences as any) || {};
      if (prefs.welcome !== false) {
        try {
          const { sendEmail } = await import("@/lib/email/send");
          const { NewDeviceLoginEmail } = await import("@/lib/email/templates/NewDeviceLogin");
          const appUrl = process.env.NEXTAUTH_URL || "https://marketingbot.amakers.co.kr";
          await sendEmail({
            to: user.email,
            subject: "🔐 [마케팅봇] 새 위치에서 로그인",
            react: NewDeviceLoginEmail({
              name: user.name || user.email.split("@")[0],
              ipAddress: ipRaw,
              userAgentSummary: summary,
              loginAt: dayjs().format("YYYY-MM-DD HH:mm"),
              securityUrl: `${appUrl}/dashboard/settings/profile`,
            }),
          });
        } catch (e) {
          console.warn("[login-alert] email failed:", e);
        }
      }
    }

    return { ok: true, alerted: true };
  } catch (e) {
    console.warn("[login-alert] error:", e);
    return { ok: false };
  }
}

function summarizeUserAgent(ua: string): string {
  const lc = ua.toLowerCase();
  let browser = "Unknown";
  if (lc.includes("edg/")) browser = "Edge";
  else if (lc.includes("chrome/") && !lc.includes("edg/")) browser = "Chrome";
  else if (lc.includes("firefox/")) browser = "Firefox";
  else if (lc.includes("safari/") && !lc.includes("chrome/")) browser = "Safari";

  let os = "Unknown OS";
  if (lc.includes("windows")) os = "Windows";
  else if (lc.includes("mac os") || lc.includes("macintosh")) os = "macOS";
  else if (lc.includes("iphone") || lc.includes("ipad")) os = "iOS";
  else if (lc.includes("android")) os = "Android";
  else if (lc.includes("linux")) os = "Linux";

  return `${browser} on ${os}`;
}
