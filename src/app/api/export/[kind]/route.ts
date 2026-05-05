import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
    exportCampaignsCsv,
    exportChannelsCsv,
    exportTasksCsv,
    exportInvoicesCsv,
} from '@/app/actions/exportActions';
import dayjs from 'dayjs';

interface PageProps {
    params: Promise<{ kind: string }>;
}

export async function GET(_req: Request, { params }: PageProps) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const { kind } = await params;

    let csv: string;
    let filename: string;

    try {
        switch (kind) {
            case 'campaigns':
                csv = await exportCampaignsCsv();
                filename = `campaigns-${dayjs().format('YYYY-MM-DD')}.csv`;
                break;
            case 'channels':
                csv = await exportChannelsCsv();
                filename = `channels-${dayjs().format('YYYY-MM-DD')}.csv`;
                break;
            case 'tasks':
                csv = await exportTasksCsv();
                filename = `tasks-${dayjs().format('YYYY-MM-DD')}.csv`;
                break;
            case 'invoices':
                csv = await exportInvoicesCsv();
                filename = `invoices-${dayjs().format('YYYY-MM-DD')}.csv`;
                break;
            default:
                return NextResponse.json({ error: 'unknown_kind', supported: ['campaigns', 'channels', 'tasks', 'invoices'] }, { status: 400 });
        }
    } catch (e: any) {
        return NextResponse.json({ error: 'export_failed', message: e?.message }, { status: 500 });
    }

    return new NextResponse(csv, {
        headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${filename}"`,
        },
    });
}
