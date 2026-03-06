import { Suspense } from "react";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/utils/supabase/server";
import { CampaignList } from "@/components/campaign-list";
import { MySessionsList } from "@/components/my-sessions-list";
import { CalendarSessionsLoader } from "@/components/dashboard/calendar-sessions-loader";

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

  return (
    <div className="min-h-full w-full bg-barber-dark p-4 md:p-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 md:gap-8">
        <header>
          <p className="text-sm text-barber-gold/80">Benvenuto,</p>
          <h1 className="break-words text-xl font-semibold text-barber-paper sm:text-2xl">
            {displayName}
          </h1>
        </header>

        <div className="space-y-6">
          <section className="w-full min-w-0 overflow-hidden">
            <Suspense
              fallback={
                <div className="h-[320px] animate-pulse rounded-xl border border-barber-gold/30 bg-barber-dark/80" />
              }
            >
              <div className="w-full overflow-x-auto">
                <div className="min-w-[280px] max-w-full">
                  <CalendarSessionsLoader />
                </div>
              </div>
            </Suspense>
          </section>

          <section className="min-w-0">
            <h2 className="mb-4 break-words text-lg font-semibold text-barber-paper">
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
            <h2 className="mb-4 break-words text-lg font-semibold text-barber-paper">
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

          <section className="min-w-0">
            <h2 className="mb-4 break-words text-lg font-semibold text-barber-paper">
              Le mie sessioni
            </h2>
            <Suspense fallback={<div className="h-32 animate-pulse rounded-xl border border-barber-gold/30 bg-barber-dark/80" />}>
              <MySessionsList />
            </Suspense>
          </section>

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
