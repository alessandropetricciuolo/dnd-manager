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
      <div className="min-h-screen bg-barber-dark p-8 text-center text-barber-paper/80">
        Errore nel caricamento dell&apos;Albo. Riprova più tardi.
      </div>
    );
  }

  const list = (profiles ?? []) as PublicGmProfile[];

  return (
    <div className="min-h-screen bg-barber-dark text-barber-paper">
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-14">
        <header className="mb-10 text-center">
          <h1 className="font-serif text-3xl font-bold tracking-tight text-barber-gold md:text-4xl">
            Albo dei Master
          </h1>
          <p className="mt-2 text-barber-paper/70">
            I narratori che rendono pubblico il proprio dossier. Sfoglia e scopri il loro stile.
          </p>
        </header>

        {list.length === 0 ? (
          <div className="rounded-xl border border-barber-gold/20 bg-barber-dark/80 px-6 py-16 text-center">
            <p className="text-barber-paper/70">
              Nessun Master ha ancora reso pubblico il proprio profilo.
            </p>
            <p className="mt-2 text-sm text-barber-paper/50">
              Torna più tardi o accedi come GM per pubblicare il tuo dossier.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((p) => {
              const displayName =
                [p.first_name, p.last_name].filter(Boolean).join(" ") ||
                p.display_name ||
                p.username ||
                "Master";
              const href = `/master/${encodeURIComponent(p.username!.trim())}`;
              return (
                <Link key={p.id} href={href} className="group block">
                  <article className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border-2 border-barber-gold/30 bg-barber-dark shadow-lg transition-all group-hover:border-barber-gold/50 group-hover:shadow-barber-gold/10">
                    {/* Sfondo: ritratto con gradiente in basso */}
                    {p.portrait_url ? (
                      <>
                        <Image
                          src={p.portrait_url}
                          alt=""
                          fill
                          className="object-cover object-top transition-transform group-hover:scale-105"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          unoptimized
                        />
                        <div
                          className="absolute inset-0 bg-gradient-to-t from-barber-dark via-barber-dark/60 to-transparent"
                          aria-hidden
                        />
                      </>
                    ) : (
                      <div className="absolute inset-0 bg-barber-gold/10" />
                    )}

                    {/* Contenuto sopra il gradiente */}
                    <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-5">
                      <h2 className="text-lg font-bold text-barber-paper drop-shadow-md">
                        {displayName}
                      </h2>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-barber-paper/90">
                        <span className="flex items-center gap-1" title="Combattimento">
                          <Swords className="h-3.5 w-3.5 text-barber-gold/90" />
                          {p.stat_combat}
                        </span>
                        <span className="flex items-center gap-1" title="Roleplay">
                          <Theater className="h-3.5 w-3.5 text-barber-gold/90" />
                          {p.stat_roleplay}
                        </span>
                        <span className="flex items-center gap-1" title="Mortalità">
                          <Skull className="h-3.5 w-3.5 text-barber-gold/90" />
                          {p.stat_lethality}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        className="w-fit bg-barber-gold text-barber-dark hover:bg-barber-gold/90"
                        asChild
                      >
                        <span>Leggi Dossier</span>
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
