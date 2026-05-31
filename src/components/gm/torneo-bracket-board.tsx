"use client";

import { useMemo, type ReactNode } from "react";
import { Trophy } from "lucide-react";
import { BRACKET_ROUND, roundLabel } from "@/lib/torneo/bracket";
import type { TorneoMatchWithTeams } from "@/lib/torneo/types";
import { cn } from "@/lib/utils";

type Props = {
  matches: TorneoMatchWithTeams[];
  variant?: "compact" | "display";
  className?: string;
};

function matchTitle(m: TorneoMatchWithTeams): string {
  if (m.match_kind === "triello") return "Triello";
  return m.label ?? `${m.team_a.name} vs ${m.team_b.name}`;
}

function MatchNode({ m, display }: { m: TorneoMatchWithTeams; display: boolean }) {
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

  const renderSide = (side: TorneoMatchWithTeams["team_a"]) =>
    side.isPlaceholder ? (
      <span className="italic text-zinc-500">{side.name}</span>
    ) : (
      <span style={{ color: side.color }}>{side.name}</span>
    );

  return (
    <div
      className={cn(
        "rounded-xl border",
        display ? "min-w-[200px] px-4 py-3 text-sm" : "min-w-[140px] px-2.5 py-2 text-[11px]",
        active && "border-amber-500/60 bg-amber-950/30 shadow-[0_0_24px_rgba(245,158,11,0.12)]",
        done && "border-emerald-700/40 bg-emerald-950/20",
        !active && !done && "border-zinc-700/80 bg-zinc-900/60"
      )}
    >
      <p className={cn("font-semibold text-zinc-100", display && "text-base")}>{matchTitle(m)}</p>
      {m.match_kind !== "triello" ? (
        <p className={cn("mt-1 truncate text-zinc-400", display ? "text-sm" : "mt-0.5 text-zinc-500")}>
          {renderSide(m.team_a)}
          {" vs "}
          {renderSide(m.team_b)}
        </p>
      ) : (
        <p className={cn("text-zinc-400", display ? "mt-1 text-sm" : "mt-0.5 text-zinc-500")}>
          {m.team_a.isPlaceholder ? renderSide(m.team_a) : <>Squadra {renderSide(m.team_a)}</>}
        </p>
      )}
      {done && winnerName ? (
        <p
          className={cn(
            "mt-2 flex items-center gap-1.5 font-medium text-emerald-400",
            display ? "text-sm" : "mt-1 text-[11px]"
          )}
        >
          <Trophy className={cn("shrink-0", display ? "h-4 w-4" : "h-3 w-3")} />
          {winnerName}
        </p>
      ) : null}
      {active ? (
        <p className={cn("text-amber-400/90", display ? "mt-2 text-sm" : "mt-1 text-[11px]")}>In corso</p>
      ) : null}
    </div>
  );
}

function RoundColumn({
  title,
  children,
  display,
  gapClass,
}: {
  title: string;
  children: ReactNode;
  display: boolean;
  gapClass: string;
}) {
  return (
    <div className={cn("flex flex-col", gapClass)}>
      <p
        className={cn(
          "shrink-0 font-semibold uppercase tracking-wide text-violet-400/90",
          display ? "mb-4 text-sm" : "text-[10px]"
        )}
      >
        {title}
      </p>
      <div className={cn("flex flex-1 flex-col justify-around", display ? "gap-5" : "gap-6")}>{children}</div>
    </div>
  );
}

export function TorneoBracketBoard({ matches, variant = "compact", className }: Props) {
  const display = variant === "display";

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
      <div
        className={cn(
          "flex flex-1 items-center justify-center rounded-xl border border-dashed border-violet-900/40 p-12 text-center text-zinc-500",
          display ? "text-lg" : "text-sm",
          className
        )}
      >
        Genera il tabellone da 8 squadre per visualizzare il bracket.
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex min-h-full w-full items-center justify-center",
        display ? "p-6 md:p-10" : "overflow-x-auto",
        className
      )}
    >
      <div
        className={cn(
          "flex w-full max-w-[1400px] items-stretch justify-between",
          display ? "gap-8 md:gap-12 lg:gap-16" : "min-w-[720px] gap-4 px-2 py-4"
        )}
      >
        <RoundColumn title={roundLabel(BRACKET_ROUND.QUARTER)} display={display} gapClass={display ? "min-h-[520px]" : ""}>
          {quarters.map((m) => (
            <MatchNode key={m.id} m={m} display={display} />
          ))}
        </RoundColumn>

        <RoundColumn title={roundLabel(BRACKET_ROUND.SEMI)} display={display} gapClass={display ? "min-h-[520px]" : ""}>
          {semis.map((m) => (
            <MatchNode key={m.id} m={m} display={display} />
          ))}
        </RoundColumn>

        <RoundColumn title={roundLabel(BRACKET_ROUND.FINAL)} display={display} gapClass={display ? "min-h-[520px]" : ""}>
          {final ? (
            <MatchNode m={final} display={display} />
          ) : (
            <div
              className={cn(
                "rounded-xl border border-dashed border-zinc-700",
                display ? "min-h-[100px] min-w-[200px]" : "h-16 w-[140px]"
              )}
            />
          )}
          <p
            className={cn(
              "shrink-0 font-semibold uppercase tracking-wide text-violet-400/90",
              display ? "mt-8 text-sm" : "text-[10px]"
            )}
          >
            {roundLabel(BRACKET_ROUND.TRIO)}
          </p>
          {triello ? <MatchNode m={triello} display={display} /> : null}
        </RoundColumn>
      </div>
    </div>
  );
}
