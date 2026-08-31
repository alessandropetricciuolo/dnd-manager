"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Plus, Trash2, Trophy, UserPlus, Users } from "lucide-react";
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
  updateTorneo2TeamAction,
} from "@/app/campaigns/torneo2-actions";
import type { Torneo2Match, Torneo2Setup, Torneo2Team } from "@/lib/torneo2/types";
import type { Torneo2TimerMode } from "@/lib/torneo2/timer";
import { TORNEO2_TEAM_COLORS } from "@/lib/torneo2/types";

type Props = {
  campaignId: string;
  setup: Torneo2Setup;
  onChanged: () => void;
  className?: string;
  onLoadToStation?: (matchId: string, station: 1 | 2) => void;
  station1MatchId?: string | null;
  station2MatchId?: string | null;
};

function matchTitle(m: Torneo2Match, teams: Torneo2Team[]): string {
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
  className,
  onLoadToStation,
  station1MatchId,
  station2MatchId,
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

  const memberByChar = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of teams) for (const m of t.members) map.set(m.characterId, m.name);
    return map;
  }, [teams]);

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
    <div className={cn("grid gap-4 overflow-y-auto p-4 lg:grid-cols-2", className)}>
      {/* ===== Colonna Squadre ===== */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-emerald-300">
          <Users className="h-4 w-4" /> Squadre
          <span className="ml-1 rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">
            {teams.length}
          </span>
        </h3>

        <div className="mb-3 flex gap-2">
          <Input
            value={newTeamName}
            placeholder="Nome nuova squadra"
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
            className="h-9"
          />
          <Button
            type="button"
            className="h-9 shrink-0 gap-1 bg-emerald-700 hover:bg-emerald-600"
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
            <Plus className="h-4 w-4" /> Crea
          </Button>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {teams.map((team) => (
            <div key={team.id} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="h-4 w-4 shrink-0 rounded-full border border-black/40"
                      style={{ backgroundColor: team.color }}
                      title="Cambia colore"
                    />
                  </PopoverTrigger>
                  <PopoverContent className="w-auto border-zinc-700 bg-zinc-950 p-2">
                    <div className="flex gap-1">
                      {TORNEO2_TEAM_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          className="h-6 w-6 rounded-full border border-black/40"
                          style={{ backgroundColor: c }}
                          onClick={() =>
                            void run(() => updateTorneo2TeamAction(campaignId, team.id, { color: c }))
                          }
                        />
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-100">
                  {team.name}
                </span>
                <button
                  type="button"
                  className="text-zinc-600 hover:text-red-400"
                  disabled={busy}
                  onClick={() =>
                    void run(() => deleteTorneo2TeamAction(campaignId, team.id), "Squadra rimossa.")
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <ul className="mt-2 space-y-1">
                {team.members.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center gap-1 rounded bg-zinc-950/50 px-2 py-1 text-xs text-zinc-300"
                  >
                    <span className="min-w-0 flex-1 truncate">{m.name}</span>
                    <span className="text-[10px] text-zinc-500">
                      {m.characterClass ?? ""} {m.level ? `L${m.level}` : ""}
                    </span>
                    <button
                      type="button"
                      className="text-zinc-600 hover:text-red-400"
                      disabled={busy}
                      onClick={() =>
                        void run(() => removeCharacterFromTorneo2TeamAction(campaignId, m.characterId))
                      }
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </li>
                ))}
                {team.members.length === 0 ? (
                  <li className="px-2 py-1 text-[11px] text-zinc-600">Nessun PG.</li>
                ) : null}
              </ul>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-2 h-7 w-full gap-1 text-[11px]"
                    disabled={busy || unassigned.length === 0}
                  >
                    <UserPlus className="h-3.5 w-3.5" /> Aggiungi PG
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="max-h-72 w-60 overflow-y-auto border-zinc-700 bg-zinc-950 p-1">
                  {unassigned.length === 0 ? (
                    <p className="p-2 text-[11px] text-zinc-500">Tutti i PG sono assegnati.</p>
                  ) : (
                    unassigned.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="block w-full rounded px-2 py-1.5 text-left text-xs text-zinc-300 hover:bg-zinc-800"
                        onClick={() =>
                          void run(() => assignCharacterToTorneo2TeamAction(campaignId, team.id, c.id))
                        }
                      >
                        {c.name}
                        <span className="ml-1 text-[10px] text-zinc-500">
                          {c.character_class ?? ""} {c.level ? `L${c.level}` : ""}
                        </span>
                      </button>
                    ))
                  )}
                </PopoverContent>
              </Popover>
            </div>
          ))}
          {teams.length === 0 ? (
            <p className="col-span-full rounded-lg border border-dashed border-zinc-800 p-4 text-center text-xs text-zinc-500">
              Crea le squadre e assegna i PG della campagna.
            </p>
          ) : null}
        </div>
      </section>

      {/* ===== Colonna Incontri ===== */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-emerald-300">
          <Trophy className="h-4 w-4" /> Incontri
          <span className="ml-1 rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">
            {matches.length}
          </span>
        </h3>

        {/* Crea incontro */}
        <div className="mb-3 grid gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 sm:grid-cols-2">
          <Select value={matchTeamA} onValueChange={setMatchTeamA}>
            <SelectTrigger className="h-9 text-xs">
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
            <SelectTrigger className="h-9 text-xs">
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
          <Select value={matchTimerMode} onValueChange={(v) => setMatchTimerMode(v as Torneo2TimerMode)}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="turn" className="text-xs">Timer turno</SelectItem>
              <SelectItem value="match" className="text-xs">Timer incontro</SelectItem>
              <SelectItem value="both" className="text-xs">Turno + incontro</SelectItem>
              <SelectItem value="none" className="text-xs">Nessun timer</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Input
              type="number"
              value={matchTurnSec}
              onChange={(e) => setMatchTurnSec(e.target.value)}
              className="h-9 w-20 text-center text-xs"
              title="Secondi per turno"
            />
            <Button
              type="button"
              className="h-9 flex-1 gap-1 bg-emerald-700 hover:bg-emerald-600"
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
              <Plus className="h-4 w-4" /> Incontro
            </Button>
          </div>
        </div>

        {/* Lista incontri */}
        <ul className="space-y-2">
          {matches.map((m) => {
            const teamA = teams.find((t) => t.id === m.teamAId) ?? null;
            const teamB = teams.find((t) => t.id === m.teamBId) ?? null;
            const ffaParticipants = setup.participantsByMatch[m.id] ?? [];
            return (
              <li
                key={m.id}
                className={cn(
                  "rounded-lg border bg-zinc-900/40 p-3",
                  m.status === "completed"
                    ? "border-emerald-900/50"
                    : m.status === "active"
                      ? "border-amber-700/50"
                      : "border-zinc-800"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-100">
                    {matchTitle(m, teams)}
                  </span>
                  <span
                    className={cn(
                      "rounded px-2 py-0.5 text-[10px] font-bold uppercase",
                      m.status === "completed"
                        ? "bg-emerald-900/40 text-emerald-300"
                        : m.status === "active"
                          ? "bg-amber-900/40 text-amber-300"
                          : "bg-zinc-800 text-zinc-400"
                    )}
                  >
                    {m.status === "completed" ? "completato" : m.status === "active" ? "live" : "in attesa"}
                  </span>
                  {m.status === "pending" ? (
                    <button
                      type="button"
                      className="text-zinc-600 hover:text-red-400"
                      disabled={busy}
                      onClick={() => void run(() => deleteTorneo2MatchAction(campaignId, m.id))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>

                {m.status !== "completed" && onLoadToStation ? (
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="mr-1 text-[10px] uppercase tracking-wide text-zinc-600">
                      Carica su:
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className={cn(
                        "h-7 px-2.5 text-[11px]",
                        station1MatchId === m.id && "border-emerald-600 bg-emerald-950/50 text-emerald-200"
                      )}
                      disabled={busy}
                      onClick={() => onLoadToStation(m.id, 1)}
                    >
                      Tavolo 1
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className={cn(
                        "h-7 px-2.5 text-[11px]",
                        station2MatchId === m.id && "border-emerald-600 bg-emerald-950/50 text-emerald-200"
                      )}
                      disabled={busy}
                      onClick={() => onLoadToStation(m.id, 2)}
                    >
                      Tavolo 2
                    </Button>
                  </div>
                ) : null}

                {m.status === "completed" ? (
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-emerald-300">
                      {m.kind === "final_ffa"
                        ? `Campione: ${m.winnerCharacterId ? memberByChar.get(m.winnerCharacterId) ?? "PG" : "?"}`
                        : `Vince ${teams.find((t) => t.id === m.winnerTeamId)?.name ?? "?"}`}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-[11px]"
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
                ) : (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="mr-1 self-center text-[10px] uppercase tracking-wide text-zinc-600">
                      Vincitore:
                    </span>
                    {m.kind === "team" && teamA && teamB ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-[11px]"
                          disabled={busy}
                          onClick={() =>
                            void run(
                              () => declareTorneo2WinnerAction(campaignId, m.id, { winnerTeamId: teamA.id }),
                              `Vince ${teamA.name}.`
                            )
                          }
                        >
                          {teamA.name}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-[11px]"
                          disabled={busy}
                          onClick={() =>
                            void run(
                              () => declareTorneo2WinnerAction(campaignId, m.id, { winnerTeamId: teamB.id }),
                              `Vince ${teamB.name}.`
                            )
                          }
                        >
                          {teamB.name}
                        </Button>
                      </>
                    ) : m.kind === "final_ffa" ? (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1 px-2 text-[11px]"
                            disabled={busy || ffaParticipants.length === 0}
                          >
                            Dichiara campione <ChevronDown className="h-3 w-3" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="max-h-60 w-56 overflow-y-auto border-zinc-700 bg-zinc-950 p-1">
                          {ffaParticipants.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              className="block w-full rounded px-2 py-1 text-left text-xs text-zinc-300 hover:bg-zinc-800"
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
                  </div>
                )}
              </li>
            );
          })}
          {matches.length === 0 ? (
            <li className="rounded-lg border border-dashed border-zinc-800 p-4 text-center text-xs text-zinc-500">
              Nessun incontro. Scegli due squadre e crealo.
            </li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
