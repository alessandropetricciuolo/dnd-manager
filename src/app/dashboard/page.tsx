import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  Terminal,
  Shield,
  Calendar,
  Compass,
  ScrollText,
  MapPin,
  Clock,
  Swords,
  Trophy,
  ChevronRight,
  Flame,
  Award,
} from "lucide-react";
import { it } from "date-fns/locale";
import { formatSessionInRome } from "@/lib/session-datetime";

import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { CampaignList } from "@/components/campaign-list";
import { MySessionsList } from "@/components/my-sessions-list";
import { CalendarSessionsLoader } from "@/components/dashboard/calendar-sessions-loader";
import { GmAdminSessionHistorySection } from "@/components/dashboard/gm-admin-session-history-section";
import { CreateOpenCalendarEventDialog } from "@/components/dashboard/create-open-calendar-event-dialog";
import { OpenCalendarSessionsGmPanel } from "@/components/dashboard/open-calendar-sessions-gm-panel";
import { DashboardWarRoomTabs } from "@/components/dashboard/dashboard-war-room-tabs";

export const dynamic = "force-dynamic";

function CampaignListFallback() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="card-guild-stone rounded-2xl border border-brass-base/30 p-5 overflow-hidden animate-pulse"
        >
          <div className="aspect-[3/2] w-full rounded-xl bg-guild-stone/80" />
          <div className="mt-4 space-y-2">
            <div className="h-5 w-3/4 rounded bg-guild-stone/80" />
            <div className="h-4 w-full rounded bg-guild-stone/80" />
            <div className="h-4 w-2/3 rounded bg-guild-stone/80" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, first_name, last_name, nickname, avatar_url")
    .eq("id", user.id)
    .single();

  const displayName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    profile?.nickname ||
    user.email?.split("@")[0] ||
    "Avventuriero";

  const isGmOrAdmin = profile?.role === "gm" || profile?.role === "admin";
  const isAdmin = profile?.role === "admin";

  // Vitals & Stats
  const { count: attendedCount } = await supabase
    .from("session_signups")
    .select("id", { count: "exact", head: true })
    .eq("player_id", user.id)
    .eq("status", "attended");

  let myCampaignsCount = 0;
  if (isGmOrAdmin) {
    const { count } = await supabase
      .from("campaigns")
      .select("id", { count: "exact", head: true })
      .eq("gm_id", user.id);
    myCampaignsCount = count ?? 0;
  } else {
    const { count } = await supabase
      .from("campaign_members")
      .select("id", { count: "exact", head: true })
      .eq("player_id", user.id);
    myCampaignsCount = count ?? 0;
  }

  const { count: totalCampaignsCount } = await supabase
    .from("campaigns")
    .select("id", { count: "exact", head: true });

  // Spotlight Next Session
  let nextSession: {
    id: string;
    campaignId: string;
    campaignName: string;
    title: string | null;
    location: string | null;
    scheduledAt: string;
    isGm: boolean;
  } | null = null;

  const nowIso = new Date(Date.now() - 2 * 3600 * 1000).toISOString();

  if (isGmOrAdmin) {
    const { data: gmSessions } = await supabase
      .from("sessions")
      .select(`
        id,
        scheduled_at,
        title,
        location,
        status,
        campaign_id,
        campaigns (
          id,
          name
        )
      `)
      .eq("gm_id", user.id)
      .gte("scheduled_at", nowIso)
      .order("scheduled_at", { ascending: true })
      .limit(1);

    if (gmSessions && gmSessions.length > 0) {
      const s = gmSessions[0];
      const camp = s.campaigns as unknown as { id: string; name: string } | null;
      nextSession = {
        id: s.id,
        campaignId: s.campaign_id,
        campaignName: camp?.name ?? "Campagna senza nome",
        title: s.title,
        location: s.location,
        scheduledAt: s.scheduled_at,
        isGm: true,
      };
    }
  }

  if (!nextSession) {
    const { data: playerSignups } = await supabase
      .from("session_signups")
      .select(`
        id,
        session_id,
        status,
        sessions (
          id,
          scheduled_at,
          title,
          location,
          status,
          campaign_id,
          campaigns (
            id,
            name
          )
        )
      `)
      .eq("player_id", user.id)
      .in("status", ["pending", "approved"])
      .limit(10);

    const upcomingSignups = (playerSignups ?? [])
      .map((ps) => ps.sessions as unknown as {
        id: string;
        scheduled_at: string;
        title: string | null;
        location: string | null;
        status: string;
        campaign_id: string;
        campaigns: { id: string; name: string } | null;
      })
      .filter((s) => s && s.scheduled_at >= nowIso)
      .sort((a, b) => (a.scheduled_at > b.scheduled_at ? 1 : -1));

    if (upcomingSignups.length > 0) {
      const s = upcomingSignups[0];
      nextSession = {
        id: s.id,
        campaignId: s.campaign_id,
        campaignName: s.campaigns?.name ?? "Campagna senza nome",
        title: s.title,
        location: s.location,
        scheduledAt: s.scheduled_at,
        isGm: false,
      };
    }
  }

  let gmAdminUsers: { id: string; label: string }[] = [];
  if (isGmOrAdmin) {
    try {
      const admin = createSupabaseAdminClient();
      const { data: gmAdminsRaw } = await admin
        .from("profiles")
        .select("id, first_name, last_name, display_name")
        .in("role", ["gm", "admin"])
        .order("first_name");
      type GmProfileRow = {
        id: string;
        first_name: string | null;
        last_name: string | null;
        display_name: string | null;
      };
      const gmAdmins = (gmAdminsRaw ?? []) as GmProfileRow[];
      gmAdminUsers = gmAdmins.map((p) => {
        const full = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
        const label = full || p.display_name?.trim() || `Utente ${p.id.slice(0, 8)}`;
        return { id: p.id, label };
      });
    } catch (e) {
      console.error("[dashboard] lista GM/Admin", e);
    }
  }

  const roleTitle = isAdmin
    ? "Gran Maestro Supremo"
    : isGmOrAdmin
    ? "Gran Maestro di Gilda"
    : (attendedCount ?? 0) >= 15
    ? "Veterano Leggendario"
    : (attendedCount ?? 0) >= 5
    ? "Guerriero Esperto"
    : "Eroe della Locanda";

  return (
    <div className="min-h-full w-full bg-guild-void text-parchment-100 font-sans p-4 md:p-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        
        {/* WAR-ROOM HERO DOSSIER: Passaporto dell'Avventuriero & Plancia Live */}
        <section className="card-guild-stone relative overflow-hidden rounded-3xl border-2 border-brass-base/40 p-6 md:p-8 shadow-2xl">
          <div className="corner-ornament-tl" />
          <div className="corner-ornament-tr" />
          <div className="corner-ornament-bl" />
          <div className="corner-ornament-br" />

          <div className="relative z-10 flex flex-col lg:flex-row items-stretch justify-between gap-6">
            
            {/* Left: Adventurer Dossier */}
            <div className="flex-1 space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-brass-base/40 bg-guild-oak/90 px-3.5 py-1 text-[11px] font-serif uppercase tracking-[0.2em] text-brass-light shadow-sm">
                <Flame className="h-3 w-3 text-brass-base" />
                <span>Tavolo Strategico · {roleTitle}</span>
              </div>

              <div>
                <h1 className="font-serif text-3xl font-extrabold tracking-tight text-gold-relief sm:text-4xl md:text-5xl">
                  Salute, {displayName}
                </h1>
                <p className="mt-1.5 text-sm text-parchment-300 max-w-xl leading-relaxed">
                  {isGmOrAdmin
                    ? "La plancia di comando della locanda è pronta. Consulta i tavoli aperti, gestisci le cronache e guida gli avventurieri nella mischia."
                    : "Benvenuto nel cuore operativo della gilda. Controlla le tue prossime sessioni, sfoglia le saghe in corso e rispondi alla chiamata alle armi."}
                </p>
              </div>

              {/* Vitals Ribbon */}
              <div className="grid grid-cols-3 gap-3 pt-2 max-w-md">
                <div className="rounded-xl border border-brass-base/20 bg-guild-stone/70 p-3 text-center shadow-inner">
                  <div className="flex items-center justify-center gap-1.5 text-[10px] font-serif uppercase tracking-wider text-brass-base">
                    <Swords className="h-3 w-3" />
                    <span>Saghe</span>
                  </div>
                  <div className="mt-1 font-serif text-2xl font-bold text-parchment-100">
                    {myCampaignsCount}
                  </div>
                </div>

                <div className="rounded-xl border border-brass-base/20 bg-guild-stone/70 p-3 text-center shadow-inner">
                  <div className="flex items-center justify-center gap-1.5 text-[10px] font-serif uppercase tracking-wider text-brass-base">
                    <Shield className="h-3 w-3" />
                    <span>Presenze</span>
                  </div>
                  <div className="mt-1 font-serif text-2xl font-bold text-parchment-100">
                    {attendedCount ?? 0}
                  </div>
                </div>

                <div className="rounded-xl border border-brass-base/20 bg-guild-stone/70 p-3 text-center shadow-inner">
                  <div className="flex items-center justify-center gap-1.5 text-[10px] font-serif uppercase tracking-wider text-brass-base">
                    <Trophy className="h-3 w-3" />
                    <span>Rango</span>
                  </div>
                  <div className="mt-1 font-serif text-sm font-bold text-brass-light truncate">
                    {(attendedCount ?? 0) >= 10 ? "Veterano" : (attendedCount ?? 0) >= 4 ? "Guerriero" : "Recluta"}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Spotlight Prossima Sessione */}
            <div className="w-full lg:w-96 flex flex-col justify-between rounded-2xl border border-brass-base/30 bg-guild-oak/80 p-5 shadow-inner backdrop-blur-sm">
              <div className="flex items-center justify-between border-b border-brass-base/20 pb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-brass-light" />
                  <span className="font-serif text-xs font-bold uppercase tracking-wider text-brass-light">
                    Prossima Convocazione
                  </span>
                </div>
                {nextSession && (
                  <span className="rounded-full border border-emerald-500/40 bg-emerald-950/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300">
                    {nextSession.isGm ? "Guida Master" : "Confermata"}
                  </span>
                )}
              </div>

              {nextSession ? (
                <div className="py-3 space-y-2">
                  <p className="text-[10px] font-serif uppercase tracking-widest text-brass-base">
                    ✦ {nextSession.campaignName}
                  </p>
                  <h3 className="font-serif text-lg font-bold text-parchment-100 leading-snug">
                    {nextSession.title || "Sessione di Gioco"}
                  </h3>
                  <div className="space-y-1 text-xs text-parchment-300">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-brass-base shrink-0" />
                      <span className="capitalize">
                        {formatSessionInRome(nextSession.scheduledAt, "EEEE d MMMM · HH:mm", { locale: it })}
                      </span>
                    </div>
                    {nextSession.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-brass-base shrink-0" />
                        <span>{nextSession.location}</span>
                      </div>
                    )}
                  </div>
                  <div className="pt-2">
                    <Link
                      href={`/campaigns/${nextSession.campaignId}`}
                      className="btn-wax-seal flex w-full items-center justify-center gap-2 rounded-xl py-2 text-xs font-serif font-bold uppercase tracking-wider shadow-md transition-all hover:scale-[1.02]"
                    >
                      <span>Apri Tavolo di Gioco</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="py-4 text-center space-y-2">
                  <p className="text-xs text-parchment-300 leading-relaxed">
                    Nessuna convocazione imminente al tavolo. Consulta il calendario per unirti a una sessione aperta!
                  </p>
                  <div className="pt-2">
                    <Link
                      href="/scopri"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-brass-base/50 bg-guild-stone px-3.5 py-1.5 text-xs font-serif font-bold text-brass-light hover:bg-brass-base/20 transition-all"
                    >
                      <span>Esplora Bacheca Bandi</span>
                      <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              )}
            </div>

          </div>
        </section>

        {/* QUICK TABLETOP UTILITIES DOCK: Rastrelliera di Gilda */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Link
            href="/scopri"
            className="card-guild-stone group relative rounded-xl border border-brass-base/30 p-4 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-brass-base/70"
          >
            <div className="flex items-center gap-2 text-brass-light">
              <Compass className="h-4 w-4" />
              <span className="font-serif text-xs font-bold uppercase tracking-wider">Bacheca Bandi</span>
            </div>
            <p className="mt-1 text-[11px] text-parchment-400 group-hover:text-parchment-200 transition-colors">
              Iscrizioni & Nuove Saghe
            </p>
          </Link>

          <Link
            href="/hall-of-fame"
            className="card-guild-stone group relative rounded-xl border border-brass-base/30 p-4 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-brass-base/70"
          >
            <div className="flex items-center gap-2 text-brass-light">
              <Trophy className="h-4 w-4" />
              <span className="font-serif text-xs font-bold uppercase tracking-wider">Albo d&apos;Oro</span>
            </div>
            <p className="mt-1 text-[11px] text-parchment-400 group-hover:text-parchment-200 transition-colors">
              Leggende & Campioni
            </p>
          </Link>

          <Link
            href="/masters"
            className="card-guild-stone group relative rounded-xl border border-brass-base/30 p-4 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-brass-base/70"
          >
            <div className="flex items-center gap-2 text-brass-light">
              <Shield className="h-4 w-4" />
              <span className="font-serif text-xs font-bold uppercase tracking-wider">I Nostri Master</span>
            </div>
            <p className="mt-1 text-[11px] text-parchment-400 group-hover:text-parchment-200 transition-colors">
              La Loggia dei Narratori
            </p>
          </Link>

          {isGmOrAdmin ? (
            <Link
              href="/command-center?view=assistant"
              className="card-guild-stone group relative rounded-xl border border-brass-base/30 p-4 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-brass-base/70"
            >
              <div className="flex items-center gap-2 text-brass-light">
                <Sparkles className="h-4 w-4" />
                <span className="font-serif text-xs font-bold uppercase tracking-wider">Assistente GM</span>
              </div>
              <p className="mt-1 text-[11px] text-parchment-400 group-hover:text-parchment-200 transition-colors">
                AI Grimorio & Generatore
              </p>
            </Link>
          ) : (
            <Link
              href="/profile"
              className="card-guild-stone group relative rounded-xl border border-brass-base/30 p-4 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-brass-base/70"
            >
              <div className="flex items-center gap-2 text-brass-light">
                <Award className="h-4 w-4" />
                <span className="font-serif text-xs font-bold uppercase tracking-wider">Scheda Eroe</span>
              </div>
              <p className="mt-1 text-[11px] text-parchment-400 group-hover:text-parchment-200 transition-colors">
                Trofei & Profilo Utente
              </p>
            </Link>
          )}
        </section>

        {/* THE WAR ROOM WORKSPACE: Segmented Controller & Live Displays */}
        <DashboardWarRoomTabs
          isGmOrAdmin={isGmOrAdmin}
          counts={{
            myCampaigns: myCampaignsCount,
            allCampaigns: totalCampaignsCount ?? 0,
          }}
          calendarSlot={
            <div className="space-y-4">
              {isGmOrAdmin ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brass-base/30 bg-guild-stone/50 p-4">
                  <div>
                    <h3 className="font-serif text-sm font-bold text-gold-relief">
                      ✦ Strumenti Direzione Tavoli
                    </h3>
                    <p className="text-xs text-parchment-400">
                      Pianifica una nuova data per i tavoli aperti al pubblico.
                    </p>
                  </div>
                  <CreateOpenCalendarEventDialog gmAdminUsers={gmAdminUsers} defaultDmId={user.id} />
                </div>
              ) : null}

              <Suspense
                fallback={
                  <div className="h-[340px] animate-pulse rounded-2xl border border-brass-base/20 bg-guild-stone" />
                }
              >
                <div className="w-full overflow-x-auto">
                  <div className="min-w-[280px] max-w-full">
                    <CalendarSessionsLoader
                      isGmOrAdmin={isGmOrAdmin}
                      gmAdminUsers={gmAdminUsers}
                      defaultDmId={user.id}
                    />
                  </div>
                </div>
              </Suspense>

              {isGmOrAdmin ? (
                <Suspense
                  fallback={
                    <div className="h-24 animate-pulse rounded-2xl border border-brass-base/20 bg-guild-stone" />
                  }
                >
                  <OpenCalendarSessionsGmPanel gmAdminUsers={gmAdminUsers} defaultDmId={user.id} />
                </Suspense>
              ) : null}
            </div>
          }
          myCampaignsSlot={
            <Suspense fallback={<CampaignListFallback />}>
              <CampaignList variant="yours" />
            </Suspense>
          }
          allCampaignsSlot={
            <Suspense fallback={<CampaignListFallback />}>
              <CampaignList variant="all" />
            </Suspense>
          }
          sessionsHistorySlot={
            isGmOrAdmin ? (
              <Suspense
                fallback={
                  <div className="h-40 animate-pulse rounded-2xl border border-brass-base/20 bg-guild-stone" />
                }
              >
                <GmAdminSessionHistorySection />
              </Suspense>
            ) : (
              <Suspense
                fallback={
                  <div className="h-32 animate-pulse rounded-2xl border border-brass-base/20 bg-guild-stone" />
                }
              >
                <MySessionsList />
              </Suspense>
            )
          }
        />

        {/* STATUTO & CODICE DELLA LOCANDA */}
        <section className="card-guild-stone relative rounded-2xl border border-brass-base/30 p-6 shadow-xl">
          <div className="corner-ornament-tl" />
          <div className="corner-ornament-tr" />
          <div className="corner-ornament-bl" />
          <div className="corner-ornament-br" />

          <div className="flex items-center gap-2 border-b border-brass-base/20 pb-3">
            <ScrollText className="h-4 w-4 text-brass-light" />
            <h3 className="font-serif text-sm font-bold uppercase tracking-wider text-brass-light">
              ✦ Statuto e Codice di Condotta della Locanda
            </h3>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 text-xs text-parchment-300">
            <div className="space-y-2">
              <p className="flex items-start gap-2">
                <span className="text-brass-base font-bold">I.</span>
                <span>
                  <strong>Rispetto del Tavolo:</strong> Ogni avventuriero è tenuto alla puntualità e al rispetto del Narratore e dei compagni di squadra.
                </span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-brass-base font-bold">II.</span>
                <span>
                  <strong>Gestione Prenotazioni:</strong> Se impossibilitato a partecipare a una sessione programmata, segnala la disdetta con almeno 24 ore di anticipo.
                </span>
              </p>
            </div>
            <div className="space-y-2">
              <p className="flex items-start gap-2">
                <span className="text-brass-base font-bold">III.</span>
                <span>
                  <strong>Spirito di Gruppo:</strong> Il gioco è cooperativo. Decisioni, bottino e pericoli si condividono per la gloria del party.
                </span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-brass-base font-bold">IV.</span>
                <span>
                  <strong>Il Verdetto del Dado:</strong> I dadi cadono dove devono. Divertiti, abbraccia sia i 20 naturali che i fallimenti critici!
                </span>
              </p>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
