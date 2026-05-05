import {
  listOpenCalendarSessionsForGmAdmin,
  listCampaignsForOpenSessionAssignment,
} from "@/app/campaigns/actions";
import { OpenCalendarSessionsGmPanelClient } from "@/components/dashboard/open-calendar-sessions-gm-panel-client";

export async function OpenCalendarSessionsGmPanel() {
  const [sessionsRes, campaignsRes] = await Promise.all([
    listOpenCalendarSessionsForGmAdmin(),
    listCampaignsForOpenSessionAssignment(),
  ]);

  if (!sessionsRes.success || !sessionsRes.data?.length) {
    return null;
  }

  return (
    <OpenCalendarSessionsGmPanelClient
      sessions={sessionsRes.data}
      campaigns={campaignsRes.success ? campaignsRes.data ?? [] : []}
    />
  );
}
