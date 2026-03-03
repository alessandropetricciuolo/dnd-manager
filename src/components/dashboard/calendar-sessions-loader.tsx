import { startOfMonth } from "date-fns";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { SessionCalendar, type SessionForCalendar } from "./session-calendar";

export async function CalendarSessionsLoader() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const fromDate = startOfMonth(new Date()).toISOString();

  const { data: sessionsRaw } = await supabase
    .from("sessions")
    .select("id, scheduled_at, title, campaign_id, dm_id, max_players, status, campaigns(name, type, image_url)")
    .gte("scheduled_at", fromDate)
    .eq("status", "scheduled")
    .order("scheduled_at", { ascending: true });

  if (!sessionsRaw?.length) {
    return (
      <SessionCalendar
        sessions={[]}
      />
    );
  }

  const dmIds = [...new Set((sessionsRaw as { dm_id?: string | null }[]).map((s) => s.dm_id).filter(Boolean))] as string[];
  let dmNames: Map<string, string> = new Map();
  if (dmIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, display_name")
      .in("id", dmIds);
    (profiles ?? []).forEach((p) => {
      const name = [p.first_name, p.last_name].filter(Boolean).join(" ").trim() || p.display_name?.trim() || "";
      dmNames.set(p.id, name || `Utente ${p.id.slice(0, 8)}`);
    });
  }

  const sessionIds = sessionsRaw.map((s) => s.id);
  const { data: signups } = await supabase
    .from("session_signups")
    .select("session_id")
    .in("session_id", sessionIds);

  const signupCountBySession = new Map<string, number>();
  (signups ?? []).forEach((s) => {
    signupCountBySession.set(s.session_id, (signupCountBySession.get(s.session_id) ?? 0) + 1);
  });

  const sessions: SessionForCalendar[] = sessionsRaw.map((s) => {
    const campaign = s.campaigns as { name: string; type: string | null; image_url: string | null } | null;
    return {
      id: s.id,
      campaign_id: s.campaign_id,
      scheduled_at: s.scheduled_at,
      title: s.title ?? null,
      campaign_name: campaign?.name ?? "—",
      campaign_type: campaign?.type && ["oneshot", "quest", "long"].includes(campaign.type)
        ? (campaign.type as "oneshot" | "quest" | "long")
        : null,
      campaign_image_url: campaign?.image_url ?? null,
      dm_name: (s as { dm_id?: string | null }).dm_id
        ? dmNames.get((s as { dm_id: string }).dm_id) ?? null
        : null,
      max_players: s.max_players ?? 6,
      signup_count: signupCountBySession.get(s.id) ?? 0,
      status: s.status,
    };
  });

  return <SessionCalendar sessions={sessions} />;
}
