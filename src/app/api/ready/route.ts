import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        await prisma.$queryRaw`SELECT 1`;
        return NextResponse.json({
            status: 'ready',
            db: 'connected',
            timestamp: new Date().toISOString(),
        });
    } catch (err: any) {
        console.error("Health check failed:", err);
        return NextResponse.json({
            status: 'not-ready',
            db: 'disconnected',
            error: err.message,
        }, { status: 503 });
    }
}
