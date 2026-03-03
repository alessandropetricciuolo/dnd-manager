import { createSupabaseServerClient } from "@/utils/supabase/server";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { AvailableSessionsListClient } from "@/components/available-sessions-list-client";

export type AvailableSessionRow = {
  sessionId: string;
  campaignId: string;
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

  const campaignQuery = supabase
    .from("campaigns")
    .select("id, name")
    .order("name");
  const { data: campaigns } = myCampaignIds.length > 0
    ? await campaignQuery.or(`is_public.eq.true,id.in.(${myCampaignIds.join(",")})`)
    : await campaignQuery.eq("is_public", true);

  if (!campaigns?.length) {
    return (
      <div className="rounded-xl border border-emerald-700/40 bg-slate-950/60 px-6 py-8 text-center text-slate-400">
        Nessuna campagna disponibile. Unisciti a una campagna pubblica o attendi un invito.
      </div>
    );
  }

  const campaignIds = campaigns.map((c) => c.id);
  const now = new Date().toISOString();
  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, campaign_id, scheduled_at, notes")
    .in("campaign_id", campaignIds)
    .eq("status", "scheduled")
    .gte("scheduled_at", now)
    .order("scheduled_at", { ascending: true });

  if (!sessions?.length) {
    return (
      <div className="rounded-xl border border-emerald-700/40 bg-slate-950/60 px-6 py-8 text-center text-slate-400">
        Nessuna sessione in programma al momento. Torna più tardi o controlla le campagne.
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
  const campaignByName = new Map(campaigns.map((c) => [c.id, c.name]));

  const rows: AvailableSessionRow[] = sessions.map((s) => ({
    sessionId: s.id,
    campaignId: s.campaign_id,
    campaignName: campaignByName.get(s.campaign_id) ?? "Campagna",
    scheduledAt: s.scheduled_at,
    notes: s.notes ?? null,
    mySignupStatus: signupBySession.get(s.id) ?? null,
  }));

  return <AvailableSessionsListClient rows={rows} />;
}
