import { notFound } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { LucideIcon } from "lucide-react";
import {
  Trophy,
  Award,
  ArrowLeft,
  Flame,
  Users,
  Target,
  Zap,
  Shield,
  Swords,
  Star,
  Medal,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ nickname: string }> };

const ACHIEVEMENT_ICONS: Record<string, LucideIcon> = {
  Award,
  Flame,
  Trophy,
  Medal,
  Star,
  Users,
  Target,
  Zap,
  Shield,
  Swords,
};

function getLucideIcon(name: string): LucideIcon {
  return ACHIEVEMENT_ICONS[name] ?? Award;
}

type AchievementRow = {
  id: string;
  title: string;
  description: string;
  icon_name: string;
  points: number;
  is_incremental: boolean;
  max_progress: number;
};

type UnlockedItem = AchievementRow & { unlocked_at: string };
type InProgressItem = AchievementRow & { current_progress: number; max_progress: number };
type LockedItem = AchievementRow;

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

  // JOIN: player_achievements con achievements per questo giocatore
  const { data: joinedRows } = await supabase
    .from("player_achievements")
    .select(
      `
      achievement_id,
      current_progress,
      is_unlocked,
      unlocked_at,
      achievements (
        id,
        title,
        description,
        icon_name,
        points,
        is_incremental,
        max_progress
      )
    `
    )
    .eq("player_id", profile.id);

  const { data: allAchievementsRows } = await supabase
    .from("achievements")
    .select("id, title, description, icon_name, points, is_incremental, max_progress")
    .order("created_at", { ascending: true });

  const allAchievements = (allAchievementsRows ?? []) as AchievementRow[];
  type JoinedRaw = {
    achievement_id: string;
    current_progress: number;
    is_unlocked: boolean;
    unlocked_at: string | null;
    achievements: AchievementRow | AchievementRow[] | null;
  };
  const joinedRaw = (joinedRows ?? []) as JoinedRaw[];

  const unlockedAchievements: UnlockedItem[] = [];
  const inProgressAchievements: InProgressItem[] = [];
  const lockedAchievements: LockedItem[] = [];

  const seenAchIds = new Set<string>();

  for (const row of joinedRaw) {
    const ach = Array.isArray(row.achievements) ? row.achievements[0] ?? null : row.achievements;
    if (!ach) continue;
    seenAchIds.add(ach.id);
    if (row.is_unlocked && row.unlocked_at) {
      unlockedAchievements.push({ ...ach, unlocked_at: row.unlocked_at });
    } else if (
      ach.is_incremental &&
      row.current_progress > 0 &&
      !row.is_unlocked
    ) {
      const maxP = ach.max_progress > 0 ? ach.max_progress : 1;
      inProgressAchievements.push({ ...ach, current_progress: row.current_progress, max_progress: maxP });
    } else if (!row.is_unlocked && row.current_progress === 0) {
      lockedAchievements.push(ach);
    }
  }

  for (const ach of allAchievements) {
    if (!seenAchIds.has(ach.id)) lockedAchievements.push(ach);
  }

  unlockedAchievements.sort(
    (a, b) => new Date(b.unlocked_at).getTime() - new Date(a.unlocked_at).getTime()
  );

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

        {/* Sezione 1: Trofei Conquistati 🏆 */}
        <section className="mt-10">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold uppercase tracking-wider text-barber-gold">
            <span aria-hidden>🏆</span> Trofei Conquistati
          </h2>
          {unlockedAchievements.length === 0 ? (
            <div className="rounded-xl border border-barber-gold/20 bg-barber-dark/60 px-4 py-8 text-center text-barber-paper/60">
              Nessun trofeo ancora. Partecipa alle sessioni e conquista i primi achievement!
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {unlockedAchievements.map((a) => {
                const Icon = getLucideIcon(a.icon_name);
                return (
                  <li
                    key={a.id}
                    className="group flex flex-col rounded-xl border border-barber-gold/40 bg-barber-dark/80 p-4 shadow-lg shadow-yellow-500/15 transition-all duration-200 hover:scale-105 hover:shadow-yellow-500/25 hover:shadow-xl"
                  >
                    <div className="flex flex-1 flex-col items-center text-center">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-barber-gold/20 ring-2 ring-barber-gold/30 shadow-inner">
                        <Icon className="h-7 w-7 text-barber-gold" aria-hidden />
                      </div>
                      <h3 className="mt-3 font-bold text-barber-gold">{a.title}</h3>
                      {a.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-barber-paper/70">
                          {a.description}
                        </p>
                      )}
                      <p className="mt-2 text-xs text-barber-gold/80">
                        Sbloccato il {format(new Date(a.unlocked_at), "d MMM yyyy", { locale: it })}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Sezione 2: Imprese in Corso ⏳ */}
        {inProgressAchievements.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold uppercase tracking-wider text-barber-gold/90">
              <span aria-hidden>⏳</span> Imprese in Corso
            </h2>
            <ul className="grid gap-4 sm:grid-cols-2 md:grid-cols-2">
              {inProgressAchievements.map((a) => {
                const Icon = getLucideIcon(a.icon_name);
                const pct = Math.min(100, (a.current_progress / a.max_progress) * 100);
                return (
                  <li
                    key={a.id}
                    className="flex gap-4 rounded-xl border border-barber-gold/20 bg-barber-dark/60 p-4 opacity-90"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-barber-gold/10">
                      <Icon className="h-6 w-6 text-barber-gold/80" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-barber-paper">{a.title}</h3>
                      {a.description && (
                        <p className="mt-0.5 text-sm text-barber-paper/70">{a.description}</p>
                      )}
                      <div className="mt-3">
                        <p className="mb-1 text-xs text-barber-paper/60">
                          {a.current_progress} su {a.max_progress} completati
                        </p>
                        <Progress value={pct} className="h-2.5" />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Sezione 3: Misteri da Svelare 🔒 */}
        {lockedAchievements.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold uppercase tracking-wider text-barber-paper/70">
              <span aria-hidden>🔒</span> Misteri da Svelare
            </h2>
            <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {lockedAchievements.map((a) => {
                const Icon = getLucideIcon(a.icon_name);
                return (
                  <li
                    key={a.id}
                    className="flex cursor-default flex-col rounded-xl border border-barber-paper/10 bg-barber-dark/40 p-4 opacity-50 grayscale"
                  >
                    <div className="flex flex-1 flex-col items-center text-center">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-barber-paper/10">
                        <Icon className="h-7 w-7 text-barber-paper/50" aria-hidden />
                      </div>
                      <h3 className="mt-3 font-medium text-barber-paper/90">{a.title}</h3>
                      <p className="mt-1 text-xs text-barber-paper/50">
                        Continua a giocare per svelare i requisiti
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
