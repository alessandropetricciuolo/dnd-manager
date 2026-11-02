import { useEffect } from 'react';
import { createNavigationContainerRef } from '@react-navigation/native';
import { useCampaign } from '../contexts/CampaignContext';
import { useAuth } from '../contexts/AuthContext';
import { usePushNotifications } from '../contexts/PushNotificationsContext';

export const mobileNavigationRef = createNavigationContainerRef<any>();

export function PushNotificationRouter() {
  const { campaigns, selectCampaign, isLoading } = useCampaign();
  const { role, activeMode } = useAuth();
  const { notificationTarget: target, consumeTarget, navigationReady } = usePushNotifications();
  useEffect(() => {
    if (!target || isLoading || !navigationReady || !mobileNavigationRef.isReady()) return;
    if (!campaigns.some(c => c.id === target.campaignId)) { consumeTarget(); return; }
    let cancelled = false;
    void Promise.resolve(selectCampaign(target.campaignId)).then(() => {
      if (cancelled) return;
      const gm = (role === 'gm' || role === 'admin') && activeMode === 'gm';
      if (target.kind === 'whisper') {
        mobileNavigationRef.navigate(gm ? 'GmTabs' : 'PlayerTabs', {
          screen: gm ? 'GmWhispers' : 'PlayerWhisper',
        });
      } else {
        mobileNavigationRef.navigate(
          gm ? 'GmXpAttendance' : 'Sessions',
          target.sessionId ? { notificationSessionId: target.sessionId } : undefined
        );
      }
      consumeTarget();
    });
    return () => { cancelled = true; };
  }, [target, isLoading, campaigns, role, activeMode, selectCampaign, consumeTarget, navigationReady]);
  return null;
}
