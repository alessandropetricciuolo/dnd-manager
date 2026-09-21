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
      <div className="min-h-screen bg-guild-void p-8 text-center text-crimson-light font-serif">
        Errore nel caricamento del Salone degli Eroi. Riprova più tardi.
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
    <div className="min-h-screen bg-guild-void text-parchment-100 font-sans">
      <div className="mx-auto max-w-4xl px-4 py-12 md:px-6 md:py-16">
        {/* Titolo epico */}
        <header className="mb-14 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-brass-base/40 bg-guild-oak/90 px-4 py-1 text-xs font-serif uppercase tracking-[0.2em] text-brass-light shadow-sm">
            <span>✦ Pantheon di Barber &amp; Dragons ✦</span>
          </div>
          <h1 className="mt-4 font-serif text-4xl font-extrabold tracking-tight text-gold-relief md:text-5xl">
            Salone degli Eroi
          </h1>
          <p className="mt-2.5 font-serif text-base italic text-parchment-300 md:text-lg">
            I campioni le cui gesta riecheggiano nei canti della Gilda.
          </p>
        </header>

        {list.length === 0 ? (
          <div className="card-guild-stone rounded-2xl p-12 text-center max-w-lg mx-auto shadow-2xl">
            <p className="font-serif text-lg text-brass-light">
              Nessun eroe è ancora asceso al Pantheon.
            </p>
            <p className="mt-2 text-xs text-parchment-500">
              Attiva &quot;Mostra il mio profilo nella Classifica Eroi&quot; nelle impostazioni profilo per guadagnare gloria.
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Podio: Top 3 */}
            {top3.length > 0 && (
              <section className="card-guild-stone relative rounded-2xl p-7 shadow-2xl md:p-10">
                <div className="corner-ornament-tl" />
                <div className="corner-ornament-tr" />
                <div className="corner-ornament-bl" />
                <div className="corner-ornament-br" />

                <h2 className="sr-only">Podio dei Tre Grandi</h2>
                <div className="flex flex-col items-center justify-end gap-6 md:flex-row md:items-end md:justify-center md:gap-8 pt-4">
                  {/* 2° posto - Argento (Sinistra) */}
                  {top3[1] && (
                    <Link
                      href={playerUrl(top3[1].nickname)}
                      className="order-2 flex flex-col items-center transition-transform hover:scale-105 md:order-1 md:flex-1 md:max-w-[200px]"
                    >
                      <div className="relative flex h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-slate-400 bg-guild-void shadow-lg md:h-24 md:w-24">
                        {top3[1].avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={top3[1].avatar_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center font-serif text-2xl font-bold text-slate-300 md:text-3xl">
                            2
                          </span>
                        )}
                      </div>
                      <Medal className="mt-2.5 h-7 w-7 text-slate-400" aria-hidden />
                      <p className="mt-1 font-serif text-base font-bold text-parchment-100">
                        {top3[1].nickname?.trim() || "Eroe"}
                      </p>
                      <p className="font-mono text-xs font-bold text-slate-300">
                        {top3[1].fame_score ?? 0} PF
                      </p>
                      <div className="mt-3 flex h-16 w-24 items-center justify-center rounded-t-lg border-t-2 border-slate-500 bg-slate-800/60 font-serif text-sm font-bold text-slate-400 md:h-20" aria-hidden>
                        II
                      </div>
                    </Link>
                  )}

                  {/* 1° posto - Oro (Centro, Sovrano) */}
                  {top3[0] && (
                    <Link
                      href={playerUrl(top3[0].nickname)}
                      className="order-1 flex flex-col items-center transition-transform hover:scale-105 md:order-2 md:flex-1 md:max-w-[220px]"
                    >
                      <div className="relative flex h-28 w-28 shrink-0 overflow-hidden rounded-full border-4 border-brass-light bg-guild-void shadow-[0_0_35px_rgba(200,157,73,0.35)] md:h-32 md:w-32">
                        {top3[0].avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={top3[0].avatar_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center font-serif text-3xl font-black text-brass-light md:text-4xl">
                            1
                          </span>
                        )}
                      </div>
                      <Crown className="mt-3 h-9 w-9 text-brass-light drop-shadow" aria-hidden />
                      <p className="mt-1 font-serif text-lg font-black text-gold-relief">
                        {top3[0].nickname?.trim() || "Eroe"}
                      </p>
                      <p className="font-mono text-sm font-bold text-brass-light">
                        {top3[0].fame_score ?? 0} PF
                      </p>
                      <div className="mt-3 flex h-24 w-28 items-center justify-center rounded-t-lg border-t-2 border-brass-base bg-gradient-to-b from-brass-base/30 to-brass-base/10 font-serif text-lg font-black text-brass-light shadow-lg md:h-28" aria-hidden>
                        I
                      </div>
                    </Link>
                  )}

                  {/* 3° posto - Bronzo (Destra) */}
                  {top3[2] && (
                    <Link
                      href={playerUrl(top3[2].nickname)}
                      className="order-3 flex flex-col items-center transition-transform hover:scale-105 md:flex-1 md:max-w-[200px]"
                    >
                      <div className="relative flex h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-amber-700 bg-guild-void shadow-lg md:h-24 md:w-24">
                        {top3[2].avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={top3[2].avatar_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center font-serif text-2xl font-bold text-amber-600 md:text-3xl">
                            3
                          </span>
                        )}
                      </div>
                      <Medal className="mt-2.5 h-7 w-7 text-amber-600" aria-hidden />
                      <p className="mt-1 font-serif text-base font-bold text-parchment-100">
                        {top3[2].nickname?.trim() || "Eroe"}
                      </p>
                      <p className="font-mono text-xs font-bold text-amber-500">
                        {top3[2].fame_score ?? 0} PF
                      </p>
                      <div className="mt-3 flex h-14 w-24 items-center justify-center rounded-t-lg border-t-2 border-amber-800 bg-amber-950/50 font-serif text-sm font-bold text-amber-600 md:h-16" aria-hidden>
                        III
                      </div>
                    </Link>
                  )}
                </div>
              </section>
            )}

            {/* Classifica: dal 4° in poi */}
            {rest.length > 0 && (
              <section className="card-guild-stone overflow-hidden rounded-2xl shadow-xl">
                <div className="border-b border-brass-base/20 bg-guild-oak/60 px-5 py-3.5 md:px-6">
                  <h2 className="font-serif text-xs font-bold uppercase tracking-[0.2em] text-brass-light">
                    ✦ Registro degli Eroi di Gilda
                  </h2>
                </div>
                <ul className="divide-y divide-guild-border">
                  {rest.map((p, idx) => {
                    const position = 4 + idx;
                    const href = playerUrl(p.nickname);
                    return (
                      <li key={p.id}>
                        <Link
                          href={href}
                          className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-brass-base/10 md:px-6"
                        >
                          <span className="w-8 shrink-0 text-left font-mono text-xs font-bold text-parchment-500">
                            #{position}
                          </span>
                          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-brass-base/30 bg-guild-void">
                            {p.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={p.avatar_url}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center font-serif text-xs font-bold text-brass-base/60">
                                {position}
                              </span>
                            )}
                          </div>
                          <span className="min-w-0 flex-1 truncate font-serif font-semibold text-parchment-100">
                            {p.nickname?.trim() || "Eroe"}
                          </span>
                          <span className="flex shrink-0 items-center gap-1.5 font-mono text-xs font-bold text-brass-light">
                            <Star className="h-3.5 w-3.5 text-brass-base" aria-hidden />
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
