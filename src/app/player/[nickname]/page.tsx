import { notFound } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/button";
import { Award, ArrowLeft, Star } from "lucide-react";
import { getTrophyDataForPlayer } from "@/lib/trophy-data";
import { PlayerTrophyBoard } from "@/components/profile/player-trophy-board";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ nickname: string }> };

export default async function PlayerProfilePage({ params }: Props) {
  const { nickname: nicknameParam } = await params;
  const nicknameDecoded = decodeURIComponent(nicknameParam).trim();
  if (!nicknameDecoded) notFound();

  const supabase = await createSupabaseServerClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, nickname, avatar_url, fame_score")
    .eq("is_player_public", true)
    .ilike("nickname", nicknameDecoded)
    .maybeSingle();

  if (profileError || !profile) notFound();

  const trophyData = await getTrophyDataForPlayer(profile.id);

  const displayName = profile.nickname?.trim() || "Eroe";
  const fameScore = profile.fame_score ?? 0;

  return (
    <div className="min-h-screen bg-barber-dark text-barber-paper">
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-6 md:py-12">
        <div className="mb-6">
          <Link href="/hall-of-fame">
            <Button
              variant="ghost"
              size="sm"
              className="text-barber-paper/80 hover:text-barber-paper"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Classifica Eroi
            </Button>
          </Link>
        </div>

        {/* Hero */}
        <header className="rounded-2xl border border-barber-gold/30 bg-gradient-to-b from-barber-dark/90 to-barber-dark/70 px-6 py-8 shadow-xl shadow-black/20 md:px-8 md:py-10">
          <div className="flex flex-col items-center text-center">
            <div className="relative h-28 w-28 overflow-hidden rounded-full border-4 border-barber-gold/60 shadow-lg shadow-yellow-500/20 md:h-32 md:w-32">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-barber-dark/80">
                  <Award className="h-14 w-14 text-barber-gold/50" />
                </div>
              )}
            </div>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-barber-paper md:text-5xl">
              {displayName}
            </h1>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-barber-gold/40 bg-barber-gold/10 px-4 py-2">
              <Star className="h-5 w-5 text-yellow-400" aria-hidden />
              <span className="text-lg font-semibold text-barber-gold">
                Punti Fama: {fameScore} 🌟
              </span>
            </div>
          </div>
        </header>

        <div className="mt-10">
          <PlayerTrophyBoard
            unlocked={trophyData.unlocked}
            inProgress={trophyData.inProgress}
            locked={trophyData.locked}
          />
        </div>
      </div>
    </div>
  );
}
