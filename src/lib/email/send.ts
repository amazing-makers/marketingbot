import { Resend } from 'resend';
import { env } from '@/lib/env';

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export async function sendEmail(opts: {
    to: string | string[];
    subject: string;
    html?: string;
    react?: any;  // React Email component
    replyTo?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!resend) {
        console.warn('[Email] RESEND_API_KEY not configured, skipping email');
        return { success: false, error: 'RESEND_API_KEY not configured' };
    }
    
    try {
        const result = await resend.emails.send({
            from: env.RESEND_FROM_EMAIL,
            to: Array.isArray(opts.to) ? opts.to : [opts.to],
            subject: opts.subject,
            html: opts.html,
            react: opts.react,
            replyTo: opts.replyTo,
        });
        
        if (result.error) {
            console.error('[Email] API Error:', result.error);
            return { success: false, error: result.error.message };
        }

        return { success: true, messageId: result.data?.id };
    } catch (err: any) {
        console.error('[Email] Send failed:', err);
        return { success: false, error: err.message };
    }
}
