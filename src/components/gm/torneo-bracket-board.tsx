"use client";

import { useMemo } from "react";
import { Trophy } from "lucide-react";
import { BRACKET_ROUND, roundLabel } from "@/lib/torneo/bracket";
import type { TorneoMatchWithTeams } from "@/lib/torneo/types";
import { cn } from "@/lib/utils";

type Props = {
  matches: TorneoMatchWithTeams[];
  className?: string;
};

function matchTitle(m: TorneoMatchWithTeams): string {
  if (m.match_kind === "triello") return "Triello";
  return m.label ?? `${m.team_a.name} vs ${m.team_b.name}`;
}

function MatchNode({ m }: { m: TorneoMatchWithTeams }) {
  const done = m.status === "completed";
  const active = m.status === "active";
  const winnerName =
    done && m.match_kind === "triello" && m.winner_character_id
      ? "Campione triello"
      : done && m.winner_team_id
        ? m.winner_team_id === m.team_a_id
          ? m.team_a.name
          : m.team_b.name
        : null;

  return (
    <div
      className={cn(
        "min-w-[140px] rounded-lg border px-2.5 py-2 text-[11px]",
        active && "border-amber-500/60 bg-amber-950/30",
        done && "border-emerald-700/40 bg-emerald-950/20",
        !active && !done && "border-zinc-700/80 bg-zinc-900/60"
      )}
    >
      <p className="font-semibold text-zinc-200">{matchTitle(m)}</p>
      {m.match_kind !== "triello" ? (
        <p className="mt-0.5 truncate text-zinc-500">
          <span style={{ color: m.team_a.color }}>{m.team_a.name}</span>
          {" vs "}
          <span style={{ color: m.team_b.color }}>{m.team_b.name}</span>
        </p>
      ) : (
        <p className="mt-0.5 text-zinc-500">Squadra {m.team_a.name}</p>
      )}
      {done && winnerName ? (
        <p className="mt-1 flex items-center gap-1 text-emerald-400">
          <Trophy className="h-3 w-3 shrink-0" />
          {winnerName}
        </p>
      ) : null}
      {active ? <p className="mt-1 text-amber-400/90">In corso</p> : null}
    </div>
  );
}

export function TorneoBracketBoard({ matches, className }: Props) {
  const byRound = useMemo(() => {
    const map = new Map<number, TorneoMatchWithTeams[]>();
    for (const m of matches) {
      const r = m.bracket_round ?? 0;
      if (!map.has(r)) map.set(r, []);
      map.get(r)!.push(m);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => (a.bracket_slot ?? 0) - (b.bracket_slot ?? 0));
    }
    return map;
  }, [matches]);

  const quarters = byRound.get(BRACKET_ROUND.QUARTER) ?? [];
  const semis = byRound.get(BRACKET_ROUND.SEMI) ?? [];
  const final = byRound.get(BRACKET_ROUND.FINAL)?.[0];
  const triello = byRound.get(BRACKET_ROUND.TRIO)?.[0];

  if (!quarters.length) {
    return (
      <div className={cn("rounded-lg border border-dashed border-violet-900/40 p-6 text-center text-sm text-zinc-500", className)}>
        Genera il tabellone da 8 squadre per visualizzare il bracket.
      </div>
    );
  }

  return (
    <div className={cn("overflow-x-auto", className)}>
      <div className="flex min-w-[720px] items-center justify-between gap-4 px-2 py-4">
        <div className="flex flex-col gap-6">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-400/80">{roundLabel(BRACKET_ROUND.QUARTER)}</p>
          {quarters.map((m) => (
            <MatchNode key={m.id} m={m} />
          ))}
        </div>
        <div className="flex flex-col gap-16">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-400/80">{roundLabel(BRACKET_ROUND.SEMI)}</p>
          {semis.map((m) => (
            <MatchNode key={m.id} m={m} />
          ))}
        </div>
        <div className="flex flex-col gap-8">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-400/80">{roundLabel(BRACKET_ROUND.FINAL)}</p>
          {final ? <MatchNode m={final} /> : <div className="h-16 w-[140px] rounded border border-dashed border-zinc-700" />}
          <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-400/80">{roundLabel(BRACKET_ROUND.TRIO)}</p>
          {triello ? <MatchNode m={triello} /> : null}
        </div>
      </div>
    </div>
  );
}
