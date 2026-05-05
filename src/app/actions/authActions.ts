"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import dayjs from "dayjs";
import { z } from "zod";

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

    // 트랜잭션: 유저 생성 + 라이선스 부여
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

      return { user: newUser, license: newLicense };
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

    // Phase 17 — 추천 코드로 가입한 경우 파트너에게 알림
    if (referredByCodeId) {
      (async () => {
        try {
          const code = await prisma.referralCode.findUnique({
            where: { id: referredByCodeId! },
            include: {
              reseller: {
                select: { name: true, contactEmail: true, status: true, user: { select: { email: true } } },
              },
            },
          });
          if (!code || code.reseller.status !== 'ACTIVE') return;
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
          console.warn('[partner notification] new referral email failed', err);
        }
      })();
    }

    return { success: true };
  } catch (error) {
    console.error("Registration error:", error);
    return { error: { message: "회원가입 처리 중 오류가 발생했습니다." } };
  }
}
