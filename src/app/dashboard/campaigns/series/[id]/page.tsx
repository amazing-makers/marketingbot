import { getSeriesDetail } from '@/app/actions/seriesActions';
import SeriesDetailClient from './SeriesDetailClient';

export default async function SeriesDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const data = await getSeriesDetail(id);
    return <SeriesDetailClient {...data} />;
}
