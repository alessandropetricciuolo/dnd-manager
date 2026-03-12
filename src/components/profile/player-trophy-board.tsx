import { Progress } from "@/components/ui/progress";
import type { LucideIcon } from "lucide-react";
import {
  Trophy,
  Award,
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

export type TrophyUnlockedItem = {
  id: string;
  title: string;
  description: string;
  icon_name: string;
  points: number;
  is_incremental: boolean;
  max_progress: number;
  unlocked_at: string;
};

export type TrophyInProgressItem = {
  id: string;
  title: string;
  description: string;
  icon_name: string;
  points: number;
  is_incremental: boolean;
  max_progress: number;
  current_progress: number;
};

export type TrophyLockedItem = {
  id: string;
  title: string;
  description: string;
  icon_name: string;
  points: number;
  is_incremental: boolean;
  max_progress: number;
};

type Props = {
  unlocked: TrophyUnlockedItem[];
  inProgress: TrophyInProgressItem[];
  locked: TrophyLockedItem[];
};

export function PlayerTrophyBoard({ unlocked, inProgress, locked }: Props) {
  return (
    <div className="space-y-10">
      {/* Sezione 1: Trofei Conquistati 🏆 */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold uppercase tracking-wider text-barber-gold">
          <span aria-hidden>🏆</span> Trofei Conquistati
        </h2>
        {unlocked.length === 0 ? (
          <div className="rounded-xl border border-barber-gold/20 bg-barber-dark/60 px-4 py-8 text-center text-barber-paper/60">
            Nessun trofeo ancora. Partecipa alle sessioni e conquista i primi achievement!
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {unlocked.map((a) => {
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
      {inProgress.length > 0 && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold uppercase tracking-wider text-barber-gold/90">
            <span aria-hidden>⏳</span> Imprese in Corso
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2 md:grid-cols-2">
            {inProgress.map((a) => {
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
      {locked.length > 0 && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold uppercase tracking-wider text-barber-paper/70">
            <span aria-hidden>🔒</span> Misteri da Svelare
          </h2>
          <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {locked.map((a) => {
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
  );
}
