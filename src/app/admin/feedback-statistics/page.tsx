import { redirect } from "next/navigation";
import { Star, MessageSquareText, BarChart3 } from "lucide-react";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

function avg(sum: number, count: number): number {
  if (!count) return 0;
  return Math.round((sum / count) * 100) / 100;
}

export default async function AdminFeedbackStatisticsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createSupabaseAdminClient();
  const { data: profileRaw } = await admin.from("profiles").select("role").eq("id", user.id).single();
  const profile = profileRaw as { role?: string } | null;
  if (profile?.role !== "admin") redirect("/dashboard");

  const [{ data: campaignsRaw }, { count: completedSessionsCount }, { data: feedbackRaw }, { data: profilesRaw }, { data: sessionsRaw }] =
    await Promise.all([
      admin.from("campaigns").select("id, name").order("name", { ascending: true }),
      admin.from("sessions").select("id", { count: "exact", head: true }).eq("status", "completed"),
      admin
        .from("session_feedback")
        .select("id, campaign_id, session_id, player_id, session_rating, campaign_rating, comment, created_at")
        .order("created_at", { ascending: false }),
      admin.from("profiles").select("id, display_name, first_name, last_name"),
      admin.from("sessions").select("id, campaign_id, title, scheduled_at"),
    ]);

  const campaigns = (campaignsRaw ?? []) as Array<{ id: string; name: string }>;
  const feedback = (feedbackRaw ?? []) as Array<{
    id: string;
    campaign_id: string;
    session_id: string;
    player_id: string;
    session_rating: number;
    campaign_rating: number;
    comment: string | null;
    created_at: string;
  }>;
  const profiles = (profilesRaw ?? []) as Array<{
    id: string;
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
  }>;
  const sessions = (sessionsRaw ?? []) as Array<{
    id: string;
    campaign_id: string;
    title: string | null;
    scheduled_at: string;
  }>;

  const campaignNameById = new Map(campaigns.map((c) => [c.id, c.name]));
  const sessionById = new Map(sessions.map((s) => [s.id, s]));
  const playerNameById = new Map(
    profiles.map((p) => {
      const full = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
      return [p.id, full || p.display_name || "Giocatore"];
    })
  );

  const totalFeedback = feedback.length;
  const totalSessionStars = feedback.reduce((sum, f) => sum + f.session_rating, 0);
  const totalCampaignStars = feedback.reduce((sum, f) => sum + f.campaign_rating, 0);
  const globalSessionAvg = avg(totalSessionStars, totalFeedback);
  const globalCampaignAvg = avg(totalCampaignStars, totalFeedback);
  const globalCombinedAvg = avg(totalSessionStars + totalCampaignStars, totalFeedback * 2);

  const campaignStatsMap = new Map<
    string,
    { campaignId: string; campaignName: string; count: number; sessionSum: number; campaignSum: number }
  >();
  for (const item of feedback) {
    const key = item.campaign_id;
    const prev = campaignStatsMap.get(key) ?? {
      campaignId: key,
      campaignName: campaignNameById.get(key) ?? "Campagna",
      count: 0,
      sessionSum: 0,
      campaignSum: 0,
    };
    prev.count += 1;
    prev.sessionSum += item.session_rating;
    prev.campaignSum += item.campaign_rating;
    campaignStatsMap.set(key, prev);
  }
  const campaignStats = Array.from(campaignStatsMap.values())
    .map((row) => ({
      ...row,
      sessionAvg: avg(row.sessionSum, row.count),
      campaignAvg: avg(row.campaignSum, row.count),
    }))
    .sort((a, b) => b.count - a.count || a.campaignName.localeCompare(b.campaignName));

  return (
    <div className="min-w-0 p-4 py-10 md:p-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <header className="space-y-1">
          <h1 className="flex items-center gap-2 text-xl font-semibold text-barber-paper sm:text-2xl">
            <BarChart3 className="h-6 w-6 text-barber-gold" />
            Statistiche e Feedback
          </h1>
          <p className="text-sm text-barber-paper/70">
            Dashboard qualità campagne: rating sessione/campagna, feedback testuali e metriche globali.
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl border border-barber-gold/30 bg-barber-dark/80 p-4">
            <p className="text-xs text-barber-paper/60">Media sessione</p>
            <p className="mt-1 text-2xl font-semibold text-barber-gold">{globalSessionAvg.toFixed(2)} ⭐</p>
          </div>
          <div className="rounded-xl border border-barber-gold/30 bg-barber-dark/80 p-4">
            <p className="text-xs text-barber-paper/60">Media campagna</p>
            <p className="mt-1 text-2xl font-semibold text-barber-gold">{globalCampaignAvg.toFixed(2)} ⭐</p>
          </div>
          <div className="rounded-xl border border-barber-gold/30 bg-barber-dark/80 p-4">
            <p className="text-xs text-barber-paper/60">Media globale</p>
            <p className="mt-1 text-2xl font-semibold text-barber-gold">{globalCombinedAvg.toFixed(2)} ⭐</p>
          </div>
          <div className="rounded-xl border border-barber-gold/30 bg-barber-dark/80 p-4">
            <p className="text-xs text-barber-paper/60">Campagne attive</p>
            <p className="mt-1 text-2xl font-semibold text-barber-gold">{campaigns.length}</p>
          </div>
          <div className="rounded-xl border border-barber-gold/30 bg-barber-dark/80 p-4">
            <p className="text-xs text-barber-paper/60">Sessioni totali giocate</p>
            <p className="mt-1 text-2xl font-semibold text-barber-gold">{completedSessionsCount ?? 0}</p>
          </div>
        </section>

        <section className="rounded-xl border border-barber-gold/30 bg-barber-dark/80 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-barber-gold">
            <Star className="h-4 w-4" />
            Media stelle per campagna
          </h2>
          {campaignStats.length === 0 ? (
            <p className="text-sm text-barber-paper/60">Nessun feedback disponibile.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-barber-gold/20 text-left text-barber-paper/70">
                    <th className="py-2 pr-4">Campagna</th>
                    <th className="py-2 pr-4">Media Sessione</th>
                    <th className="py-2 pr-4">Media Campagna</th>
                    <th className="py-2 pr-4">Numero feedback</th>
                  </tr>
                </thead>
                <tbody>
                  {campaignStats.map((row) => (
                    <tr key={row.campaignId} className="border-b border-barber-gold/10 text-barber-paper/90">
                      <td className="py-2 pr-4">{row.campaignName}</td>
                      <td className="py-2 pr-4">{row.sessionAvg.toFixed(2)} ⭐</td>
                      <td className="py-2 pr-4">{row.campaignAvg.toFixed(2)} ⭐</td>
                      <td className="py-2 pr-4">{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-barber-gold/30 bg-barber-dark/80 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-barber-gold">
            <MessageSquareText className="h-4 w-4" />
            Feedback ricevuti
          </h2>
          {feedback.length === 0 ? (
            <p className="text-sm text-barber-paper/60">Nessun feedback testuale disponibile.</p>
          ) : (
            <div className="space-y-3">
              {feedback.map((item) => {
                const campaignName = campaignNameById.get(item.campaign_id) ?? "Campagna";
                const sessionRow = sessionById.get(item.session_id);
                const sessionLabel = sessionRow?.title?.trim() || "Sessione";
                const playerName = playerNameById.get(item.player_id) ?? "Giocatore";
                return (
                  <div key={item.id} className="rounded-lg border border-barber-gold/20 bg-barber-dark/60 p-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-barber-paper/70">
                      <span className="font-medium text-barber-gold">{campaignName}</span>
                      <span>·</span>
                      <span>{sessionLabel}</span>
                      <span>·</span>
                      <span>{playerName}</span>
                      <span>·</span>
                      <span>Sessione {item.session_rating}⭐</span>
                      <span>·</span>
                      <span>Campagna {item.campaign_rating}⭐</span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-barber-paper/90">
                      {item.comment?.trim() || "Nessun commento testuale."}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
