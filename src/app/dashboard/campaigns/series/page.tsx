import { listSeries } from '@/app/actions/seriesActions';
import SeriesListClient from './SeriesListClient';

export default async function SeriesPage() {
    const items = await listSeries();
    return <SeriesListClient items={items} />;
}
