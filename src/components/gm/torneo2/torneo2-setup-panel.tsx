"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Plus, Trash2, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { getCampaignCharacters, type CampaignCharacterRow } from "@/app/campaigns/character-actions";
import {
  assignCharacterToTorneo2TeamAction,
  createTorneo2MatchAction,
  createTorneo2TeamAction,
  declareTorneo2WinnerAction,
  deleteTorneo2MatchAction,
  deleteTorneo2TeamAction,
  removeCharacterFromTorneo2TeamAction,
  setTorneo2MatchStatusAction,
} from "@/app/campaigns/torneo2-actions";
import type { Torneo2Match, Torneo2Setup, Torneo2Team } from "@/lib/torneo2/types";
import type { Torneo2TimerMode } from "@/lib/torneo2/timer";
import { TORNEO2_TEAM_COLORS } from "@/lib/torneo2/types";

type Props = {
  campaignId: string;
  setup: Torneo2Setup;
  onChanged: () => void;
  onLoadToStation: (matchId: string, station: 1 | 2) => void;
  station1MatchId: string | null;
  station2MatchId: string | null;
  className?: string;
};

function matchLabel(m: Torneo2Match, teams: Torneo2Team[]): string {
  if (m.label) return m.label;
  if (m.kind === "final_ffa") return "Finale · Tutti contro tutti";
  const a = teams.find((t) => t.id === m.teamAId)?.name ?? "?";
  const b = teams.find((t) => t.id === m.teamBId)?.name ?? "?";
  return `${a} vs ${b}`;
}

export function Torneo2SetupPanel({
  campaignId,
  setup,
  onChanged,
  onLoadToStation,
  station1MatchId,
  station2MatchId,
  className,
}: Props) {
  const { teams, matches } = setup;
  const [characters, setCharacters] = useState<CampaignCharacterRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [matchTeamA, setMatchTeamA] = useState<string>("");
  const [matchTeamB, setMatchTeamB] = useState<string>("");
  const [matchTimerMode, setMatchTimerMode] = useState<Torneo2TimerMode>("turn");
  const [matchTurnSec, setMatchTurnSec] = useState("120");

  useEffect(() => {
    void (async () => {
      const res = await getCampaignCharacters(campaignId);
      if (res.success && res.data) setCharacters(res.data);
    })();
  }, [campaignId]);

  const assignedIds = useMemo(() => {
    const set = new Set<string>();
    for (const t of teams) for (const m of t.members) set.add(m.characterId);
    return set;
  }, [teams]);

  const unassigned = useMemo(
    () => characters.filter((c) => !assignedIds.has(c.id)),
    [characters, assignedIds]
  );

  async function run<T>(fn: () => Promise<{ success: boolean; error?: string; data?: T }>, ok?: string) {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (!res.success) {
      toast.error(res.error ?? "Errore.");
      return false;
    }
    if (ok) toast.success(ok);
    onChanged();
    return true;
  }

  return (
    <div className={cn("flex min-h-0 flex-col gap-3 overflow-y-auto p-3", className)}>
      {/* Squadre */}
      <section>
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-amber-400">
          <Users className="h-3.5 w-3.5" /> Squadre ({teams.length})
        </h3>
        <div className="flex gap-1">
          <Input
            value={newTeamName}
            placeholder="Nome squadra"
            onChange={(e) => setNewTeamName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newTeamName.trim()) {
                void run(
                  () =>
                    createTorneo2TeamAction(campaignId, {
                      name: newTeamName.trim(),
                      color: TORNEO2_TEAM_COLORS[teams.length % TORNEO2_TEAM_COLORS.length],
                    }),
                  "Squadra creata."
                ).then((okOk) => okOk && setNewTeamName(""));
              }
            }}
            className="h-8 text-xs"
          />
          <Button
            type="button"
            size="sm"
            className="h-8 shrink-0"
            disabled={busy || !newTeamName.trim()}
            onClick={() =>
              void run(
                () =>
                  createTorneo2TeamAction(campaignId, {
                    name: newTeamName.trim(),
                    color: TORNEO2_TEAM_COLORS[teams.length % TORNEO2_TEAM_COLORS.length],
                  }),
                "Squadra creata."
              ).then((okOk) => okOk && setNewTeamName(""))
            }
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <ul className="mt-2 space-y-2">
          {teams.map((team) => (
            <li key={team.id} className="rounded-md border border-zinc-800 bg-zinc-950/60 p-2">
              <div className="flex items-center gap-2">
                <span
                  className="h-3.5 w-3.5 shrink-0 rounded-full border border-black/40"
                  style={{ backgroundColor: team.color }}
                />
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-zinc-100">
                  {team.name}
                </span>
                <span className="text-[10px] text-zinc-500">{team.members.length} PG</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-6 w-6 px-0 text-zinc-500 hover:text-red-400"
                  disabled={busy}
                  onClick={() =>
                    void run(() => deleteTorneo2TeamAction(campaignId, team.id), "Squadra rimossa.")
                  }
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              {team.members.length > 0 ? (
                <ul className="mt-1.5 space-y-0.5">
                  {team.members.map((m) => (
                    <li key={m.id} className="flex items-center gap-1 text-[11px] text-zinc-300">
                      <span className="min-w-0 flex-1 truncate">{m.name}</span>
                      <button
                        type="button"
                        className="text-zinc-600 hover:text-red-400"
                        disabled={busy}
                        onClick={() =>
                          void run(() =>
                            removeCharacterFromTorneo2TeamAction(campaignId, m.characterId)
                          )
                        }
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-1.5 h-6 w-full gap-1 text-[10px]"
                    disabled={busy || unassigned.length === 0}
                  >
                    <Plus className="h-3 w-3" /> Aggiungi PG
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="max-h-60 w-56 overflow-y-auto border-violet-900/40 bg-zinc-950 p-1">
                  {unassigned.length === 0 ? (
                    <p className="p-2 text-[11px] text-zinc-500">Tutti i PG sono assegnati.</p>
                  ) : (
                    unassigned.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="block w-full rounded px-2 py-1 text-left text-[11px] text-zinc-300 hover:bg-zinc-800"
                        onClick={() =>
                          void run(() =>
                            assignCharacterToTorneo2TeamAction(campaignId, team.id, c.id)
                          )
                        }
                      >
                        {c.name}
                        <span className="ml-1 text-[9px] text-zinc-500">
                          {c.character_class ?? ""} {c.level ? `L${c.level}` : ""}
                        </span>
                      </button>
                    ))
                  )}
                </PopoverContent>
              </Popover>
            </li>
          ))}
        </ul>
      </section>

      {/* Crea incontro */}
      <section className="rounded-md border border-zinc-800 bg-zinc-950/60 p-2">
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-amber-400">Nuovo incontro</h3>
        <div className="space-y-1.5">
          <Select value={matchTeamA} onValueChange={setMatchTeamA}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Squadra A" />
            </SelectTrigger>
            <SelectContent>
              {teams.map((t) => (
                <SelectItem key={t.id} value={t.id} className="text-xs">
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={matchTeamB} onValueChange={setMatchTeamB}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Squadra B" />
            </SelectTrigger>
            <SelectContent>
              {teams
                .filter((t) => t.id !== matchTeamA)
                .map((t) => (
                  <SelectItem key={t.id} value={t.id} className="text-xs">
                    {t.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <div className="flex gap-1">
            <Select value={matchTimerMode} onValueChange={(v) => setMatchTimerMode(v as Torneo2TimerMode)}>
              <SelectTrigger className="h-8 flex-1 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="turn" className="text-xs">Timer turno</SelectItem>
                <SelectItem value="match" className="text-xs">Timer incontro</SelectItem>
                <SelectItem value="both" className="text-xs">Turno + incontro</SelectItem>
                <SelectItem value="none" className="text-xs">Nessun timer</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              value={matchTurnSec}
              onChange={(e) => setMatchTurnSec(e.target.value)}
              className="h-8 w-16 text-center text-xs"
              title="Secondi per turno"
            />
          </div>
          <Button
            type="button"
            size="sm"
            className="h-8 w-full"
            disabled={busy || !matchTeamA || !matchTeamB || matchTeamA === matchTeamB}
            onClick={() =>
              void run(
                () =>
                  createTorneo2MatchAction(campaignId, {
                    teamAId: matchTeamA,
                    teamBId: matchTeamB,
                    timer: {
                      timerMode: matchTimerMode,
                      turnSeconds: Math.max(5, Math.trunc(Number(matchTurnSec) || 120)),
                    },
                  }),
                "Incontro creato."
              ).then((okOk) => {
                if (okOk) {
                  setMatchTeamA("");
                  setMatchTeamB("");
                }
              })
            }
          >
            <Plus className="mr-1 h-4 w-4" /> Crea incontro
          </Button>
        </div>
      </section>

      {/* Incontri */}
      <section>
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-amber-400">
          <Trophy className="h-3.5 w-3.5" /> Incontri ({matches.length})
        </h3>
        <ul className="space-y-1.5">
          {matches.map((m) => {
            const onStation1 = station1MatchId === m.id;
            const onStation2 = station2MatchId === m.id;
            const teamA = teams.find((t) => t.id === m.teamAId) ?? null;
            const teamB = teams.find((t) => t.id === m.teamBId) ?? null;
            const ffaParticipants = setup.participantsByMatch[m.id] ?? [];
            const memberByChar = new Map(
              teams.flatMap((t) => t.members.map((mem) => [mem.characterId, mem.name]))
            );
            return (
              <li
                key={m.id}
                className={cn(
                  "rounded-md border bg-zinc-950/60 p-2",
                  m.status === "completed"
                    ? "border-emerald-900/40"
                    : m.status === "active"
                      ? "border-amber-700/50"
                      : "border-zinc-800"
                )}
              >
                <div className="flex items-center gap-1.5">
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold text-zinc-100">
                    {matchLabel(m, teams)}
                  </span>
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[9px] font-bold uppercase",
                      m.status === "completed"
                        ? "bg-emerald-900/40 text-emerald-300"
                        : m.status === "active"
                          ? "bg-amber-900/40 text-amber-300"
                          : "bg-zinc-800 text-zinc-400"
                    )}
                  >
                    {m.status === "completed" ? "fatto" : m.status === "active" ? "live" : "attesa"}
                  </span>
                </div>

                {m.status !== "completed" ? (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant={onStation1 ? "default" : "outline"}
                      className="h-6 flex-1 px-1 text-[10px]"
                      disabled={busy || onStation2}
                      onClick={() => onLoadToStation(m.id, 1)}
                    >
                      Tavolo 1
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={onStation2 ? "default" : "outline"}
                      className="h-6 flex-1 px-1 text-[10px]"
                      disabled={busy || onStation1}
                      onClick={() => onLoadToStation(m.id, 2)}
                    >
                      Tavolo 2
                    </Button>
                  </div>
                ) : null}

                {/* Dichiara vincitore */}
                {m.status !== "completed" ? (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {m.kind === "team" && teamA && teamB ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-6 flex-1 px-1 text-[10px]"
                          disabled={busy}
                          onClick={() =>
                            void run(
                              () =>
                                declareTorneo2WinnerAction(campaignId, m.id, { winnerTeamId: teamA.id }),
                              `Vince ${teamA.name}.`
                            )
                          }
                        >
                          Vince {teamA.name}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-6 flex-1 px-1 text-[10px]"
                          disabled={busy}
                          onClick={() =>
                            void run(
                              () =>
                                declareTorneo2WinnerAction(campaignId, m.id, { winnerTeamId: teamB.id }),
                              `Vince ${teamB.name}.`
                            )
                          }
                        >
                          Vince {teamB.name}
                        </Button>
                      </>
                    ) : m.kind === "final_ffa" ? (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-6 w-full gap-1 text-[10px]"
                            disabled={busy || ffaParticipants.length === 0}
                          >
                            Dichiara campione <ChevronDown className="h-3 w-3" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="max-h-60 w-56 overflow-y-auto border-violet-900/40 bg-zinc-950 p-1">
                          {ffaParticipants.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              className="block w-full rounded px-2 py-1 text-left text-[11px] text-zinc-300 hover:bg-zinc-800"
                              onClick={() =>
                                void run(
                                  () =>
                                    declareTorneo2WinnerAction(campaignId, m.id, {
                                      winnerCharacterId: p.characterId ?? undefined,
                                    }),
                                  "Campione dichiarato."
                                )
                              }
                            >
                              {p.characterId ? memberByChar.get(p.characterId) ?? "PG" : "PG"}
                            </button>
                          ))}
                        </PopoverContent>
                      </Popover>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-6 w-6 px-0 text-zinc-500 hover:text-red-400"
                      disabled={busy}
                      onClick={() =>
                        void run(() => deleteTorneo2MatchAction(campaignId, m.id))
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-[10px] text-emerald-300">
                      {m.kind === "final_ffa"
                        ? `Campione: ${m.winnerCharacterId ? memberByChar.get(m.winnerCharacterId) ?? "PG" : "?"}`
                        : `Vince ${teams.find((t) => t.id === m.winnerTeamId)?.name ?? "?"}`}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-6 px-1.5 text-[10px]"
                      disabled={busy}
                      onClick={() =>
                        void run(
                          () => setTorneo2MatchStatusAction(campaignId, m.id, "pending"),
                          "Incontro riaperto."
                        )
                      }
                    >
                      Riapri
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
          {matches.length === 0 ? (
            <li className="rounded-md border border-dashed border-zinc-800 p-3 text-center text-[11px] text-zinc-500">
              Nessun incontro. Creane uno scegliendo due squadre.
            </li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
