import Link from "next/link";
import Image from "next/image";
import {
  Beer,
  CheckCircle2,
  ChevronRight,
  Dices,
  Flame,
  LayoutDashboard,
  MapPinned,
  Scroll,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CampaignMiniCarousel } from "@/components/home/campaign-mini-carousel";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { getUserDisplayName } from "@/lib/user-display-name";

export const revalidate = 300;

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isLoggedIn = Boolean(user);
  const displayName = user ? getUserDisplayName(user) : null;
  const joinHref = "/login";
  const primaryHref = isLoggedIn ? "/dashboard" : joinHref;
  const primaryLabel = isLoggedIn ? "Le mie avventure" : "Unisciti alla Gilda";

  return (
    <main className="min-h-screen bg-guild-void text-parchment-100 font-sans">
      {isLoggedIn ? (
        <div className="border-b border-brass-base/20 bg-gradient-to-r from-brass-base/15 via-brass-base/5 to-transparent">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-sm text-parchment-100/90 sm:text-base">
              <span className="font-semibold text-brass-light font-serif">Bentornato, {displayName}.</span>{" "}
              Le prossime serate al tavolo e le tue iscrizioni ti aspettano.
            </p>
            <Button
              asChild
              size="sm"
              variant="secondary"
              className="shrink-0"
            >
              <Link href="/dashboard" className="inline-flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4" />
                Area personale
              </Link>
            </Button>
          </div>
        </div>
      ) : null}

      {/* HERO SECTION: The Tavern Portal (Showcase a 2 Colonne con Foto Reale) */}
      <section className="relative overflow-hidden border-b border-guild-border">
        {/* Sfondo caldo e sfumato da taverna */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-15 mix-blend-luminosity filter blur-sm scale-105"
          style={{ backgroundImage: `url(/hero-tabletop.jpg)` }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-b from-guild-void/80 via-guild-void/95 to-guild-void" aria-hidden />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(200,157,73,0.18),transparent)]" aria-hidden />

        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-14 md:pb-24 md:pt-16">
          <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
            {/* Colonna Sinistra: Copywriting Nobile & CTA */}
            <div className="flex flex-col gap-6 lg:col-span-7">
              {/* Grand Barber & Dragons Insignia */}
              <div className="flex flex-col items-start gap-4">
                <div className="relative">
                  <Image
                    src="/logo.png"
                    alt="Barber & Dragons"
                    width={400}
                    height={150}
                    className="h-20 sm:h-24 md:h-28 lg:h-32 w-auto object-contain drop-shadow-[0_8px_32px_rgba(217,119,6,0.5)] filter brightness-105"
                    priority
                  />
                </div>
                <div className="inline-flex max-w-fit items-center gap-2 rounded-full border border-brass-base/40 bg-guild-oak/90 px-3.5 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-brass-light backdrop-blur shadow-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-brass-base animate-ping" />
                  <span>La Gilda di D&amp;D dal Vivo · Napoli</span>
                </div>
              </div>

              <h1 className="font-serif text-4xl font-black leading-[1.08] tracking-tight sm:text-5xl md:text-6xl text-gold-relief">
                D&amp;D dal vivo,
                <br />
                <span className="font-normal italic text-brass-base">come si deve.</span>
              </h1>

              <p className="max-w-xl text-base leading-relaxed text-parchment-300 sm:text-lg">
                Nessun microfono mutato, nessun simulatore asettico. A Barber &amp; Dragons il gioco torna dove è nato:{" "}
                <strong className="text-parchment-100 font-semibold">dadi veri</strong> che rotolano sul legno,{" "}
                <strong className="text-parchment-100 font-semibold">miniature dipinte</strong>, mappe interattive e{" "}
                <strong className="text-brass-light font-semibold">birre artigianali</strong> con i compagni di gilda.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-1">
                <Button
                  asChild
                  size="lg"
                  variant="wax"
                  className="h-12 px-8 text-base shadow-xl tracking-wider font-serif uppercase font-bold"
                >
                  <Link href={primaryHref} className="inline-flex items-center gap-2.5">
                    <Dices className="h-5 w-5 text-brass-light" />
                    <span>{primaryLabel}</span>
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="h-12 px-7 text-sm font-semibold tracking-wide border-brass-base/50 text-brass-light hover:bg-brass-base/15"
                >
                  <Link href={isLoggedIn ? "/profile" : "/scopri"}>
                    {isLoggedIn ? "Il mio profilo" : "Scopri le Avventure"}
                  </Link>
                </Button>
              </div>

              {/* 3 Pillar di Fiducia */}
              <div className="mt-4 grid grid-cols-3 gap-3 border-t border-guild-border/70 pt-6">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-brass-light font-serif">
                    <Dices className="h-4 w-4 text-brass-base" />
                    <span>Dadi Veri</span>
                  </div>
                  <p className="text-[11px] text-parchment-500 leading-tight">100% gioco in presenza</p>
                </div>
                <div className="flex flex-col gap-1 border-l border-guild-border/60 pl-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-brass-light font-serif">
                    <MapPinned className="h-4 w-4 text-brass-base" />
                    <span>Mappe &amp; Miniature</span>
                  </div>
                  <p className="text-[11px] text-parchment-500 leading-tight">Tavolo con mappa proiettata</p>
                </div>
                <div className="flex flex-col gap-1 border-l border-guild-border/60 pl-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-brass-light font-serif">
                    <Swords className="h-4 w-4 text-brass-base" />
                    <span>Master &amp; Saghe</span>
                  </div>
                  <p className="text-[11px] text-parchment-500 leading-tight">Dalle oneshot alla lore</p>
                </div>
              </div>
            </div>

            {/* Colonna Destra: Fotografia Reale del Tavolo Incorniciata */}
            <div className="relative lg:col-span-5">
              <div className="relative mx-auto w-full max-w-md lg:max-w-none">
                {/* Cornice araldica con staffe dorate */}
                <div className="relative overflow-hidden rounded-2xl border-2 border-brass-base/40 bg-guild-stone p-2 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
                  <div className="corner-ornament-tl" />
                  <div className="corner-ornament-tr" />
                  <div className="corner-ornament-bl" />
                  <div className="corner-ornament-br" />

                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-guild-void">
                    <Image
                      src="/hero-tabletop.jpg"
                      alt="Sessione dal vivo di Dungeons & Dragons con mappa proiettata sul tavolo"
                      fill
                      priority
                      className="object-cover object-center transition-transform duration-700 hover:scale-105"
                      sizes="(max-width: 1024px) 100vw, 40vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-guild-void via-transparent to-transparent opacity-80" />
                    
                    {/* Badge sovrapposto in basso */}
                    <div className="absolute inset-x-3 bottom-3 flex items-center justify-between rounded-lg border border-brass-base/30 bg-guild-stone/95 p-2.5 backdrop-blur shadow-lg">
                      <div className="flex items-center gap-2">
                        <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-xs font-serif font-bold text-gold-relief tracking-wide">
                          Tavolo con Mappa Proiettata · D&amp;D dal Vivo
                        </span>
                      </div>
                      <span className="text-[11px] text-brass-light/90 font-serif font-semibold">Napoli</span>
                    </div>
                  </div>
                </div>

                {/* Sigillo circolare decorativo */}
                <div className="absolute -bottom-4 -left-4 hidden sm:flex h-14 w-14 items-center justify-center rounded-full border-2 border-brass-base bg-crimson-base text-parchment-100 shadow-xl">
                  <Dices className="h-7 w-7 text-brass-light" />
                </div>
              </div>
            </div>
          </div>

          {/* Mini Carousel Campagne */}
          <div className="mt-14 border-t border-guild-border/80 pt-8">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-brass-base/80 font-serif">
                Campagne &amp; Tavoli Attivi
              </p>
              <Link
                href="/scopri"
                className="inline-flex items-center gap-1 text-xs text-brass-light hover:text-brass-base transition-colors"
              >
                <span>Vedi tutte</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <CampaignMiniCarousel isLoggedIn={isLoggedIn} />
          </div>
        </div>
      </section>

      {/* SELEZIONE FORMATO AVVENTURA: TESSERE IN PIETRA SCOLPITA */}
      <section className="border-b border-guild-border py-16 sm:py-20 bg-guild-stone/30">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-brass-base/90 font-serif">
              ✦ Le Vie dell&apos;Avventura ✦
            </p>
            <h2 className="mt-2 font-serif text-3xl font-extrabold tracking-tight text-gold-relief sm:text-4xl">
              Scegli come sederti al tavolo
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-parchment-300 sm:text-base">
              Tre modi diversi per vivere la gilda: dalla singola serata senza impegno alla saga epica in un mondo condiviso.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {/* CARD 1: ONESHOT */}
            <article className="card-guild-stone rounded-xl p-7 flex flex-col justify-between">
              <div className="corner-ornament-tl" />
              <div className="corner-ornament-tr" />
              <div className="corner-ornament-bl" />
              <div className="corner-ornament-br" />

              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded border border-brass-base/30 bg-guild-stone px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wider text-brass-light">
                    Singola Serata
                  </span>
                  <span className="text-xs text-parchment-500">~3-4 ore</span>
                </div>

                <h3 className="mt-4 font-serif text-2xl font-bold text-parchment-100">Oneshot</h3>

                {/* Divisore dorato con stella */}
                <div className="my-3.5 flex items-center gap-2 text-brass-base/40">
                  <span className="h-px flex-1 bg-guild-border" />
                  <span className="text-[10px]">✦</span>
                  <span className="h-px flex-1 bg-guild-border" />
                </div>

                <p className="text-sm leading-relaxed text-parchment-300">
                  Giocata autoconclusiva. Perfetta per chi ha poco tempo o vuole provare D&amp;D per la prima volta senza legami a lungo termine.
                </p>

                <ul className="mt-5 space-y-2 text-xs text-parchment-300/90">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-brass-base shrink-0" />
                    <span>Nessuna preparazione richiesta</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-brass-base shrink-0" />
                    <span>Scheda personaggio fornita o creata al volo</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-brass-base shrink-0" />
                    <span>Ideale per gruppi di amici novizi</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-guild-border/60">
                <Link
                  href="/scopri"
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-brass-base/30 bg-guild-stone px-4 py-2.5 text-xs font-semibold text-brass-light transition hover:bg-brass-base/15 hover:border-brass-base"
                >
                  <span>Scopri le Oneshot</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </article>

            {/* CARD 2: QUEST */}
            <article className="card-guild-stone rounded-xl p-7 flex flex-col justify-between border-brass-base/40 shadow-[0_10px_35px_rgba(200,157,73,0.1)]">
              <div className="corner-ornament-tl" />
              <div className="corner-ornament-tr" />
              <div className="corner-ornament-bl" />
              <div className="corner-ornament-br" />

              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded border border-crimson-base/60 bg-crimson-base/20 px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wider text-parchment-100 font-semibold">
                    Mini Campagna
                  </span>
                  <span className="text-xs text-brass-light font-semibold">3-5 Sessioni</span>
                </div>

                <h3 className="mt-4 font-serif text-2xl font-bold text-gold-relief">Quest</h3>

                <div className="my-3.5 flex items-center gap-2 text-brass-base/60">
                  <span className="h-px flex-1 bg-brass-base/30" />
                  <span className="text-[10px] text-brass-base">✦</span>
                  <span className="h-px flex-1 bg-brass-base/30" />
                </div>

                <p className="text-sm leading-relaxed text-parchment-300">
                  La formula più amata: vai oltre la serata singola, esplori archi narrativi profondi e vedi il tuo personaggio salire di livello.
                </p>

                <ul className="mt-5 space-y-2 text-xs text-parchment-300/90">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-brass-base shrink-0" />
                    <span>Continuità narrativa e boss fight epici</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-brass-base shrink-0" />
                    <span>Party stabile con compagni abituali</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-brass-base shrink-0" />
                    <span>Equipaggiamento magico e progressione</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-guild-border/60">
                <Link
                  href="/scopri"
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-brass-base px-4 py-2.5 text-xs font-bold text-guild-void shadow-md transition hover:bg-brass-base/90"
                >
                  <span>Partecipa a una Quest</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </article>

            {/* CARD 3: CAMPAGNE LUNGHE */}
            <article className="card-guild-stone rounded-xl p-7 flex flex-col justify-between">
              <div className="corner-ornament-tl" />
              <div className="corner-ornament-tr" />
              <div className="corner-ornament-bl" />
              <div className="corner-ornament-br" />

              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded border border-brass-base/30 bg-guild-stone px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wider text-brass-light">
                    Saga Continua
                  </span>
                  <span className="text-xs text-parchment-500">Mondo Vivo</span>
                </div>

                <h3 className="mt-4 font-serif text-2xl font-bold text-parchment-100">Campagne Lunghe</h3>

                <div className="my-3.5 flex items-center gap-2 text-brass-base/40">
                  <span className="h-px flex-1 bg-guild-border" />
                  <span className="text-[10px]">✦</span>
                  <span className="h-px flex-1 bg-guild-border" />
                </div>

                <p className="text-sm leading-relaxed text-parchment-300">
                  L&apos;esperienza definitiva di D&amp;D. Costruisci il tuo eroe da zero e vedi il suo nome scolpito nella storia della gilda e nella lore condivisa.
                </p>

                <ul className="mt-5 space-y-2 text-xs text-parchment-300/90">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-brass-base shrink-0" />
                    <span>Wiki ed enciclopedia di campagna dedicata</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-brass-base shrink-0" />
                    <span>Mappe interattive con nebbia di guerra</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-brass-base shrink-0" />
                    <span>Punti Fama e accesso alla Hall of Fame</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-guild-border/60">
                <Link
                  href="/scopri"
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-brass-base/30 bg-guild-stone px-4 py-2.5 text-xs font-semibold text-brass-light transition hover:bg-brass-base/15 hover:border-brass-base"
                >
                  <span>Entra in Campagna</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* PERCHÉ GIOCARE DAL VIVO CON NOI: ARTIGIANATO DEL TAVOLO */}
      <section className="border-b border-guild-border py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center">
            <h2 className="font-serif text-3xl font-extrabold tracking-tight text-gold-relief sm:text-4xl">
              Perché giocare dal vivo con noi
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-parchment-300 sm:text-base">
              Abbiamo fuso la magia dell&apos;analogico con l&apos;innovazione digitale per darti la sessione perfetta.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <article className="card-guild-stone rounded-xl p-7 border-guild-border">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-brass-base/40 bg-gradient-to-br from-guild-stone to-guild-oak text-brass-light shadow-md">
                <MapPinned className="h-7 w-7" />
              </div>
              <h3 className="mt-5 font-serif text-xl font-bold text-parchment-100">
                Mappe 3D &amp; Schermi Tavolo
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-parchment-300/85">
                I nostri tavoli integrano display digitali orizzontali per proiettare mappe tattiche e rivelare la nebbia di guerra in tempo reale, mantenendo la sensazione fisica del gioco.
              </p>
            </article>

            <article className="card-guild-stone rounded-xl p-7 border-guild-border">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-brass-base/40 bg-gradient-to-br from-guild-stone to-guild-oak text-brass-light shadow-md">
                <Shield className="h-7 w-7" />
              </div>
              <h3 className="mt-5 font-serif text-xl font-bold text-parchment-100">
                Miniature Fisiche Dipinte
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-parchment-300/85">
                Il tavolo vero vive di elementi tangibili: centinaia di mostri ed eroi dipinti a mano, scenari 3D e dadi che sbattono sulle torri lancia-dadi artigianali.
              </p>
            </article>

            <article className="card-guild-stone rounded-xl p-7 border-guild-border">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-brass-base/40 bg-gradient-to-br from-guild-stone to-guild-oak text-brass-light shadow-md">
                <Dices className="h-7 w-7" />
              </div>
              <h3 className="mt-5 font-serif text-xl font-bold text-parchment-100">
                Dadi Veri, Emozioni Reali
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-parchment-300/85">
                Nessun generatore casuale su schermo: il momento decisivo, il 20 naturale o il fallimento critico si vivono tutti insieme davanti agli sguardi del party.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* COMMUNITY CALLOUT */}
      <section className="border-b border-guild-border py-16 sm:py-20 bg-guild-stone/20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid items-center gap-8 md:grid-cols-2">
            <div className="card-guild-stone rounded-2xl p-8 sm:p-10 border-brass-base/20 bg-guild-oak/90">
              <div className="corner-ornament-tl" />
              <div className="corner-ornament-tr" />
              <div className="corner-ornament-bl" />
              <div className="corner-ornament-br" />

              <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-brass-base/30 bg-guild-stone text-brass-base">
                <Users className="h-6 w-6" />
              </div>
              <h2 className="mt-5 font-serif text-2xl font-bold text-gold-relief sm:text-3xl">
                Da novizio a leggenda
              </h2>
              <p className="mt-3.5 text-sm leading-relaxed text-parchment-300 sm:text-base">
                Accogliamo tutti: chi si siede per la prima volta trova accoglienza, spiegazioni chiare e ritmi giusti. Chi gioca da anni trova sfide stimolanti, ambientazioni profonde e Master dediti alla narrazione.
              </p>
              <div className="mt-6 flex items-center gap-4 text-xs text-brass-light font-serif">
                <span className="flex items-center gap-1.5">
                  <Trophy className="h-4 w-4 text-brass-base" /> Punti Fama
                </span>
                <span className="flex items-center gap-1.5">
                  <Scroll className="h-4 w-4 text-brass-base" /> Schede Archiviate
                </span>
                <span className="flex items-center gap-1.5">
                  <Beer className="h-4 w-4 text-brass-base" /> Serate in Compagnia
                </span>
              </div>
            </div>

            <div className="card-guild-stone rounded-2xl p-8 sm:p-10 border-brass-base/20 bg-guild-oak/90">
              <div className="corner-ornament-tl" />
              <div className="corner-ornament-tr" />
              <div className="corner-ornament-bl" />
              <div className="corner-ornament-br" />

              <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-brass-base/30 bg-guild-stone text-brass-base">
                <Sparkles className="h-6 w-6" />
              </div>
              <h2 className="mt-5 font-serif text-2xl font-bold text-gold-relief sm:text-3xl">
                Tu vieni. Al resto pensiamo noi.
              </h2>
              <ul className="mt-4 space-y-3 text-sm text-parchment-300 sm:text-base">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-5 w-5 text-brass-base shrink-0 mt-0.5" />
                  <span>Esperienza curata e guidata da Game Master esperti.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-5 w-5 text-brass-base shrink-0 mt-0.5" />
                  <span>Tavolo pronto con mappe, miniature, schede e dadi di cortesia.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-5 w-5 text-brass-base shrink-0 mt-0.5" />
                  <span>Ambiente accogliente: compagni di gilda, snack e divertimento.</span>
                </li>
              </ul>
              {!isLoggedIn ? (
                <div className="mt-8">
                  <Button asChild variant="wax" size="default" className="h-11 px-6 font-serif uppercase tracking-wider">
                    <Link href={joinHref}>Unisciti alla Gilda</Link>
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* CTA FINALE MONUMENTALE */}
      <section className="relative overflow-hidden py-20 sm:py-24 bg-gradient-to-b from-guild-void to-guild-stone">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,rgba(200,157,73,0.12),transparent)]" aria-hidden />

        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
          <p className="text-xs font-mono uppercase tracking-[0.25em] text-brass-base font-semibold">
            ✦ Il Dado è Tratto ✦
          </p>
          <h2 className="mt-3 font-serif text-3xl font-extrabold tracking-tight text-gold-relief sm:text-5xl leading-tight">
            {isLoggedIn
              ? "Pronto per la prossima serata al tavolo?"
              : "Pronto a vivere D&D come non l'hai mai giocato?"}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-parchment-300 sm:text-lg">
            {isLoggedIn
              ? "Controlla le date disponibili, prepara il personaggio e vieni a giocare dal vivo con i tuoi compagni."
              : "Unisciti alla community Barber & Dragons. Scegli la tua avventura, prenota il tuo posto al tavolo e tira il tuo primo d20."}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button
              asChild
              size="lg"
              variant="wax"
              className="h-13 px-9 text-base font-serif uppercase tracking-wider font-bold shadow-2xl"
            >
              <Link href={primaryHref}>{primaryLabel}</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-13 px-7 text-sm font-semibold border-brass-base/50 text-brass-light hover:bg-brass-base/15"
            >
              <Link href="/masters">Esplora l&apos;Albo Master</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
