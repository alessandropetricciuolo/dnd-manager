"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Crown, Swords, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { computeTeamStandings, finalistCharacterIds } from "@/lib/torneo2/standings";
import { generateTorneo2FinalAction } from "@/app/campaigns/torneo2-actions";
import type { Torneo2Setup } from "@/lib/torneo2/types";

type Props = {
  campaignId: string;
  setup: Torneo2Setup;
  onChanged?: () => void;
  canManage?: boolean;
  className?: string;
};

export function Torneo2Standings({ campaignId, setup, onChanged, canManage = false, className }: Props) {
  const { teams, matches } = setup;
  const [busy, setBusy] = useState(false);

  const standings = useMemo(() => computeTeamStandings(matches, teams), [matches, teams]);
  const finalists = useMemo(() => finalistCharacterIds(matches, teams), [matches, teams]);
  const memberByChar = useMemo(() => {
    const map = new Map<string, { name: string; teamColor: string; teamName: string }>();
    for (const t of teams) {
      for (const m of t.members) map.set(m.characterId, { name: m.name, teamColor: t.color, teamName: t.name });
    }
    return map;
  }, [teams]);

  const finalMatch = matches.find((m) => m.kind === "final_ffa") ?? null;
  const champion =
    finalMatch?.winnerCharacterId != null ? memberByChar.get(finalMatch.winnerCharacterId) ?? null : null;

  const generateFinal = async () => {
    setBusy(true);
    const res = await generateTorneo2FinalAction(campaignId);
    setBusy(false);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success(`Finale generata con ${res.data?.participantCount ?? 0} partecipanti.`);
    onChanged?.();
  };

  return (
    <div className={cn("flex flex-col gap-4 overflow-y-auto p-4", className)}>
      {champion ? (
        <div className="flex items-center gap-3 rounded-lg border border-amber-600/50 bg-amber-950/30 p-4">
          <Crown className="h-8 w-8 text-amber-400" />
          <div>
            <p className="text-[11px] uppercase tracking-wide text-amber-500/80">Campione del torneo</p>
            <p className="text-lg font-bold text-amber-200">{champion.name}</p>
            <p className="text-xs text-zinc-400">{champion.teamName}</p>
          </div>
        </div>
      ) : null}

      <section>
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-amber-400">
          <Trophy className="h-4 w-4" /> Classifica squadre
        </h3>
        <div className="overflow-hidden rounded-lg border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/80 text-[11px] uppercase text-zinc-500">
              <tr>
                <th className="px-3 py-2 text-left">Squadra</th>
                <th className="px-2 py-2 text-center">G</th>
                <th className="px-2 py-2 text-center">V</th>
                <th className="px-2 py-2 text-center">S</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/70">
              {standings.map((s) => (
                <tr key={s.teamId} className="text-zinc-200">
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full border border-black/40"
                        style={{ backgroundColor: s.teamColor }}
                      />
                      {s.teamName}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-center tabular-nums text-zinc-400">{s.played}</td>
                  <td className="px-2 py-2 text-center font-semibold tabular-nums text-emerald-300">
                    {s.wins}
                  </td>
                  <td className="px-2 py-2 text-center tabular-nums text-red-300/80">{s.losses}</td>
                </tr>
              ))}
              {standings.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-xs text-zinc-500">
                    Nessuna squadra.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-amber-400">
            <Swords className="h-4 w-4" /> Finalisti ({finalists.length})
          </h3>
          {canManage ? (
            <Button
              type="button"
              size="sm"
              className="h-7 bg-violet-700 px-2 text-[11px] hover:bg-violet-600"
              disabled={busy || finalists.length < 2}
              onClick={() => void generateFinal()}
            >
              Genera finale
            </Button>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {finalists.map((id) => {
            const m = memberByChar.get(id);
            return (
              <span
                key={id}
                className="flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-900/60 px-2.5 py-1 text-xs text-zinc-200"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: m?.teamColor ?? "#94a3b8" }}
                />
                {m?.name ?? "PG"}
              </span>
            );
          })}
          {finalists.length === 0 ? (
            <p className="text-xs text-zinc-500">
              Nessun finalista ancora: completa gli incontri di fase 1.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
