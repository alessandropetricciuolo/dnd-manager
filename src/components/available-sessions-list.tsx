import { createSupabaseServerClient } from "@/utils/supabase/server";
import { AvailableSessionsListClient } from "@/components/available-sessions-list-client";

export type AvailableSessionRow = {
  sessionId: string;
  campaignId: string | null;
  campaignName: string;
  scheduledAt: string;
  notes: string | null;
  /** null = non iscritto, altrimenti stato iscrizione */
  mySignupStatus: string | null;
};

export async function AvailableSessionsList() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "gm" || profile?.role === "admin") {
    return null;
  }

  const { data: memberRows } = await supabase
    .from("campaign_members")
    .select("campaign_id")
    .eq("player_id", user.id);
  const myCampaignIds = (memberRows ?? []).map((r) => r.campaign_id);

  const campaignQuery = supabase.from("campaigns").select("id, name").order("name");
  const { data: campaigns } =
    myCampaignIds.length > 0
      ? await campaignQuery.or(`is_public.eq.true,id.in.(${myCampaignIds.join(",")})`)
      : await campaignQuery.eq("is_public", true);

  const campaignList = campaigns ?? [];
  const campaignIds = campaignList.map((c) => c.id);
  const campaignByName = new Map(campaignList.map((c) => [c.id, c.name]));

  const now = new Date().toISOString();

  let sessionsFromCampaigns: Array<{
    id: string;
    campaign_id: string | null;
    scheduled_at: string;
    notes: string | null;
  }> = [];

  if (campaignIds.length > 0) {
    const { data } = await supabase
      .from("sessions")
      .select("id, campaign_id, scheduled_at, notes")
      .in("campaign_id", campaignIds)
      .eq("status", "scheduled")
      .gte("scheduled_at", now)
      .order("scheduled_at", { ascending: true });
    sessionsFromCampaigns = data ?? [];
  }

  const { data: openSessionsRaw } = await supabase
    .from("sessions")
    .select("id, campaign_id, scheduled_at, notes")
    .is("campaign_id", null)
    .eq("status", "scheduled")
    .gte("scheduled_at", now)
    .order("scheduled_at", { ascending: true });

  const openSessions = openSessionsRaw ?? [];

  const mergedById = new Map<
    string,
    { id: string; campaign_id: string | null; scheduled_at: string; notes: string | null }
  >();
  for (const s of sessionsFromCampaigns) {
    mergedById.set(s.id, s);
  }
  for (const s of openSessions) {
    if (!mergedById.has(s.id)) mergedById.set(s.id, s);
  }

  const sessions = [...mergedById.values()].sort((a, b) =>
    a.scheduled_at.localeCompare(b.scheduled_at)
  );

  if (!sessions.length) {
    return (
      <div className="rounded-xl border border-emerald-700/40 bg-slate-950/60 px-6 py-8 text-center text-slate-400">
        Nessuna sessione o evento in programma al momento. Controlla il calendario sopra o torna più tardi.
      </div>
    );
  }

  const sessionIds = sessions.map((s) => s.id);
  const { data: mySignups } = await supabase
    .from("session_signups")
    .select("session_id, status")
    .eq("player_id", user.id)
    .in("session_id", sessionIds);

  const signupBySession = new Map((mySignups ?? []).map((s) => [s.session_id, s.status]));

  const rows: AvailableSessionRow[] = sessions.map((s) => {
    const cid = s.campaign_id as string | null;
    return {
      sessionId: s.id,
      campaignId: cid,
      campaignName: cid ? (campaignByName.get(cid) ?? "Campagna") : "Evento (campagna da definire)",
      scheduledAt: s.scheduled_at,
      notes: s.notes ?? null,
      mySignupStatus: signupBySession.get(s.id) ?? null,
    };
  });

  return <AvailableSessionsListClient rows={rows} />;
}
