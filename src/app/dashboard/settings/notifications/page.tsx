import { getEmailPreferences } from '@/app/actions/userActions';
import { listMyNotificationChannels } from '@/app/actions/notificationChannelActions';
import NotificationsClient from './NotificationsClient';

export const metadata = {
  title: '알림 설정 | 마케팅봇',
};

export default async function NotificationsPage() {
  const [prefs, channels] = await Promise.all([
    getEmailPreferences(),
    listMyNotificationChannels().catch(() => []),
  ]);

  const defaultPrefs = {
    failures: true,
    weekly: true,
    welcome: true,
    ...(prefs || {}),
  };

  return (
    <NotificationsClient
      initialPrefs={defaultPrefs as any}
      initialChannels={channels.map(c => ({
        id: c.id,
        type: c.type as 'SLACK' | 'DISCORD',
        webhookUrl: c.webhookUrl,
        label: c.label,
        enabled: c.enabled,
        kindFilter: (c.kindFilter as string[] | null) ?? null,
        lastUsedAt: c.lastUsedAt?.toISOString() || null,
        createdAt: c.createdAt.toISOString(),
      }))}
    />
  );
}
