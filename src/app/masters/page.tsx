import Link from "next/link";
import Image from "next/image";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { Button } from "@/components/ui/button";
import { Swords, Theater, Skull } from "lucide-react";

export const revalidate = 300;

type PublicGmProfile = {
  id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  portrait_url: string | null;
  stat_combat: number | null;
  stat_roleplay: number | null;
  stat_lethality: number | null;
};

export default async function MastersPage() {
  const supabase = createSupabaseAdminClient();
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select(
      "id, display_name, first_name, last_name, username, portrait_url, stat_combat, stat_roleplay, stat_lethality"
    )
    .eq("is_gm_public", true)
    .not("username", "is", null)
    .order("username");

  if (error) {
    return (
      <div className="min-h-screen bg-guild-void p-8 text-center text-crimson-light font-serif">
        Errore nel caricamento dell&apos;Albo dei Master. Riprova più tardi.
      </div>
    );
  }

  const list = (profiles ?? []) as PublicGmProfile[];

  return (
    <div className="min-h-screen bg-guild-void text-parchment-100 font-sans">
      <div className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
        <header className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-brass-base/40 bg-guild-oak/90 px-4 py-1 text-xs font-serif uppercase tracking-[0.2em] text-brass-light shadow-sm">
            <span>✦ La Loggia dei Narratori ✦</span>
          </div>
          <h1 className="mt-4 font-serif text-3xl font-extrabold tracking-tight text-gold-relief md:text-5xl">
            Albo dei Maestri di Gilda
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-parchment-300 md:text-base">
            I Dungeon Master ufficiali di Barber &amp; Dragons. Esplora i loro dossier, scopri lo stile narrativo e scegli chi guiderà il tuo destino.
          </p>
        </header>

        {list.length === 0 ? (
          <div className="card-guild-stone rounded-2xl p-12 text-center max-w-lg mx-auto">
            <p className="font-serif text-lg text-brass-light">
              Nessun Master ha ancora reso pubblico il proprio dossier.
            </p>
            <p className="mt-2 text-xs text-parchment-500">
              Torna più tardi o accedi come GM per pubblicare la tua pergamena.
            </p>
          </div>
        ) : (
          <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((p) => {
              const displayName =
                [p.first_name, p.last_name].filter(Boolean).join(" ") ||
                p.display_name ||
                p.username ||
                "Master";
              const href = `/master/${encodeURIComponent(p.username!.trim())}`;
              return (
                <Link key={p.id} href={href} className="group block">
                  <article className="card-guild-stone relative aspect-[3/4] w-full overflow-hidden rounded-2xl border-2 border-brass-base/30 shadow-xl transition-all duration-300 group-hover:-translate-y-1.5 group-hover:border-brass-base/70 group-hover:shadow-[0_12px_30px_rgba(200,157,73,0.15)]">
                    <div className="corner-ornament-tl" />
                    <div className="corner-ornament-tr" />
                    <div className="corner-ornament-bl" />
                    <div className="corner-ornament-br" />

                    {/* Sfondo: ritratto con gradiente scuro drammatico */}
                    {p.portrait_url ? (
                      <>
                        <Image
                          src={p.portrait_url}
                          alt=""
                          fill
                          className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          unoptimized
                        />
                        <div
                          className="absolute inset-0 bg-gradient-to-t from-guild-void via-guild-void/65 to-transparent opacity-95"
                          aria-hidden
                        />
                      </>
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-guild-oak to-guild-void flex items-center justify-center">
                        <Swords className="h-16 w-16 text-brass-base/20" />
                      </div>
                    )}

                    {/* Badge Araldico in alto a destra */}
                    <div className="absolute right-4 top-4 rounded-full border border-brass-base/40 bg-guild-void/80 px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wider text-brass-light backdrop-blur">
                      Dossier Ufficiale
                    </div>

                    {/* Contenuto sopra il gradiente */}
                    <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3.5 p-6">
                      <div>
                        <span className="text-[11px] font-mono uppercase tracking-widest text-brass-base/90">
                          Maestro Narratore
                        </span>
                        <h2 className="font-serif text-2xl font-bold text-parchment-100 drop-shadow-md group-hover:text-brass-light transition-colors">
                          {displayName}
                        </h2>
                      </div>

                      {/* Statistiche Tattiche */}
                      <div className="flex flex-wrap items-center gap-2.5 rounded-lg border border-brass-base/20 bg-guild-stone/90 p-2.5 backdrop-blur text-xs">
                        <span className="flex items-center gap-1 text-parchment-200" title="Combattimento">
                          <Swords className="h-3.5 w-3.5 text-brass-base" />
                          <span className="font-mono font-bold text-brass-light">{p.stat_combat ?? "-"}</span>
                        </span>
                        <span className="text-guild-border">•</span>
                        <span className="flex items-center gap-1 text-parchment-200" title="Interpretazione / RP">
                          <Theater className="h-3.5 w-3.5 text-brass-base" />
                          <span className="font-mono font-bold text-brass-light">{p.stat_roleplay ?? "-"}</span>
                        </span>
                        <span className="text-guild-border">•</span>
                        <span className="flex items-center gap-1 text-parchment-200" title="Tasso di Mortalità">
                          <Skull className="h-3.5 w-3.5 text-crimson-light" />
                          <span className="font-mono font-bold text-crimson-light">{p.stat_lethality ?? "-"}</span>
                        </span>
                      </div>

                      <Button
                        size="sm"
                        variant="stone"
                        className="w-full text-xs font-serif uppercase tracking-widest font-semibold text-brass-light group-hover:border-brass-base/80"
                        asChild
                      >
                        <span>Apri Pergamena Dossier →</span>
                      </Button>
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
