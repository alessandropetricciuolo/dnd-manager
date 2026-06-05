"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Crown, Settings2, Sparkles, Trash2, Trophy } from "lucide-react";
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
import { groupBracketRounds } from "@/lib/torneo2/bracket";
import {
  clearTorneo2BracketAction,
  declareTorneo2WinnerAction,
  generateTorneo2BracketAction,
  setTorneo2MatchStatusAction,
  updateTorneo2MatchBracketAction,
} from "@/app/campaigns/torneo2-actions";
import type { Torneo2Match, Torneo2Setup, Torneo2Team } from "@/lib/torneo2/types";
import type { Torneo2TimerMode } from "@/lib/torneo2/timer";

type Props = {
  campaignId: string;
  setup: Torneo2Setup;
  onChanged?: () => void;
  canManage?: boolean;
  className?: string;
};

function teamName(teams: Torneo2Team[], id: string | null): string | null {
  if (!id) return null;
  return teams.find((t) => t.id === id)?.name ?? null;
}
function teamColor(teams: Torneo2Team[], id: string | null): string {
  if (!id) return "#3f3f46";
  return teams.find((t) => t.id === id)?.color ?? "#94a3b8";
}

export function Torneo2Bracket({ campaignId, setup, onChanged, canManage = false, className }: Props) {
  const { teams, matches, participantsByMatch } = setup;
  const [busy, setBusy] = useState(false);
  const [seedTeams, setSeedTeams] = useState<string[]>([]);
  const [withTriello, setWithTriello] = useState(true);
  const [genTurnSec, setGenTurnSec] = useState("120");
  const [genMode, setGenMode] = useState<Torneo2TimerMode>("turn");

  const rounds = useMemo(() => groupBracketRounds(matches), [matches]);
  const hasBracket = rounds.length > 0;

  const memberByChar = useMemo(() => {
    const map = new Map<string, { name: string; color: string; teamName: string }>();
    for (const t of teams) {
      for (const m of t.members) map.set(m.characterId, { name: m.name, color: t.color, teamName: t.name });
    }
    return map;
  }, [teams]);

  const bracketMatches = useMemo(() => matches.filter((m) => m.bracketRound !== null), [matches]);

  async function run<T>(fn: () => Promise<{ success: boolean; error?: string; data?: T }>, ok?: string) {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (!res.success) {
      toast.error(res.error ?? "Errore.");
      return false;
    }
    if (ok) toast.success(ok);
    onChanged?.();
    return true;
  }

  const toggleSeed = (id: string) =>
    setSeedTeams((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const generate = () =>
    void run(
      () =>
        generateTorneo2BracketAction(campaignId, {
          teamIds: seedTeams,
          withTriello,
          replaceExisting: true,
          timer: { timerMode: genMode, turnSeconds: Math.max(5, Math.trunc(Number(genTurnSec) || 120)) },
        }),
      "Tabellone generato."
    ).then((okOk) => {
      if (okOk) setSeedTeams([]);
    });

  return (
    <div className={cn("flex flex-col gap-4 overflow-auto p-4", className)}>
      {/* Generatore / azioni */}
      {canManage ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-emerald-300">
              <Sparkles className="h-4 w-4" /> Genera tabellone
            </h3>
            {hasBracket ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 gap-1 border-red-800/60 px-2 text-[11px] text-red-300 hover:bg-red-950/40"
                disabled={busy}
                onClick={() => {
                  if (confirm("Eliminare tutti gli incontri del tabellone?")) {
                    void run(() => clearTorneo2BracketAction(campaignId), "Tabellone svuotato.");
                  }
                }}
              >
                <Trash2 className="h-3.5 w-3.5" /> Svuota
              </Button>
            ) : null}
          </div>

          <p className="mb-2 text-[11px] text-zinc-500">
            Seleziona le squadre (2, 4, 8 o 16) nell&apos;ordine di sorteggio. Il vincitore di ogni
            incontro avanza in automatico; col triello finale i 3 membri della squadra vincitrice si
            sfidano per il titolo.
          </p>

          <div className="mb-3 flex flex-wrap gap-1.5">
            {teams.map((t) => {
              const idx = seedTeams.indexOf(t.id);
              const selected = idx >= 0;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleSeed(t.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                    selected
                      ? "border-emerald-600 bg-emerald-950/50 text-emerald-100"
                      : "border-zinc-700 bg-zinc-900/60 text-zinc-300 hover:bg-zinc-800"
                  )}
                >
                  {selected ? (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-zinc-950">
                      {idx + 1}
                    </span>
                  ) : (
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: t.color }} />
                  )}
                  {t.name}
                </button>
              );
            })}
            {teams.length === 0 ? (
              <span className="text-xs text-zinc-500">Crea prima le squadre nella sezione Setup.</span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-zinc-300">
              <input
                type="checkbox"
                checked={withTriello}
                onChange={(e) => setWithTriello(e.target.checked)}
                className="h-3.5 w-3.5 accent-emerald-600"
              />
              Triello finale
            </label>
            <Select value={genMode} onValueChange={(v) => setGenMode(v as Torneo2TimerMode)}>
              <SelectTrigger className="h-8 w-36 text-xs">
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
              value={genTurnSec}
              onChange={(e) => setGenTurnSec(e.target.value)}
              className="h-8 w-20 text-center text-xs"
              title="Secondi per turno"
            />
            <Button
              type="button"
              className="h-8 gap-1 bg-emerald-700 px-3 text-xs hover:bg-emerald-600"
              disabled={busy || seedTeams.length < 2}
              onClick={generate}
            >
              <Trophy className="h-4 w-4" />
              {hasBracket ? "Rigenera" : "Genera"} ({seedTeams.length})
            </Button>
          </div>
        </div>
      ) : null}

      {/* Tabellone */}
      {hasBracket ? (
        <div className="flex min-w-max gap-6">
          {rounds.map((round) => (
            <div key={round.round} className="flex min-w-[15rem] flex-col">
              <h4 className="mb-2 text-center text-[11px] font-bold uppercase tracking-widest text-amber-400/90">
                {round.label}
              </h4>
              <div className="flex flex-1 flex-col justify-around gap-3">
                {round.matches.map((m) => (
                  <BracketMatchCard
                    key={m.id}
                    match={m}
                    teams={teams}
                    bracketMatches={bracketMatches}
                    ffaParticipants={participantsByMatch[m.id] ?? []}
                    memberByChar={memberByChar}
                    canManage={canManage}
                    busy={busy}
                    run={run}
                    campaignId={campaignId}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-zinc-800 p-8 text-center text-sm text-zinc-500">
          Nessun tabellone. {canManage ? "Genera il tabellone qui sopra." : "In attesa del tabellone."}
        </div>
      )}
    </div>
  );
}

type RunFn = <T>(
  fn: () => Promise<{ success: boolean; error?: string; data?: T }>,
  ok?: string
) => Promise<boolean>;

function BracketMatchCard({
  match,
  teams,
  bracketMatches,
  ffaParticipants,
  memberByChar,
  canManage,
  busy,
  run,
  campaignId,
}: {
  match: Torneo2Match;
  teams: Torneo2Team[];
  bracketMatches: Torneo2Match[];
  ffaParticipants: Torneo2Setup["participantsByMatch"][string];
  memberByChar: Map<string, { name: string; color: string; teamName: string }>;
  canManage: boolean;
  busy: boolean;
  run: RunFn;
  campaignId: string;
}) {
  const isFfa = match.kind === "final_ffa";
  const completed = match.status === "completed";

  return (
    <div
      className={cn(
        "rounded-lg border bg-zinc-900/50 p-2.5",
        completed
          ? "border-emerald-800/50"
          : match.status === "active"
            ? "border-amber-700/50"
            : "border-zinc-800"
      )}
    >
      <div className="mb-1.5 flex items-center justify-between">
        <span className="truncate text-[10px] uppercase tracking-wide text-zinc-500">
          {match.roundLabel ?? (isFfa ? "Triello" : "Incontro")}
        </span>
        {canManage ? (
          <BracketSettings
            match={match}
            bracketMatches={bracketMatches}
            busy={busy}
            run={run}
            campaignId={campaignId}
          />
        ) : null}
      </div>

      {isFfa ? (
        <div className="space-y-1">
          {ffaParticipants.length === 0 ? (
            <p className="px-1 py-2 text-center text-[11px] text-zinc-600">In attesa dei finalisti…</p>
          ) : (
            ffaParticipants.map((p) => {
              const info = p.characterId ? memberByChar.get(p.characterId) : null;
              const isChamp = completed && match.winnerCharacterId === p.characterId;
              return (
                <div
                  key={p.id}
                  className={cn(
                    "flex items-center gap-1.5 rounded px-2 py-1 text-xs",
                    isChamp ? "bg-amber-600/30 font-semibold text-amber-100" : "bg-zinc-950/50 text-zinc-200"
                  )}
                >
                  {isChamp ? <Crown className="h-3 w-3 text-amber-400" /> : (
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: info?.color ?? "#94a3b8" }} />
                  )}
                  <span className="truncate">{info?.name ?? "PG"}</span>
                </div>
              );
            })
          )}
          {canManage && !completed && ffaParticipants.length > 0 ? (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-1 h-7 w-full gap-1 text-[11px]"
                  disabled={busy}
                >
                  <Crown className="h-3.5 w-3.5" /> Dichiara campione <ChevronDown className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="max-h-60 w-52 overflow-y-auto border-zinc-700 bg-zinc-950 p-1">
                {ffaParticipants.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="block w-full rounded px-2 py-1 text-left text-xs text-zinc-300 hover:bg-zinc-800"
                    onClick={() =>
                      void run(
                        () =>
                          declareTorneo2WinnerAction(campaignId, match.id, {
                            winnerCharacterId: p.characterId ?? undefined,
                          }),
                        "Campione dichiarato."
                      )
                    }
                  >
                    {p.characterId ? memberByChar.get(p.characterId)?.name ?? "PG" : "PG"}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          ) : null}
          {canManage && completed ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-1 h-6 w-full px-2 text-[10px]"
              disabled={busy}
              onClick={() => void run(() => setTorneo2MatchStatusAction(campaignId, match.id, "pending"))}
            >
              Riapri
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-1">
          <BracketTeamRow
            teams={teams}
            teamId={match.teamAId}
            isWinner={completed && match.winnerTeamId === match.teamAId}
            canDeclare={canManage && !completed && !!match.teamAId && !!match.teamBId}
            busy={busy}
            onDeclare={() =>
              void run(
                () => declareTorneo2WinnerAction(campaignId, match.id, { winnerTeamId: match.teamAId ?? undefined }),
                "Vincitore registrato."
              )
            }
          />
          <BracketTeamRow
            teams={teams}
            teamId={match.teamBId}
            isWinner={completed && match.winnerTeamId === match.teamBId}
            canDeclare={canManage && !completed && !!match.teamAId && !!match.teamBId}
            busy={busy}
            onDeclare={() =>
              void run(
                () => declareTorneo2WinnerAction(campaignId, match.id, { winnerTeamId: match.teamBId ?? undefined }),
                "Vincitore registrato."
              )
            }
          />
          {canManage && completed ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-6 w-full px-2 text-[10px]"
              disabled={busy}
              onClick={() => void run(() => setTorneo2MatchStatusAction(campaignId, match.id, "pending"))}
            >
              Riapri
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}

function BracketTeamRow({
  teams,
  teamId,
  isWinner,
  canDeclare,
  busy,
  onDeclare,
}: {
  teams: Torneo2Team[];
  teamId: string | null;
  isWinner: boolean;
  canDeclare: boolean;
  busy: boolean;
  onDeclare: () => void;
}) {
  const name = teamName(teams, teamId);
  return (
    <button
      type="button"
      disabled={!canDeclare || busy}
      onClick={canDeclare ? onDeclare : undefined}
      className={cn(
        "flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-xs",
        isWinner ? "bg-emerald-600/30 font-semibold text-emerald-100" : "bg-zinc-950/50 text-zinc-200",
        canDeclare && "cursor-pointer hover:bg-zinc-800"
      )}
      title={canDeclare ? "Segna come vincitore" : undefined}
    >
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: teamColor(teams, teamId) }} />
      <span className={cn("truncate", !name && "italic text-zinc-600")}>{name ?? "In attesa"}</span>
    </button>
  );
}

function BracketSettings({
  match,
  bracketMatches,
  busy,
  run,
  campaignId,
}: {
  match: Torneo2Match;
  bracketMatches: Torneo2Match[];
  busy: boolean;
  run: RunFn;
  campaignId: string;
}) {
  const candidates = bracketMatches.filter((m) => m.id !== match.id);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="text-zinc-600 hover:text-zinc-300" title="Impostazioni tabellone">
          <Settings2 className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 space-y-2 border-zinc-700 bg-zinc-950 p-3">
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-wide text-zinc-500">
            Etichetta round
          </label>
          <Input
            defaultValue={match.roundLabel ?? ""}
            placeholder="Es. Quarti"
            className="h-8 text-xs"
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v !== (match.roundLabel ?? "")) {
                void run(() => updateTorneo2MatchBracketAction(campaignId, match.id, { roundLabel: v || null }));
              }
            }}
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-wide text-zinc-500">
            Il vincitore avanza in
          </label>
          <Select
            value={match.feedsMatchId ?? "none"}
            onValueChange={(v) =>
              void run(() =>
                updateTorneo2MatchBracketAction(campaignId, match.id, {
                  feedsMatchId: v === "none" ? null : v,
                  feedsSlot: v === "none" ? null : match.feedsSlot ?? "a",
                })
              )
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Nessuno" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none" className="text-xs">Nessuno</SelectItem>
              {candidates.map((c) => (
                <SelectItem key={c.id} value={c.id} className="text-xs">
                  {c.roundLabel ?? (c.kind === "final_ffa" ? "Triello" : "Incontro")} #{c.bracketPosition + 1}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {match.feedsMatchId ? (
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wide text-zinc-500">Slot</label>
            <Select
              value={match.feedsSlot ?? "a"}
              onValueChange={(v) =>
                void run(() =>
                  updateTorneo2MatchBracketAction(campaignId, match.id, { feedsSlot: v as "a" | "b" })
                )
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="a" className="text-xs">Slot A (alto)</SelectItem>
                <SelectItem value="b" className="text-xs">Slot B (basso)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 w-full gap-1 border-red-800/60 text-[11px] text-red-300 hover:bg-red-950/40"
          disabled={busy}
          onClick={() =>
            void run(
              () =>
                updateTorneo2MatchBracketAction(campaignId, match.id, {
                  bracketRound: null,
                  feedsMatchId: null,
                  feedsSlot: null,
                }),
              "Rimosso dal tabellone."
            )
          }
        >
          <Trash2 className="h-3.5 w-3.5" /> Togli dal tabellone
        </Button>
      </PopoverContent>
    </Popover>
  );
}
