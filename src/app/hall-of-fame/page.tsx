import Link from "next/link";
import Image from "next/image";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { Trophy, Medal, Award } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HallOfFamePage() {
  const supabase = await createSupabaseServerClient();
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, nickname, avatar_url, fame_score")
    .eq("is_player_public", true)
    .order("fame_score", { ascending: false, nullsFirst: false });

  if (error) {
    return (
      <div className="min-h-screen bg-barber-dark p-8 text-center text-barber-paper/80">
        Errore nel caricamento della Classifica. Riprova più tardi.
      </div>
    );
  }

  const list = profiles ?? [];
  const top3 = list.slice(0, 3);
  const rest = list.slice(3);

  return (
    <div className="min-h-screen bg-barber-dark text-barber-paper">
      <div className="mx-auto max-w-4xl px-4 py-10 md:px-6 md:py-14">
        <header className="mb-12 text-center">
          <h1 className="flex items-center justify-center gap-3 text-3xl font-bold text-barber-gold md:text-4xl">
            <Trophy className="h-10 w-10 md:h-12 md:w-12" />
            Classifica Eroi
          </h1>
          <p className="mt-2 text-barber-paper/70">
            I campioni della Gilda, ordinati per Punti Fama. Sfoggia i tuoi achievement e conquista la vetta.
          </p>
        </header>

        {list.length === 0 ? (
          <div className="rounded-xl border border-barber-gold/20 bg-barber-dark/80 px-6 py-16 text-center">
            <p className="text-barber-paper/70">
              Nessun eroe in classifica ancora.
            </p>
            <p className="mt-2 text-sm text-barber-paper/50">
              Attiva &quot;Mostra il mio profilo nella Classifica Eroi&quot; nelle impostazioni profilo per apparire qui.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Podio: primi 3 */}
            {top3.length > 0 && (
              <section className="rounded-xl border-2 border-barber-gold/30 bg-barber-dark/80 p-6 md:p-8">
                <h2 className="mb-6 text-center text-lg font-semibold text-barber-gold">
                  Podio
                </h2>
                <div className="flex flex-col items-center justify-center gap-6 md:flex-row md:items-end md:gap-4">
                  {/* Secondo posto */}
                  {top3[1] && (
                    <div className="order-2 flex flex-col items-center md:order-1 md:flex-1">
                      <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-barber-paper/40 bg-barber-dark md:h-24 md:w-24">
                        {top3[1].avatar_url ? (
                          <Image
                            src={top3[1].avatar_url}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="96px"
                            unoptimized
                          />
                        ) : (
                          <span className="text-2xl font-bold text-barber-gold/80 md:text-3xl">2</span>
                        )}
                      </div>
                      <Medal className="mt-2 h-8 w-8 text-barber-paper/50" aria-hidden />
                      <p className="mt-1 font-medium text-barber-paper">
                        {top3[1].nickname?.trim() || "Eroe"}
                      </p>
                      <p className="text-sm font-semibold text-barber-gold">
                        {top3[1].fame_score ?? 0} PF
                      </p>
                      <div className="mt-2 h-16 w-24 rounded-t bg-barber-paper/20 md:h-20" aria-hidden />
                    </div>
                  )}
                  {/* Primo posto */}
                  {top3[0] && (
                    <div className="order-1 flex flex-col items-center md:order-2 md:flex-1">
                      <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-barber-gold bg-barber-dark md:h-28 md:w-28">
                        {top3[0].avatar_url ? (
                          <Image
                            src={top3[0].avatar_url}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="112px"
                            unoptimized
                          />
                        ) : (
                          <span className="text-3xl font-bold text-barber-gold md:text-4xl">1</span>
                        )}
                      </div>
                      <Award className="mt-2 h-10 w-10 text-barber-gold" aria-hidden />
                      <p className="mt-1 text-lg font-semibold text-barber-paper">
                        {top3[0].nickname?.trim() || "Eroe"}
                      </p>
                      <p className="text-base font-bold text-barber-gold">
                        {top3[0].fame_score ?? 0} PF
                      </p>
                      <div className="mt-2 h-20 w-28 rounded-t bg-barber-gold/30 md:h-24" aria-hidden />
                    </div>
                  )}
                  {/* Terzo posto */}
                  {top3[2] && (
                    <div className="order-3 flex flex-col items-center md:flex-1">
                      <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-barber-red/50 bg-barber-dark md:h-24 md:w-24">
                        {top3[2].avatar_url ? (
                          <Image
                            src={top3[2].avatar_url}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="96px"
                            unoptimized
                          />
                        ) : (
                          <span className="text-2xl font-bold text-amber-600 md:text-3xl">3</span>
                        )}
                      </div>
                      <Medal className="mt-2 h-8 w-8 text-amber-600/80" aria-hidden />
                      <p className="mt-1 font-medium text-barber-paper">
                        {top3[2].nickname?.trim() || "Eroe"}
                      </p>
                      <p className="text-sm font-semibold text-barber-gold">
                        {top3[2].fame_score ?? 0} PF
                      </p>
                      <div className="mt-2 h-12 w-24 rounded-t bg-amber-900/30 md:h-16" aria-hidden />
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Dal 4° in giù */}
            {rest.length > 0 && (
              <section className="rounded-xl border border-barber-gold/20 bg-barber-dark/80 overflow-hidden">
                <h2 className="border-b border-barber-gold/20 px-4 py-3 text-sm font-semibold text-barber-gold md:px-6">
                  Classifica
                </h2>
                <ul className="divide-y divide-barber-gold/10">
                  {rest.map((p, idx) => {
                    const position = 4 + idx;
                    return (
                      <li key={p.id}>
                        <Link
                          href={p.nickname ? `/player/${encodeURIComponent(p.nickname.trim())}` : "#"}
                          className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-barber-gold/10 md:px-6"
                        >
                          <span className="w-8 shrink-0 text-sm font-medium text-barber-paper/60">
                            #{position}
                          </span>
                          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-barber-gold/20 bg-barber-dark">
                            {p.avatar_url ? (
                              <Image
                                src={p.avatar_url}
                                alt=""
                                fill
                                className="object-cover"
                                sizes="40px"
                                unoptimized
                              />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center text-xs font-medium text-barber-gold/60">
                                {position}
                              </span>
                            )}
                          </div>
                          <span className="min-w-0 flex-1 font-medium text-barber-paper truncate">
                            {p.nickname?.trim() || "Eroe"}
                          </span>
                          <span className="shrink-0 font-semibold text-barber-gold">
                            {p.fame_score ?? 0} PF
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
