import { createSupabaseServerClient } from "@/utils/supabase/server";
import { format, startOfDay, isBefore } from "date-fns";
import { it } from "date-fns/locale";
import { MySessionsListClient } from "@/components/my-sessions-list-client";

type SessionRow = {
  id: string;
  campaign_name: string;
  scheduled_at: string;
  location: string | null;
  session_title: string | null;
  session_status: string;
};

export async function MySessionsList() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: signups } = await supabase
    .from("session_signups")
    .select(
      `
      id,
      session_id,
      status,
      sessions (
        id,
        scheduled_at,
        title,
        location,
        status,
        campaigns (
          name
        )
      )
    `
    )
    .eq("player_id", user.id)
    .in("status", ["pending", "approved", "attended"]);

  const today = startOfDay(new Date());

  const rows: SessionRow[] = (signups ?? [])
    .map((s) => {
      const session = s.sessions as unknown as {
        id: string;
        scheduled_at: string;
        title: string | null;
        location: string | null;
        status: string;
        campaigns: { name: string } | null;
      } | null;
      if (!session?.campaigns) return null;
      return {
        id: session.id,
        campaign_name: session.campaigns.name,
        scheduled_at: session.scheduled_at,
        location: session.location,
        session_title: session.title,
        session_status: session.status ?? "scheduled",
      };
    })
    .filter((r): r is SessionRow => r != null);

  const isUpcoming = (r: SessionRow) => {
    const sessionDate = startOfDay(new Date(r.scheduled_at));
    const notPast = !isBefore(sessionDate, today);
    return notPast && r.session_status === "scheduled";
  };
  const isHistory = (r: SessionRow) => {
    if (r.session_status === "completed" || r.session_status === "cancelled") return true;
    return isBefore(new Date(r.scheduled_at), today);
  };

  const inProgramma = rows
    .filter(isUpcoming)
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
  const storico = rows
    .filter(isHistory)
    .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());

  const formatDate = (iso: string) => format(new Date(iso), "dd MMMM yyyy", { locale: it });

  const inProgrammaWithDate = inProgramma.map((r) => ({ ...r, formatted_date: formatDate(r.scheduled_at) }));
  const storicoWithDate = storico.map((r) => ({ ...r, formatted_date: formatDate(r.scheduled_at) }));

  return (
    <MySessionsListClient
      inProgramma={inProgrammaWithDate}
      storico={storicoWithDate}
    />
  );
}
