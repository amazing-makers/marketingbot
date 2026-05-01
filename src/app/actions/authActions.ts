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

    // 트랜잭션: 유저 생성 + 라이선스 부여
    await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
        },
      });

      // 14일 트라이얼 라이선스 생성
      await tx.license.create({
        data: {
          userId: newUser.id,
          key: `FREE-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
          plan: "FREE",
          validUntil: dayjs().add(14, "day").toDate(),
        },
      });
    });

    return { success: true };
  } catch (error) {
    console.error("Registration error:", error);
    return { error: { message: "회원가입 처리 중 오류가 발생했습니다." } };
  }
}
