import {
  listOpenCalendarSessionsForGmAdmin,
  listCampaignsForOpenSessionAssignment,
} from "@/app/campaigns/actions";
import { OpenCalendarSessionsGmPanelClient } from "@/components/dashboard/open-calendar-sessions-gm-panel-client";

export async function OpenCalendarSessionsGmPanel({
  gmAdminUsers,
  defaultDmId,
}: {
  gmAdminUsers: { id: string; label: string }[];
  defaultDmId: string | null;
}) {
  const [sessionsRes, campaignsRes] = await Promise.all([
    listOpenCalendarSessionsForGmAdmin(),
    listCampaignsForOpenSessionAssignment(),
  ]);

  if (!sessionsRes.success) {
    return null;
  }

  return (
    <OpenCalendarSessionsGmPanelClient
      sessions={sessionsRes.data ?? []}
      campaigns={campaignsRes.success ? campaignsRes.data ?? [] : []}
      gmAdminUsers={gmAdminUsers}
      defaultDmId={defaultDmId}
    />
  );
}
