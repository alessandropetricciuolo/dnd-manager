import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";
import { Trophy, Award, ArrowLeft, Flame } from "lucide-react";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ nickname: string }> };

const ACHIEVEMENT_ICONS: Record<string, LucideIcon> = {
  Award,
  Flame,
  Trophy,
};

function getLucideIcon(name: string): LucideIcon {
  return ACHIEVEMENT_ICONS[name] ?? Award;
}

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

  const { data: unlocked } = await supabase
    .from("player_achievements")
    .select(
      "id, unlocked_at, achievements(id, title, description, icon_name, points)"
    )
    .eq("player_id", profile.id)
    .order("unlocked_at", { ascending: false });

  const achievements = (unlocked ?? []).map((u) => {
    const a = (u as { achievements: { id: string; title: string; description: string; icon_name: string; points: number } | null }).achievements;
    return a ? { ...a, unlocked_at: (u as { unlocked_at: string }).unlocked_at } : null;
  }).filter(Boolean) as Array<{ id: string; title: string; description: string; icon_name: string; points: number; unlocked_at: string }>;

  const displayName = profile.nickname?.trim() || "Eroe";

  return (
    <div className="min-h-screen bg-barber-dark text-barber-paper">
      <div className="mx-auto max-w-2xl px-4 py-8 md:px-6 md:py-12">
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

        <div className="rounded-xl border-2 border-barber-gold/30 bg-barber-dark/80 p-6 md:p-8">
          <div className="flex flex-col items-center text-center">
            <div className="relative h-24 w-24 overflow-hidden rounded-full border-4 border-barber-gold/40 bg-barber-dark md:h-28 md:w-28">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="112px"
                  unoptimized
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Award className="h-12 w-12 text-barber-gold/50" />
                </div>
              )}
            </div>
            <h1 className="mt-4 text-xl font-bold text-barber-gold md:text-2xl">
              {displayName}
            </h1>
            <p className="mt-1 flex items-center gap-2 text-lg font-semibold text-barber-paper/90">
              <Trophy className="h-5 w-5 text-barber-gold" />
              {profile.fame_score ?? 0} Punti Fama
            </p>
          </div>

          <section className="mt-8 border-t border-barber-gold/20 pt-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-barber-gold/90">
              Badge sbloccati
            </h2>
            {achievements.length === 0 ? (
              <p className="rounded-lg border border-barber-gold/20 bg-barber-dark/60 px-4 py-6 text-center text-sm text-barber-paper/60">
                Nessun achievement sbloccato ancora. Partecipa alle sessioni e conquista i trofei!
              </p>
            ) : (
              <ul className="space-y-3">
                {achievements.map((a) => {
                  const Icon = getLucideIcon(a.icon_name);
                  return (
                    <li
                      key={a.id}
                      className="flex items-start gap-4 rounded-lg border border-barber-gold/20 bg-barber-dark/60 p-4"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-barber-gold/20">
                        <Icon className="h-5 w-5 text-barber-gold" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-barber-paper">{a.title}</p>
                        {a.description && (
                          <p className="mt-0.5 text-sm text-barber-paper/70">{a.description}</p>
                        )}
                        <p className="mt-1 text-xs text-barber-gold/80">
                          +{a.points} PF · Sbloccato il{" "}
                          {new Date(a.unlocked_at).toLocaleDateString("it-IT")}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
