import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { getTenantAdapter } from "@/modules/command-center/adapters";
import {
  listCampaignsForCommandCenterAction,
  listCommandNotesAction,
  listWorkspacePagesAction,
  listWorkspaceTasksAction,
  listAuditEventsAction,
} from "@/modules/command-center/server/actions";
import { CommandCenterClient } from "@/components/command-center/command-center-client";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CommandCenterPage({ searchParams }: PageProps) {
  const supabase = await createSupabaseServerClient();
  const adapter = getTenantAdapter();
  const access = await adapter.assertCanAccessCommandCenter(supabase);
  if (!access.ok) {
    redirect("/dashboard");
  }

  const sp = (await searchParams) ?? {};
  const campaignIdRaw = typeof sp.campaignId === "string" ? sp.campaignId : null;
  const campaignId = campaignIdRaw?.trim() || null;

  const [notesRes, tasksRes, pagesRes, campaignsRes, auditRes] = await Promise.all([
    listCommandNotesAction(campaignId),
    listWorkspaceTasksAction(campaignId),
    listWorkspacePagesAction(campaignId),
    listCampaignsForCommandCenterAction(),
    listAuditEventsAction(30),
  ]);

  return (
    <CommandCenterClient
      initialNotes={notesRes.success ? notesRes.data ?? [] : []}
      initialTasks={tasksRes.success ? tasksRes.data ?? [] : []}
      initialPages={pagesRes.success ? pagesRes.data ?? [] : []}
      initialAuditEvents={auditRes.success ? auditRes.data ?? [] : []}
      campaigns={campaignsRes.success ? campaignsRes.data ?? [] : []}
      initialCampaignId={campaignId}
    />
  );
}
