'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function submitFeedback(input: {
    rating: number;
    comment?: string;
    context?: string;
}): Promise<{ ok: boolean; error?: string }> {
    const session = await auth();
    if (!session?.user?.id) return { ok: false, error: 'Unauthorized' };

    const r = Math.max(1, Math.min(5, Math.round(input.rating)));

    await prisma.userFeedback.create({
        data: {
            userId: session.user.id,
            rating: r,
            comment: input.comment?.trim() || undefined,
            context: input.context?.slice(0, 500) || undefined,
        },
    });

    // 슈퍼관리자에게 알림 (낮은 점수 즉시 알림)
    if (r <= 2) {
        try {
            const { sendEmail } = await import('@/lib/email/send');
            const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(s => s.trim()).filter(Boolean);
            if (adminEmails.length > 0) {
                await sendEmail({
                    to: adminEmails,
                    subject: `⚠️ 낮은 평점 (${r}/5) 피드백`,
                    html: `<p><strong>${session.user.email}</strong> 님이 ${r}/5 평점을 남겼습니다.</p>
                    <p><strong>코멘트:</strong></p>
                    <blockquote style="border-left: 3px solid #f59e0b; padding-left: 12px; color: #666;">${input.comment || '(코멘트 없음)'}</blockquote>
                    <p><strong>컨텍스트:</strong> ${input.context || '-'}</p>`,
                });
            }
        } catch (e) {
            console.warn('[feedback] admin notify failed', e);
        }
    }

    return { ok: true };
}
