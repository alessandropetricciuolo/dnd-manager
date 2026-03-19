import Link from "next/link";
import Image from "next/image";
import { Sword, Map, Scroll } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IMAGE_BLUR_PLACEHOLDER } from "@/lib/utils";
import { CampaignCarousel } from "@/components/home/campaign-carousel";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-barber-dark">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-barber-dark via-barber-dark to-barber-dark/95">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(251,191,36,0.12),transparent)]" />
        <div className="relative mx-auto max-w-6xl p-4 sm:px-6 sm:py-16 md:py-24 lg:py-32">
          <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
            <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
              <h1 className="font-serif text-3xl font-bold tracking-tight text-barber-gold sm:text-4xl md:text-5xl lg:text-6xl">
                Barber & Dragons
              </h1>
              <p className="mt-4 max-w-xl text-center text-base text-barber-paper/80 sm:text-lg lg:text-left">
                La community di D&D di cui c&apos;era bisogno.
              </p>
              <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
                <Button
                  asChild
                  size="lg"
                  className="min-h-[44px] bg-barber-red px-6 py-5 text-base font-semibold text-barber-paper hover:bg-barber-red/90 md:px-8 md:py-6 md:text-lg"
                >
                  <Link href="/login">Unisciti all&apos;Avventura</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="min-h-[44px] border-barber-gold/40 text-barber-gold hover:bg-barber-gold/10 md:px-8 md:py-6 md:text-lg"
                >
                  <Link href="/scopri">Scopri la Gilda</Link>
                </Button>
              </div>
            </div>
            <div className="relative flex justify-center lg:justify-end">
              <div className="relative">
                <div className="absolute -inset-4 rounded-full bg-barber-gold/20 blur-2xl" aria-hidden />
                <Image
                  src="/logo.png"
                  alt="Barber & Dragons"
                  width={320}
                  height={160}
                  className="relative z-10 w-48 object-contain sm:w-64 md:w-80"
                  priority
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  placeholder="blur"
                  blurDataURL={IMAGE_BLUR_PLACEHOLDER}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Carosello campagne in evidenza */}
      <CampaignCarousel />

      {/* Features */}
      <section className="border-t border-barber-gold/20 bg-barber-dark/98 py-12 sm:py-16 md:py-24">
        <div className="mx-auto max-w-6xl p-4 sm:px-6 md:p-8">
          <h2 className="font-serif text-center text-xl font-semibold text-barber-gold sm:text-2xl md:text-3xl">
            Tutto ciò che serve per giocare
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8 md:grid-cols-3">
            <article className="min-w-0 rounded-xl border border-barber-gold/30 bg-barber-dark p-4 shadow-lg transition-colors hover:border-barber-gold/50 md:p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-barber-gold/20 text-barber-gold">
                <Sword className="h-6 w-6" />
              </div>
              <h3 className="mt-3 font-serif text-lg font-semibold text-barber-gold break-words md:mt-4 md:text-xl">
                Campagne Epiche
              </h3>
              <p className="mt-2 text-sm text-barber-paper/70 break-words">
                Partecipa alle nostre campagne. Un calendario e una bacheca per Master e giocatori.
              </p>
            </article>
            <article className="min-w-0 rounded-xl border border-barber-gold/30 bg-barber-dark p-4 shadow-lg transition-colors hover:border-barber-gold/50 md:p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-barber-gold/20 text-barber-gold">
                <Map className="h-6 w-6" />
              </div>
              <h3 className="mt-3 font-serif text-lg font-semibold text-barber-gold break-words md:mt-4 md:text-xl">
                Schede Personaggio
              </h3>
              <p className="mt-2 text-sm text-barber-paper/70 break-words">
                Gestisci le tue iscrizioni e scopri il mondo di gioco sbloccato dopo ogni avventura.
              </p>
            </article>
            <article className="min-w-0 rounded-xl border border-barber-gold/30 bg-barber-dark p-4 shadow-lg transition-colors hover:border-barber-gold/50 md:p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-barber-gold/20 text-barber-gold">
                <Scroll className="h-6 w-6" />
              </div>
              <h3 className="mt-3 font-serif text-lg font-semibold text-barber-gold break-words md:mt-4 md:text-xl">
                Wiki del Mondo
              </h3>
              <p className="mt-2 text-sm text-barber-paper/70 break-words">
                NPC, luoghi, mostri, oggetti e lore. Mappe interattive e molto altro ancora.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-barber-gold/20 py-6 md:py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 p-4 text-center text-sm text-barber-paper/60 sm:px-6">
          <p>© {new Date().getFullYear()} Barber & Dragons. Tutti i diritti riservati.</p>
          <div className="flex items-center gap-2">
            <a
              href="https://www.iubenda.com/privacy-policy/43878034"
              className="iubenda-white iubenda-noiframe iubenda-embed hover:text-accent transition-colors"
              title="Privacy Policy"
            >
              Privacy Policy
            </a>
            <span aria-hidden>|</span>
            <a
              href="https://www.iubenda.com/privacy-policy/43878034/cookie-policy"
              className="iubenda-white iubenda-noiframe iubenda-embed hover:text-accent transition-colors"
              title="Cookie Policy"
            >
              Cookie Policy
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
