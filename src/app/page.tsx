import Link from "next/link";
import { Dices, MapPinned, Shield, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { CampaignMiniCarousel } from "@/components/home/campaign-mini-carousel";

const HERO_BG =
  "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=2000&q=80";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAuthenticated = !!user;
  const ctaHref = isAuthenticated ? "/dashboard" : "/login";

  return (
    <main className="min-h-screen bg-[#0b0a10] text-barber-paper">
      <section className="relative overflow-hidden border-b border-barber-gold/20">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: `url(${HERO_BG})` }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0b0a10]/70 via-[#0b0a10]/85 to-[#0b0a10]" aria-hidden />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_0%,rgba(251,191,36,0.18),transparent)]" aria-hidden />

        <div className="relative mx-auto flex max-w-6xl flex-col gap-8 px-4 pb-24 pt-16 sm:px-6 md:gap-10 md:pb-32 md:pt-24">
          <h1 className="max-w-4xl font-serif text-4xl font-bold leading-tight text-barber-gold sm:text-5xl md:text-6xl">
            Il meglio del digitale. La magia del tavolo reale.
          </h1>
          <p className="max-w-2xl text-base text-barber-paper/85 sm:text-lg">
            Un&apos;esperienza D&D dal vivo dove mappe 3D interattive, miniature fisiche e dadi veri si fondono in un&apos;unica avventura.
            Tu vieni e giochi.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              asChild
              size="lg"
              className="bg-barber-red px-7 text-base font-semibold text-barber-paper hover:bg-barber-red/90"
            >
              <Link href={ctaHref}>Unisciti alla Gilda</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-barber-gold/40 text-barber-gold hover:bg-barber-gold/10">
              <Link href={ctaHref}>Scopri le Avventure</Link>
            </Button>
          </div>
          <div className="pt-1">
            <CampaignMiniCarousel isAuthenticated={isAuthenticated} />
          </div>
        </div>
      </section>

      <section className="border-b border-barber-gold/20 py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center font-serif text-2xl font-semibold text-barber-gold sm:text-3xl">
            Scegli il tuo tipo di avventura
          </h2>
          <p className="mx-auto mt-3 max-w-3xl text-center text-sm text-barber-paper/75 sm:text-base">
            Offriamo tre modalita di gioco, dalla prima esperienza fino al percorso completo in un mondo condiviso.
          </p>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            <article className="rounded-xl border border-barber-gold/25 bg-[#12101a] p-5">
              <h3 className="text-lg font-semibold text-barber-gold">Oneshot</h3>
              <p className="mt-2 text-sm leading-relaxed text-barber-paper/75">
                Giocata autoconclusiva, perfetta per chi ha poco tempo e vuole venire a giocare senza impegni lunghi.
                Consigliata per tutti i giocatori novizi.
              </p>
            </article>
            <article className="rounded-xl border border-barber-gold/25 bg-[#12101a] p-5">
              <h3 className="text-lg font-semibold text-barber-gold">Quest (3-5 sessioni)</h3>
              <p className="mt-2 text-sm leading-relaxed text-barber-paper/75">
                Campagne brevi per andare oltre la oneshot: approfondisci la storia, conosci meglio i compagni
                di avventura e affini le tue abilita di gioco.
              </p>
            </article>
            <article className="rounded-xl border border-barber-gold/25 bg-[#12101a] p-5">
              <h3 className="text-lg font-semibold text-barber-gold">Campagne Lunghe con Lore Condivisa</h3>
              <p className="mt-2 text-sm leading-relaxed text-barber-paper/75">
                Il top di gamma: vivi l&apos;esperienza completa di D&D, crei il tuo eroe e lo vedi crescere in un
                mondo vivo influenzato dalle tue scelte.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="border-b border-barber-gold/20 py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center font-serif text-2xl font-semibold text-barber-gold sm:text-3xl">Perche l&apos;esperienza e diversa</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            <article className="rounded-xl border border-barber-gold/25 bg-[#12101a] p-5">
              <MapPinned className="h-7 w-7 text-barber-gold" />
              <h3 className="mt-3 text-lg font-semibold text-barber-gold">Mappe 3D Interattive</h3>
              <p className="mt-2 text-sm text-barber-paper/75">
                Ambientazioni dinamiche che reagiscono alla sessione e rendono ogni scelta immediata e visiva.
              </p>
            </article>
            <article className="rounded-xl border border-barber-gold/25 bg-[#12101a] p-5">
              <Shield className="h-7 w-7 text-barber-gold" />
              <h3 className="mt-3 text-lg font-semibold text-barber-gold">Miniature Fisiche</h3>
              <p className="mt-2 text-sm text-barber-paper/75">
                Il fascino del tavolo vero resta al centro: pezzi fisici, scena reale, immersione totale.
              </p>
            </article>
            <article className="rounded-xl border border-barber-gold/25 bg-[#12101a] p-5">
              <Dices className="h-7 w-7 text-barber-gold" />
              <h3 className="mt-3 text-lg font-semibold text-barber-gold">Dadi Veri, Emozioni Vere</h3>
              <p className="mt-2 text-sm text-barber-paper/75">
                Nessun tiro su schermo: il momento decisivo e sempre al tavolo, davanti a tutti.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="border-b border-barber-gold/20 py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid items-center gap-8 md:grid-cols-2">
            <div className="rounded-2xl border border-barber-gold/20 bg-gradient-to-br from-[#181327] to-[#110f18] p-6">
              <Users className="h-8 w-8 text-barber-gold" />
              <h2 className="mt-4 font-serif text-2xl font-semibold text-barber-gold">Da novizio a leggenda</h2>
              <p className="mt-3 text-sm leading-relaxed text-barber-paper/80 sm:text-base">
                Accogliamo tutti: chi inizia da zero trova guida e ritmo, chi gioca da anni trova profondita, atmosfera e sfide reali.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-barber-paper/80 sm:text-base">
                Il nostro obiettivo e semplice: farti vivere il tavolo al massimo, senza complicazioni.
              </p>
            </div>
            <div className="rounded-2xl border border-barber-gold/20 bg-gradient-to-br from-[#22150d] to-[#130f12] p-6">
              <Sparkles className="h-8 w-8 text-barber-gold" />
              <h2 className="mt-4 font-serif text-2xl font-semibold text-barber-gold">Tu vieni. Al resto pensiamo noi.</h2>
              <ul className="mt-4 space-y-2 text-sm text-barber-paper/80 sm:text-base">
                <li>- Esperienza pronta e guidata.</li>
                <li>- Tavolo, materiali e setup curati.</li>
                <li>- Community viva dove tornare ogni settimana.</li>
              </ul>
              <div className="mt-6">
                <Button asChild className="bg-barber-red text-barber-paper hover:bg-barber-red/90">
                  <Link href={ctaHref}>Unisciti alla Gilda</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-barber-gold sm:text-3xl">Pronto a vivere D&D come non l&apos;hai mai giocato?</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-barber-paper/75 sm:text-base">
            Entra nella community Barber & Dragons e trova il tuo prossimo tavolo dal vivo.
          </p>
          <div className="mt-6">
            <Button asChild size="lg" className="bg-barber-red px-8 text-barber-paper hover:bg-barber-red/90">
              <Link href={ctaHref}>Unisciti alla Gilda</Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-barber-gold/30 bg-[#0d0b12]/95 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-3 rounded-lg border border-barber-gold/25 bg-[#171322] px-4 py-3 text-center">
          <p className="text-sm text-barber-paper/90">
            Pronto a entrare nella tua prossima avventura?
          </p>
          <Button asChild className="bg-barber-red text-barber-paper hover:bg-barber-red/90">
            <Link href={ctaHref}>Unisciti alla Gilda</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
