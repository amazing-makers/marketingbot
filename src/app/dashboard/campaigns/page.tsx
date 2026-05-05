import { listCampaigns } from "@/app/actions/campaignActions";
import CampaignsListClient from "./CampaignsListClient";

// Next 16 + Mantine 9: Mantine compound components (Table.Thead 등) 가 server
// component 에서 undefined 로 처리됨. server 에서 데이터만 fetch 하고 client
// wrapper 가 UI 렌더 (channels 페이지와 동일한 패턴).
export default async function CampaignsPage() {
    const campaigns = await listCampaigns();
    // Date 객체 직렬화
    const serialized = campaigns.map(c => ({
        id: c.id,
        name: c.name,
        status: c.status,
        scheduledAt: c.scheduledAt ? c.scheduledAt.toISOString() : null,
        createdAt: c.createdAt.toISOString(),
        tags: (c as any).tags || [],
        _count: c._count,
    }));
    return <CampaignsListClient campaigns={serialized} />;
}
