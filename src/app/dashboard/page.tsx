import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Sparkles, Terminal } from "lucide-react";

import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { CampaignList } from "@/components/campaign-list";
import { MySessionsList } from "@/components/my-sessions-list";
import { CalendarSessionsLoader } from "@/components/dashboard/calendar-sessions-loader";
import { GmAdminSessionHistorySection } from "@/components/dashboard/gm-admin-session-history-section";
import { CreateOpenCalendarEventDialog } from "@/components/dashboard/create-open-calendar-event-dialog";
import { OpenCalendarSessionsGmPanel } from "@/components/dashboard/open-calendar-sessions-gm-panel";

export const dynamic = "force-dynamic";

function CampaignListFallback() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-barber-gold/30 bg-barber-dark/80 overflow-hidden animate-pulse"
        >
          <div className="aspect-[3/2] w-full bg-barber-dark" />
          <div className="space-y-2 p-4">
            <div className="h-5 w-3/4 rounded bg-barber-dark" />
            <div className="h-4 w-full rounded bg-barber-dark" />
            <div className="h-4 w-2/3 rounded bg-barber-dark" />
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
    .select("role, first_name, last_name")
    .eq("id", user.id)
    .single();

  const displayName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    user.email ||
    "avventuriero";

  const isGmOrAdmin = profile?.role === "gm" || profile?.role === "admin";

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

  return (
    <div className="min-h-full w-full bg-barber-dark p-4 md:p-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 md:gap-8">
        <header>
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-barber-gold/70">
            Benvenuto,
          </p>
          <h1 className="mt-1 break-words font-serif text-2xl font-bold leading-tight text-barber-paper sm:text-3xl">
            {displayName}
          </h1>
        </header>

        {isGmOrAdmin ? (
          <section className="grid gap-4 sm:grid-cols-2">
            <Link
              href="/command-center?view=assistant"
              className="group relative overflow-hidden rounded-xl border border-barber-gold/35 bg-gradient-to-br from-barber-gold/15 via-barber-dark/90 to-barber-dark/95 p-5 transition-colors hover:border-barber-gold/55"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-barber-gold/80">
                    AI · Command Center
                  </p>
                  <h2 className="mt-1 font-serif text-xl font-semibold text-barber-paper">
                    Assistente GM
                  </h2>
                  <p className="mt-2 text-sm text-barber-paper/65">
                    Crea NPC, luoghi e missioni in chat. Anteprima live a destra, conferma in conversazione.
                  </p>
                </div>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-barber-gold/40 bg-barber-gold/15 text-barber-gold transition-transform group-hover:scale-105">
                  <Sparkles className="h-5 w-5" />
                </div>
              </div>
            </Link>
            <Link
              href="/command-center"
              className="flex flex-col justify-between rounded-xl border border-barber-gold/25 bg-barber-dark/80 p-5 transition-colors hover:border-barber-gold/40 hover:bg-barber-dark/90"
            >
              <div className="flex items-center gap-2 text-barber-gold/80">
                <Terminal className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wide">Workspace</span>
              </div>
              <div className="mt-3">
                <h2 className="font-serif text-lg font-semibold text-barber-paper">Command Center</h2>
                <p className="mt-1 text-sm text-barber-paper/55">
                  Inbox, task, pagine e cronologia azioni.
                </p>
              </div>
            </Link>
          </section>
        ) : null}

        <div className="space-y-6">
          <section className="w-full min-w-0 overflow-hidden space-y-3">
            {isGmOrAdmin ? (
              <div className="flex flex-wrap items-center justify-end gap-2">
                <CreateOpenCalendarEventDialog gmAdminUsers={gmAdminUsers} defaultDmId={user.id} />
              </div>
            ) : null}
            <Suspense
              fallback={
                <div className="h-[320px] animate-pulse rounded-xl border border-barber-gold/30 bg-barber-dark/80" />
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
              <Suspense fallback={<div className="h-24 animate-pulse rounded-xl border border-barber-gold/30 bg-barber-dark/80" />}>
                <OpenCalendarSessionsGmPanel gmAdminUsers={gmAdminUsers} defaultDmId={user.id} />
              </Suspense>
            ) : null}
          </section>

          {isGmOrAdmin ? (
            <section className="min-w-0">
              <Suspense
                fallback={
                  <div className="h-40 animate-pulse rounded-xl border border-barber-gold/30 bg-barber-dark/80" />
                }
              >
                <GmAdminSessionHistorySection />
              </Suspense>
            </section>
          ) : null}

          <section className="min-w-0">
            <h2 className="mb-2 break-words font-serif text-xl font-semibold leading-tight text-barber-paper sm:text-2xl">
              Le tue campagne
            </h2>
            <p className="mb-4 text-sm text-barber-paper/70">
              {isGmOrAdmin
                ? "Campagne che hai creato (dove sei GM)."
                : "Campagne in cui hai già partecipato ad almeno una sessione."}
            </p>
            <Suspense fallback={<CampaignListFallback />}>
              <CampaignList variant="yours" />
            </Suspense>
          </section>

          <section className="min-w-0">
            <h2 className="mb-2 break-words font-serif text-xl font-semibold leading-tight text-barber-paper sm:text-2xl">
              Tutte le campagne
            </h2>
            <p className="mb-4 text-sm text-barber-paper/70">
              {isGmOrAdmin
                ? "Tutte le campagne della piattaforma."
                : "Campagne pubbliche o a cui sei iscritto (prenota una sessione per sbloccarle)."}
            </p>
            <Suspense fallback={<CampaignListFallback />}>
              <CampaignList variant="all" />
            </Suspense>
          </section>

          {!isGmOrAdmin ? (
            <section className="min-w-0">
              <h2 className="mb-4 break-words font-serif text-xl font-semibold leading-tight text-barber-paper sm:text-2xl">
                Le mie sessioni
              </h2>
              <Suspense fallback={<div className="h-32 animate-pulse rounded-xl border border-barber-gold/30 bg-barber-dark/80" />}>
                <MySessionsList />
              </Suspense>
            </section>
          ) : null}

          <section className="rounded-xl border border-barber-gold/30 bg-barber-dark/80 p-4">
            <h3 className="text-sm font-medium text-barber-paper">
              Prossimi passi
            </h3>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-barber-paper/80">
              {isGmOrAdmin ? (
                <>
                  <li>Crea campagne e sessioni e gestisci le iscrizioni.</li>
                  <li>Esplora il wiki e le mappe delle tue campagne.</li>
                </>
              ) : (
                <>
                  <li>Usa il calendario sopra per trovare e prenotare sessioni.</li>
                  <li>Entra nelle campagne pubbliche o a cui sei stato invitato.</li>
                  <li>Esplora il wiki per NPC, luoghi e oggetti.</li>
                </>
              )}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
