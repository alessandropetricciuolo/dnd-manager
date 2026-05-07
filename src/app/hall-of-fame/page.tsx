import Link from "next/link";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { Crown, Medal, Star } from "lucide-react";

export const revalidate = 300;

type PublicHeroProfile = {
  id: string;
  nickname: string | null;
  avatar_url: string | null;
  fame_score: number | null;
};

export default async function HallOfFamePage() {
  const supabase = createSupabaseAdminClient();
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, nickname, avatar_url, fame_score")
    .eq("is_player_public", true)
    .not("nickname", "is", null)
    .order("fame_score", { ascending: false, nullsFirst: false })
    .order("nickname", { ascending: true });

  if (error) {
    return (
      <div className="min-h-screen bg-barber-dark p-8 text-center text-barber-paper/80">
        Errore nel caricamento della Classifica. Riprova più tardi.
      </div>
    );
  }

  const list = (profiles ?? []) as PublicHeroProfile[];
  const top3 = list.slice(0, 3);
  const rest = list.slice(3);

  function playerUrl(nickname: string | null): string {
    const n = nickname?.trim();
    return n ? `/player/${encodeURIComponent(n)}` : "#";
  }

  return (
    <div className="min-h-screen bg-barber-dark text-barber-paper">
      <div className="mx-auto max-w-4xl px-4 py-10 md:px-6 md:py-14">
        {/* Titolo epico */}
        <header className="mb-12 text-center">
          <h1 className="font-serif text-4xl font-bold leading-tight tracking-tight text-barber-gold drop-shadow-lg md:text-5xl">
            Salone degli Eroi
          </h1>
          <p className="mt-3 font-serif text-lg italic text-barber-paper/80 md:text-xl">
            I nomi che riecheggiano nell&apos;eternità
          </p>
        </header>

        {list.length === 0 ? (
          <div className="rounded-xl border border-barber-gold/20 bg-barber-dark/80 px-6 py-16 text-center shadow-xl">
            <p className="text-barber-paper/70">
              Nessun eroe in classifica ancora.
            </p>
            <p className="mt-2 text-sm text-barber-paper/50">
              Attiva &quot;Mostra il mio profilo nella Classifica Eroi&quot; nelle impostazioni profilo per apparire qui.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Podio: Top 3 */}
            {top3.length > 0 && (
              <section className="rounded-2xl border border-barber-gold/30 bg-gradient-to-b from-barber-dark/90 to-barber-dark/70 p-6 shadow-2xl shadow-black/30 md:p-8">
                <h2 className="sr-only">Podio</h2>
                <div className="flex flex-col items-center justify-end gap-4 md:flex-row md:items-end md:justify-center md:gap-6">
                  {/* 2° posto - Sinistra, più in basso */}
                  {top3[1] && (
                    <Link
                      href={playerUrl(top3[1].nickname)}
                      className="order-2 flex flex-col items-center transition-transform hover:scale-105 md:order-1 md:flex-1 md:max-w-[200px]"
                    >
                      <div className="relative flex h-20 w-20 shrink-0 overflow-hidden rounded-full border-4 border-slate-400/80 bg-barber-dark shadow-lg md:h-24 md:w-24">
                        {top3[1].avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={top3[1].avatar_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-slate-400 md:text-3xl">
                            2
                          </span>
                        )}
                      </div>
                      <Medal className="mt-2 h-8 w-8 text-slate-400" aria-hidden />
                      <p className="mt-1 font-semibold text-barber-paper">
                        {top3[1].nickname?.trim() || "Eroe"}
                      </p>
                      <p className="text-sm font-bold text-barber-gold">
                        {top3[1].fame_score ?? 0} PF
                      </p>
                      <div className="mt-3 h-14 w-24 rounded-t bg-slate-600/40 md:h-16" aria-hidden />
                    </Link>
                  )}

                  {/* 1° posto - Centro, più in alto */}
                  {top3[0] && (
                    <Link
                      href={playerUrl(top3[0].nickname)}
                      className="order-1 flex flex-col items-center transition-transform hover:scale-105 md:order-2 md:flex-1 md:max-w-[220px]"
                    >
                      <div className="relative flex h-28 w-28 shrink-0 overflow-hidden rounded-full border-4 border-barber-gold bg-barber-dark shadow-xl shadow-yellow-500/20 md:h-32 md:w-32">
                        {top3[0].avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={top3[0].avatar_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-3xl font-bold text-barber-gold md:text-4xl">
                            1
                          </span>
                        )}
                      </div>
                      <Crown className="mt-2 h-10 w-10 text-barber-gold" aria-hidden />
                      <p className="mt-1 text-lg font-bold text-barber-paper">
                        {top3[0].nickname?.trim() || "Eroe"}
                      </p>
                      <p className="text-base font-bold text-barber-gold">
                        {top3[0].fame_score ?? 0} PF
                      </p>
                      <div className="mt-3 h-20 w-28 rounded-t bg-barber-gold/30 shadow-lg md:h-24" aria-hidden />
                    </Link>
                  )}

                  {/* 3° posto - Destra, ancora più in basso */}
                  {top3[2] && (
                    <Link
                      href={playerUrl(top3[2].nickname)}
                      className="order-3 flex flex-col items-center transition-transform hover:scale-105 md:flex-1 md:max-w-[200px]"
                    >
                      <div className="relative flex h-20 w-20 shrink-0 overflow-hidden rounded-full border-4 border-amber-700/80 bg-barber-dark shadow-lg md:h-24 md:w-24">
                        {top3[2].avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={top3[2].avatar_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-amber-700 md:text-3xl">
                            3
                          </span>
                        )}
                      </div>
                      <Medal className="mt-2 h-8 w-8 text-amber-600" aria-hidden />
                      <p className="mt-1 font-semibold text-barber-paper">
                        {top3[2].nickname?.trim() || "Eroe"}
                      </p>
                      <p className="text-sm font-bold text-barber-gold">
                        {top3[2].fame_score ?? 0} PF
                      </p>
                      <div className="mt-3 h-12 w-24 rounded-t bg-amber-900/40 md:h-14" aria-hidden />
                    </Link>
                  )}
                </div>
              </section>
            )}

            {/* Classifica: dal 4° in poi */}
            {rest.length > 0 && (
              <section className="overflow-hidden rounded-xl border border-barber-gold/20 bg-barber-dark/80 shadow-xl">
                <h2 className="border-b border-barber-gold/20 px-4 py-3 text-sm font-semibold uppercase tracking-wider text-barber-gold/90 md:px-6">
                  Classifica
                </h2>
                <ul className="divide-y divide-barber-gold/10">
                  {rest.map((p, idx) => {
                    const position = 4 + idx;
                    const href = playerUrl(p.nickname);
                    return (
                      <li key={p.id}>
                        <Link
                          href={href}
                          className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-barber-gold/10 md:px-6"
                        >
                          <span className="w-10 shrink-0 text-left text-sm font-medium text-barber-paper/50">
                            #{position}
                          </span>
                          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-barber-gold/20 bg-barber-dark/80">
                            {p.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={p.avatar_url}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center text-xs font-medium text-barber-gold/50">
                                {position}
                              </span>
                            )}
                          </div>
                          <span className="min-w-0 flex-1 truncate font-medium text-barber-paper">
                            {p.nickname?.trim() || "Eroe"}
                          </span>
                          <span className="flex shrink-0 items-center gap-1.5 font-semibold text-barber-gold">
                            <Star className="h-4 w-4 text-yellow-500/90" aria-hidden />
                            {p.fame_score ?? 0}
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
