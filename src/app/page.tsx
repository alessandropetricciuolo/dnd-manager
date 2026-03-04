import Link from "next/link";
import Image from "next/image";
import { Sword, Map, Scroll } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-barber-dark">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-barber-dark via-barber-dark to-barber-dark/95">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(251,191,36,0.12),transparent)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:py-32">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div className="text-center lg:text-left">
              <h1 className="font-serif text-4xl font-bold tracking-tight text-barber-gold sm:text-5xl lg:text-6xl">
                Barber & Dragons 
              </h1>
              <p className="mt-6 max-w-xl text-lg text-barber-paper/80">
                La community di D&D di cui c&apos;era bisogno. 
              </p>
              <div className="mt-10">
                <Button
                  asChild
                  size="lg"
                  className="bg-barber-red px-8 py-6 text-lg font-semibold text-barber-paper hover:bg-barber-red/90"
                >
                  <Link href="/login">Unisciti all&apos;Avventura</Link>
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
                  className="relative z-10 w-64 object-contain sm:w-80"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-barber-gold/20 bg-barber-dark/98 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="font-serif text-center text-2xl font-semibold text-barber-gold sm:text-3xl">
            Tutto ciò che serve per giocare
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            <article className="rounded-xl border border-barber-gold/30 bg-barber-dark p-6 shadow-lg transition-colors hover:border-barber-gold/50">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-barber-gold/20 text-barber-gold">
                <Sword className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-serif text-xl font-semibold text-barber-gold">
                Campagne Epiche
              </h3>
              <p className="mt-2 text-sm text-barber-paper/70">
                Partecipa alle nostre campagne. Un calendario e una bacheca per Master e giocatori.
              </p>
            </article>
            <article className="rounded-xl border border-barber-gold/30 bg-barber-dark p-6 shadow-lg transition-colors hover:border-barber-gold/50">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-barber-gold/20 text-barber-gold">
                <Map className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-serif text-xl font-semibold text-barber-gold">
                Schede Personaggio
              </h3>
              <p className="mt-2 text-sm text-barber-paper/70">
                Gestisci le tue iscrizioni e scopri il mondo di gioco sbloccato dopo ogni avventura.
              </p>
            </article>
            <article className="rounded-xl border border-barber-gold/30 bg-barber-dark p-6 shadow-lg transition-colors hover:border-barber-gold/50">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-barber-gold/20 text-barber-gold">
                <Scroll className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-serif text-xl font-semibold text-barber-gold">
                Wiki del Mondo
              </h3>
              <p className="mt-2 text-sm text-barber-paper/70">
                NPC, luoghi, mostri, oggetti e lore. Mappe interattive e molto altro ancora.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-barber-gold/20 py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-barber-paper/60 sm:px-6">
          © {new Date().getFullYear()} Barber & Dragons. Tutti i diritti riservati.
        </div>
      </footer>
    </main>
  );
}
