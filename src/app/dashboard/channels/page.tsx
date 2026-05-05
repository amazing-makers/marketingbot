import { listChannels, getChannelBestHours } from "@/app/actions/channelActions";
import ChannelsClient from "./ChannelsClient";

export const dynamic = 'force-dynamic';

export default async function ChannelsPage() {
  const [channels, bestHours] = await Promise.all([
    listChannels(),
    getChannelBestHours().catch(() => ({})),
  ]);

  return (
    <div>
      <ChannelsClient initialChannels={channels} bestHours={bestHours} />
    </div>
  );
}
