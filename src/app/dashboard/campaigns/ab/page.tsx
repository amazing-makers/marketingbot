import AbTestClient from './AbTestClient';
import { listChannels } from '@/app/actions/channelActions';

export default async function AbTestPage() {
    const channels = await listChannels();
    return (
        <AbTestClient
            channels={channels.map(c => ({
                id: c.id,
                type: c.type,
                accountName: c.accountName,
                language: (c as any).language,
                region: (c as any).region,
            }))}
        />
    );
}
