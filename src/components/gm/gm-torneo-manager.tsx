"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Swords, Trophy, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  assignCharacterToTorneoTeamAction,
  completeTorneoMatchAction,
  createTorneoMatchAction,
  createTorneoTeamAction,
  deleteTorneoMatchAction,
  deleteTorneoTeamAction,
  generateTorneoBracketAction,
  getTorneoSetupAction,
  removeCharacterFromTorneoTeamAction,
  setTorneoMatchStatusAction,
} from "@/app/campaigns/torneo-actions";
import { getCampaignCharacters } from "@/app/campaigns/character-actions";
import type { InitiativeTrackerState } from "@/components/gm/initiative-tracker";
import { computeMatchDamageTotals } from "@/lib/torneo/compute-match-damage";
import {
  buildInitiativeEntriesForMatch,
  buildInitiativeEntriesForTriello,
  buildCharacterTeamMap,
  torneoActiveMatchStorageKey,
  torneoInitiativeStorageKey,
} from "@/lib/torneo/initiative";
import { TORNEO_TEAM_COLORS, type TorneoMatchWithTeams, type TorneoTeamWithMembers } from "@/lib/torneo/types";
import { cn } from "@/lib/utils";
import { sanitizeInitiativeTrackerState } from "@/components/gm/initiative-tracker";
import { persistTorneoMatchInitiative } from "@/components/gm/torneo-match-tracker";
import { loadTorneoMatchInitiativeAction } from "@/app/campaigns/torneo-live-actions";

type Props = {
  campaignId: string;
  trackerState: InitiativeTrackerState;
  onLoadMatch: (station: 1 | 2, matchId: string, state: InitiativeTrackerState) => void;
  activeMatchId: string | null;
  station2MatchId?: string | null;
  onActiveMatchIdChange: (matchId: string | null) => void;
  onSetupChange?: (teams: TorneoTeamWithMembers[], matches: TorneoMatchWithTeams[]) => void;
  liveSyncEnabled?: boolean;
  getTrackerStateForMatch?: (matchId: string) => InitiativeTrackerState | null;
  className?: string;
};

export function GmTorneoManager({
  campaignId,
  trackerState,
  onLoadMatch,
  activeMatchId,
  station2MatchId = null,
  onActiveMatchIdChange,
  onSetupChange,
  liveSyncEnabled = false,
  getTrackerStateForMatch,
  className,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<TorneoTeamWithMembers[]>([]);
  const [matches, setMatches] = useState<TorneoMatchWithTeams[]>([]);
  const [roster, setRoster] = useState<
    Array<{ id: string; name: string; character_class: string | null; teamId: string | null }>
  >([]);
  const [newTeamName, setNewTeamName] = useState("");
  const [matchTeamA, setMatchTeamA] = useState("");
  const [matchTeamB, setMatchTeamB] = useState("");
  const [matchLabel, setMatchLabel] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [setupRes, charsRes] = await Promise.all([
        getTorneoSetupAction(campaignId),
        getCampaignCharacters(campaignId),
      ]);
      if (!setupRes.success) {
        toast.error(setupRes.error);
        return;
      }
      const nextTeams = setupRes.data!.teams;
      const nextMatches = setupRes.data!.matches;
      setTeams(nextTeams);
      setMatches(nextMatches);
      onSetupChange?.(nextTeams, nextMatches);

      const teamByChar = buildCharacterTeamMap(nextTeams);
      if (charsRes.success && charsRes.data) {
        setRoster(
          charsRes.data.map((c) => ({
            id: c.id,
            name: c.name,
            character_class: c.character_class,
            teamId: teamByChar[c.id]?.teamId ?? null,
          }))
        );
      }
    } catch {
      toast.error("Errore nel caricamento del torneo.");
    } finally {
      setLoading(false);
    }
  }, [campaignId, onSetupChange]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(torneoActiveMatchStorageKey(campaignId));
      if (stored && !activeMatchId) onActiveMatchIdChange(stored);
    } catch {
      /* ignore */
    }
  }, [campaignId, activeMatchId, onActiveMatchIdChange]);

  const activeMatch = useMemo(
    () => matches.find((m) => m.id === activeMatchId) ?? null,
    [matches, activeMatchId]
  );

  const trielloTeam = useMemo(
    () => teams.find((t) => matches.some((m) => m.match_kind === "triello" && m.team_a_id === t.id)),
    [teams, matches]
  );

  const damageForMatch = useCallback(
    (match: TorneoMatchWithTeams) => {
      const state = getTrackerStateForMatch?.(match.id) ?? null;
      if (!state) return null;
      return computeMatchDamageTotals(state.entries, match);
    },
    [getTrackerStateForMatch]
  );

  const persistActiveMatch = (id: string | null) => {
    onActiveMatchIdChange(id);
    try {
      if (id) localStorage.setItem(torneoActiveMatchStorageKey(campaignId), id);
      else localStorage.removeItem(torneoActiveMatchStorageKey(campaignId));
    } catch {
      /* ignore */
    }
  };

  const handleCreateTeam = async () => {
    const name = newTeamName.trim();
    if (!name) return;
    setBusy(true);
    const color = TORNEO_TEAM_COLORS[teams.length % TORNEO_TEAM_COLORS.length] ?? "#f59e0b";
    const res = await createTorneoTeamAction(campaignId, { name, color });
    setBusy(false);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    setNewTeamName("");
    toast.success("Squadra creata.");
    void refresh();
  };

  const handleAssign = async (characterId: string, teamId: string) => {
    setBusy(true);
    const res =
      teamId === "__none"
        ? await removeCharacterFromTorneoTeamAction(campaignId, characterId)
        : await assignCharacterToTorneoTeamAction(campaignId, teamId, characterId);
    setBusy(false);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    void refresh();
  };

  const handleCreateMatch = async () => {
    if (!matchTeamA || !matchTeamB || matchTeamA === matchTeamB) {
      toast.error("Scegli due squadre diverse.");
      return;
    }
    setBusy(true);
    const res = await createTorneoMatchAction(campaignId, {
      teamAId: matchTeamA,
      teamBId: matchTeamB,
      label: matchLabel.trim() || undefined,
    });
    setBusy(false);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    setMatchLabel("");
    toast.success("Incontro creato.");
    void refresh();
  };

  const loadMatchState = async (match: TorneoMatchWithTeams): Promise<InitiativeTrackerState | null> => {
    if (liveSyncEnabled) {
      const res = await loadTorneoMatchInitiativeAction(campaignId, match.id);
      if (res.success && res.data?.state) return res.data.state;
    }
    try {
      const raw = localStorage.getItem(torneoInitiativeStorageKey(campaignId, match.id));
      if (raw) return sanitizeInitiativeTrackerState(JSON.parse(raw) as Partial<InitiativeTrackerState>);
    } catch {
      /* ignore */
    }
    return null;
  };

  const startMatch = async (match: TorneoMatchWithTeams, station: 1 | 2) => {
    setBusy(true);
    const res = await setTorneoMatchStatusAction(campaignId, match.id, "active");
    setBusy(false);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    if (station === 1) persistActiveMatch(match.id);
    let entries;
    if (match.match_kind === "triello") {
      const squad = teams.find((t) => t.id === match.team_a_id);
      if (!squad) {
        toast.error("Squadra campione non trovata per il triello.");
        return;
      }
      entries = buildInitiativeEntriesForTriello(squad);
    } else {
      entries = buildInitiativeEntriesForMatch(match, teams);
    }
    const state = sanitizeInitiativeTrackerState({ entries });
    await persistTorneoMatchInitiative(campaignId, match.id, state, liveSyncEnabled);
    onLoadMatch(station, match.id, state);
    toast.success(`Incontro avviato su tavolo ${station}.`);
    void refresh();
  };

  const resumeMatch = async (match: TorneoMatchWithTeams, station: 1 | 2) => {
    if (station === 1) persistActiveMatch(match.id);
    const restored = await loadMatchState(match);
    if (restored) {
      onLoadMatch(station, match.id, restored);
      toast.message(`Incontro ripreso su tavolo ${station}.`);
      return;
    }
    await startMatch(match, station);
  };

  const declareTrielloWinner = async (match: TorneoMatchWithTeams, characterId: string) => {
    const state = getTrackerStateForMatch?.(match.id) ?? null;
    if (!state) {
      toast.error("Apri il triello su un tavolo.");
      return;
    }
    const entry = state.entries.find((e) => e.playerId === characterId);
    const damage = entry?.damageDealt ?? 0;
    setBusy(true);
    const res = await completeTorneoMatchAction(campaignId, match.id, {
      winnerCharacterId: characterId,
      teamADamageTotal: damage,
      teamBDamageTotal: 0,
    });
    setBusy(false);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success("Vincitore del triello registrato.");
    persistActiveMatch(null);
    void refresh();
  };

  const declareWinner = async (match: TorneoMatchWithTeams, winnerTeamId: string) => {
    const dmg = damageForMatch(match);
    if (!dmg) {
      toast.error("Apri l'incontro su un tavolo per registrare i danni.");
      return;
    }
    setBusy(true);
    const res = await completeTorneoMatchAction(campaignId, match.id, {
      winnerTeamId,
      teamADamageTotal: dmg.teamA,
      teamBDamageTotal: dmg.teamB,
    });
    setBusy(false);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success("Vincitore registrato.");
    persistActiveMatch(null);
    void refresh();
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-zinc-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const handleGenerateBracket = async () => {
    if (
      !confirm(
        "Generare il tabellone da 8 squadre? Tutti gli incontri esistenti verranno eliminati e sostituiti."
      )
    ) {
      return;
    }
    setBusy(true);
    const res = await generateTorneoBracketAction(campaignId);
    setBusy(false);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success(`Tabellone creato (${res.data?.matchCount ?? 8} incontri).`);
    void refresh();
  };

  return (
    <div className={cn("flex flex-col gap-3 overflow-y-auto p-3 text-zinc-100", className)}>
      <section className="space-y-2 rounded-lg border border-violet-900/40 bg-zinc-900/60 p-3">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-violet-300/90">
          <Trophy className="h-3.5 w-3.5" />
          Tabellone
        </p>
        <Button
          type="button"
          size="sm"
          className="w-full"
          disabled={busy || teams.length !== 8}
          onClick={() => void handleGenerateBracket()}
        >
          Genera tabellone (8 squadre)
        </Button>
        {teams.length !== 8 ? (
          <p className="text-[10px] text-zinc-500">Servono esattamente 8 squadre ({teams.length}/8).</p>
        ) : null}
      </section>

      <section className="space-y-2 rounded-lg border border-violet-900/40 bg-zinc-900/60 p-3">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-violet-300/90">
          <Users className="h-3.5 w-3.5" />
          Squadre
        </p>
        <div className="flex gap-2">
          <Input
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            placeholder="Nome squadra"
            className="h-8 border-violet-900/40 bg-zinc-950 text-sm"
          />
          <Button type="button" size="sm" className="h-8 shrink-0" disabled={busy} onClick={() => void handleCreateTeam()}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        <ul className="max-h-36 space-y-1 overflow-y-auto">
          {teams.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between gap-2 rounded border border-zinc-800/80 bg-zinc-950/50 px-2 py-1.5 text-xs"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: t.color }} />
                <span className="truncate font-medium">{t.name}</span>
                <span className="text-zinc-500">({t.members.length})</span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-1 text-[10px] text-red-400"
                disabled={busy}
                onClick={() => {
                  if (!confirm(`Eliminare la squadra «${t.name}»?`)) return;
                  void (async () => {
                    setBusy(true);
                    const res = await deleteTorneoTeamAction(campaignId, t.id);
                    setBusy(false);
                    if (!res.success) toast.error(res.error);
                    else void refresh();
                  })();
                }}
              >
                Elimina
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2 rounded-lg border border-violet-900/40 bg-zinc-900/60 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-violet-300/90">Assegna PG alle squadre</p>
        <ul className="max-h-40 space-y-1 overflow-y-auto">
          {roster.map((c) => (
            <li key={c.id} className="flex items-center gap-2 text-xs">
              <span className="min-w-0 flex-1 truncate text-zinc-200">{c.name}</span>
              <Select
                value={c.teamId ?? "__none"}
                onValueChange={(v) => void handleAssign(c.id, v)}
                disabled={busy || teams.length === 0}
              >
                <SelectTrigger className="h-7 w-[7.5rem] border-violet-900/40 bg-zinc-950 text-[11px]">
                  <SelectValue placeholder="Squadra" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">— Nessuna —</SelectItem>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2 rounded-lg border border-violet-900/40 bg-zinc-900/60 p-3">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-violet-300/90">
          <Swords className="h-3.5 w-3.5" />
          Incontri
        </p>
        {teams.length < 2 ? (
          <p className="text-[11px] text-zinc-500">Crea almeno due squadre per programmare un incontro.</p>
        ) : (
          <div className="space-y-2">
            <Label className="text-[10px] text-zinc-500">Nuovo incontro</Label>
            <Select value={matchTeamA} onValueChange={setMatchTeamA}>
              <SelectTrigger className="h-8 border-violet-900/40 bg-zinc-950 text-xs">
                <SelectValue placeholder="Squadra A" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={matchTeamB} onValueChange={setMatchTeamB}>
              <SelectTrigger className="h-8 border-violet-900/40 bg-zinc-950 text-xs">
                <SelectValue placeholder="Squadra B" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={matchLabel}
              onChange={(e) => setMatchLabel(e.target.value)}
              placeholder="Etichetta (opz.)"
              className="h-8 border-violet-900/40 bg-zinc-950 text-xs"
            />
            <Button type="button" size="sm" className="w-full" disabled={busy} onClick={() => void handleCreateMatch()}>
              Aggiungi incontro
            </Button>
          </div>
        )}
        <ul className="space-y-2">
          {matches.map((m) => {
            const isActive = m.id === activeMatchId;
            const onStation2 = m.id === station2MatchId;
            const isDone = m.status === "completed";
            const matchDamage = damageForMatch(m);
            return (
              <li
                key={m.id}
                className={cn(
                  "rounded-lg border p-2 text-xs",
                  isActive || onStation2
                    ? "border-amber-500/50 bg-amber-950/20"
                    : "border-zinc-800 bg-zinc-950/40"
                )}
              >
                {(isActive || onStation2) && (
                  <p className="mb-1 text-[10px] text-amber-400/90">
                    {isActive && onStation2 ? "Tavolo 1 + 2" : isActive ? "Tavolo 1" : "Tavolo 2"}
                  </p>
                )}
                <p className="font-medium text-zinc-100">
                  {m.label || "Incontro"}{" "}
                  <span className="text-zinc-500">
                    {m.match_kind === "triello"
                      ? `· Triello ${m.team_a.name}`
                      : `· ${m.team_a.name} vs ${m.team_b.name}`}
                  </span>
                </p>
                {isDone && (m.winner_team_id || m.winner_character_id) ? (
                  <p className="mt-1 flex items-center gap-1 text-emerald-400">
                    <Trophy className="h-3 w-3" />
                    {m.match_kind === "triello" && m.winner_character_id
                      ? "Triello completato"
                      : `Vincitore: ${m.winner_team_id === m.team_a_id ? m.team_a.name : m.team_b.name}`}{" "}
                    ({m.team_a_damage_total}–{m.team_b_damage_total} danni)
                  </p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-1">
                  {!isDone ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-[10px]"
                        disabled={busy}
                        onClick={() => void (isActive ? resumeMatch(m, 1) : startMatch(m, 1))}
                      >
                        {isActive ? "T1 Riprendi" : "T1 Avvia"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-[10px]"
                        disabled={busy}
                        onClick={() => void (onStation2 ? resumeMatch(m, 2) : startMatch(m, 2))}
                      >
                        {onStation2 ? "T2 Riprendi" : "T2 Avvia"}
                      </Button>
                      {m.match_kind === "triello" && trielloTeam ? (
                        trielloTeam.members.map((mem) => (
                          <Button
                            key={mem.character_id}
                            type="button"
                            size="sm"
                            className="h-7 text-[10px]"
                            disabled={busy}
                            onClick={() => void declareTrielloWinner(m, mem.character_id)}
                          >
                            Vince {mem.name}
                          </Button>
                        ))
                      ) : matchDamage ? (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            className="h-7 text-[10px]"
                            style={{ borderColor: m.team_a.color }}
                            disabled={busy}
                            onClick={() => void declareWinner(m, m.team_a_id)}
                          >
                            Vince {m.team_a.name}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className="h-7 text-[10px]"
                            style={{ borderColor: m.team_b.color }}
                            disabled={busy}
                            onClick={() => void declareWinner(m, m.team_b_id)}
                          >
                            Vince {m.team_b.name}
                          </Button>
                        </>
                      ) : null}
                    </>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 text-[10px] text-red-400"
                    disabled={busy}
                    onClick={() => {
                      if (!confirm("Eliminare questo incontro?")) return;
                      void (async () => {
                        setBusy(true);
                        const res = await deleteTorneoMatchAction(campaignId, m.id);
                        setBusy(false);
                        if (!res.success) toast.error(res.error);
                        else {
                          if (activeMatchId === m.id) persistActiveMatch(null);
                          void refresh();
                        }
                      })();
                    }}
                  >
                    Elimina
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
