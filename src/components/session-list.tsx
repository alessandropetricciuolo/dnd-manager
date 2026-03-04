import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { SessionListClient, type SessionWithSignups } from "@/components/session-list-client";

type SessionListProps = {
  campaignId: string;
};

function getPlayerName(p: { first_name?: string | null; last_name?: string | null; display_name?: string | null }) {
  const full = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
  return full || p.display_name || "Giocatore";
}

export async function SessionList({ campaignId }: SessionListProps) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return (
      <p className="text-sm text-barber-paper/70">Accedi per vedere le sessioni.</p>
    );
  }

  // Ruolo letto con client admin per evitare blocchi RLS (es. ricorsione su profiles)
  const admin = createSupabaseAdminClient();
  const { data: profileRaw } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const profile = profileRaw as { role?: string } | null;

  /** Modello Guild: lista iscritti e bottoni Approva/Rifiuta visibili a chi ha ruolo gm o admin. */
  const isGmOrAdmin = profile?.role === "gm" || profile?.role === "admin";

  /** Per GM/Admin usiamo il client admin così sessioni e iscrizioni sono sempre visibili (bypass RLS). */
  const dataClient = isGmOrAdmin ? admin : supabase;

  const { data: sessions, error } = await dataClient
    .from("sessions")
    .select("id, scheduled_at, notes, status, dm_id")
    .eq("campaign_id", campaignId)
    .in("status", ["scheduled"])
    .order("scheduled_at", { ascending: true });

  if (error) {
    return (
      <p className="text-sm text-red-400">
        Errore nel caricamento delle sessioni.
      </p>
    );
  }

  if (!sessions?.length) {
    return (
      <p className="rounded-xl border border-barber-gold/30 bg-barber-dark/80 px-6 py-8 text-center text-barber-paper/70">
        Nessuna sessione in programma.
      </p>
    );
  }

  const sessionIds = sessions.map((s) => s.id);
  const { data: signups } = await dataClient
    .from("session_signups")
    .select("id, session_id, player_id, status")
    .in("session_id", sessionIds);

  const playerIds = [...new Set((signups ?? []).map((s) => s.player_id))];
  let profiles: { id: string; first_name: string | null; last_name: string | null; display_name: string | null }[] = [];
  if (playerIds.length > 0) {
    const res = await dataClient.from("profiles").select("id, first_name, last_name, display_name").in("id", playerIds);
    profiles = res.data ?? [];
  }

  const profileMap = new Map(profiles.map((p) => [p.id, getPlayerName(p)]));

  const dmIds = [...new Set((sessions ?? []).map((s) => (s as { dm_id?: string | null }).dm_id).filter(Boolean))] as string[];
  let dmProfiles: { id: string; first_name: string | null; last_name: string | null; display_name: string | null }[] = [];
  if (dmIds.length > 0) {
    const res = await dataClient.from("profiles").select("id, first_name, last_name, display_name").in("id", dmIds);
    dmProfiles = res.data ?? [];
  }
  const dmNameMap = new Map(dmProfiles.map((p) => [p.id, getPlayerName(p)]));

  const signupsWithNames = (signups ?? []).map((s) => ({
    id: s.id,
    session_id: s.session_id,
    player_id: s.player_id,
    status: s.status,
    player_name: profileMap.get(s.player_id) ?? "Giocatore",
  }));

  const signupsBySession = new Map<string, typeof signupsWithNames>();
  for (const s of signupsWithNames) {
    const list = signupsBySession.get(s.session_id) ?? [];
    list.push(s);
    signupsBySession.set(s.session_id, list);
  }

  /** Player: vede solo partecipanti confermati (attended/approved) o se stesso se pending. GM/Admin: vedono tutti. */
  const visibleSignupsForSession = (sessionId: string) => {
    const list = signupsBySession.get(sessionId) ?? [];
    if (isGmOrAdmin) return list;
    return list.filter(
      (s) =>
        s.status === "attended" ||
        s.status === "approved" ||
        (s.player_id === user.id && (s.status === "pending" || s.status === "confirmed" || s.status === "waitlist"))
    );
  };

  /** Per la card sessione: stato iscrizione dell'utente corrente (null = non iscritto). */
  const currentUserSignupStatus = (sessionId: string): string | null => {
    const list = signupsBySession.get(sessionId) ?? [];
    const mine = list.find((s) => s.player_id === user.id);
    return mine?.status ?? null;
  };

  const sessionsWithSignups: SessionWithSignups[] = sessions.map((s) => {
    const dmId = (s as { dm_id?: string | null }).dm_id;
    return {
      id: s.id,
      scheduled_at: s.scheduled_at,
      notes: s.notes ?? null,
      status: s.status,
      dm_id: dmId ?? null,
      dm_name: dmId ? dmNameMap.get(dmId) ?? null : null,
      signups: visibleSignupsForSession(s.id),
      currentUserSignupStatus: currentUserSignupStatus(s.id),
    };
  });

  return (
    <SessionListClient
      sessions={sessionsWithSignups}
      isGmOrAdmin={!!isGmOrAdmin}
      campaignId={campaignId}
    />
  );
}
