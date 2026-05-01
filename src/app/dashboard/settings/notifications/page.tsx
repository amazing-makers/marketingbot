import { getEmailPreferences } from '@/app/actions/userActions';
import NotificationsClient from './NotificationsClient';

export const metadata = {
  title: '알림 설정 | 마케팅봇',
};

export default async function NotificationsPage() {
  const prefs = await getEmailPreferences();
  
  // 기본값 설정 (null인 경우)
  const defaultPrefs = {
    failures: true,
    weekly: true,
    welcome: true,
    ...(prefs || {}),
  };

  return <NotificationsClient initialPrefs={defaultPrefs as any} />;
}
