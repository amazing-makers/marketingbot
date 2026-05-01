import { listChannels } from "@/app/actions/channelActions";
import ChannelsClient from "./ChannelsClient";

export default async function ChannelsPage() {
  const channels = await listChannels();
  
  return (
    <div>
      <ChannelsClient initialChannels={channels} />
    </div>
  );
}
