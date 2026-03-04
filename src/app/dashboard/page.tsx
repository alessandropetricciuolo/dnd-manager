import { Suspense } from "react";
import { redirect } from "next/navigation";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { signout } from "@/app/auth/actions";
import { CreateCampaignDialog } from "@/components/create-campaign-dialog";
import { CampaignList } from "@/components/campaign-list";
import { MySessionsList } from "@/components/my-sessions-list";
import { CalendarSessionsLoader } from "@/components/dashboard/calendar-sessions-loader";
import { Shield, User } from "lucide-react";

export const dynamic = "force-dynamic";

function CampaignListFallback() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

  const email = user.email ?? "avventuriero";

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";
  const isGmOrAdmin = profile?.role === "gm" || profile?.role === "admin";

  return (
    <div className="min-h-screen bg-barber-dark px-4 py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-barber-gold/80">Benvenuto,</p>
            <h1 className="text-2xl font-semibold text-barber-paper">{email}</h1>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link href="/admin">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-barber-gold/50 text-barber-gold hover:bg-barber-gold/10"
                >
                  <Shield className="mr-2 h-4 w-4" />
                  Admin Panel
                </Button>
              </Link>
            )}
            <Link href="/profile">
              <Button
                variant="outline"
                size="sm"
                className="border-barber-gold/40 text-barber-paper hover:bg-barber-gold/10"
              >
                <User className="mr-2 h-4 w-4" />
                Profilo
              </Button>
            </Link>
            {isGmOrAdmin && <CreateCampaignDialog />}
            <form action={signout}>
              <Button
                type="submit"
                variant="outline"
                className="border-barber-gold/40 text-barber-paper hover:bg-barber-gold/10"
              >
                Logout
              </Button>
            </form>
          </div>
        </header>

        <main className="space-y-6">
          <section>
            <Suspense
              fallback={
                <div className="h-[320px] animate-pulse rounded-xl border border-barber-gold/30 bg-barber-dark/80" />
              }
            >
              <CalendarSessionsLoader />
            </Suspense>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold text-barber-paper">
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

          <section>
            <h2 className="mb-4 text-lg font-semibold text-barber-paper">
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

          <section>
            <h2 className="mb-4 text-lg font-semibold text-barber-paper">
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
        </main>
      </div>
    </div>
  );
}
