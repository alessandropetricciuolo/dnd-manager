"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getCampaignCharacters, type CampaignCharacterRow } from "@/app/campaigns/character-actions";
import { getMonstersXpForIds } from "@/app/campaigns/wiki-actions";
import { Swords, Plus, Minus, RefreshCw } from "lucide-react";
import type { InitiativeEntry } from "@/components/gm/initiative-tracker";

const INITIATIVE_STORAGE_PREFIX = "gm-screen-initiative-";
const XP_STORAGE_PREFIX = "gm-screen-session-xp-";
const XP_STEP = 50;

type PerCharacterState = {
  present?: boolean;
  plus: number;
  minus: number;
  customXp: number | null;
};

export type StoredXpState = {
  version: 2;
  extraXpManual: number;
  bankedMonsterXp: number;
  perCharacter: Record<string, PerCharacterState>;
};

type InitiativeStorageEntry = Pick<InitiativeEntry, "entityId" | "type" | "hp" | "exp" | "isDead">;

type AttendanceMap = Record<string, "attended" | "absent">;

type PlayerSessionTrackerProps = {
  campaignId: string;
  characters?: CampaignCharacterRow[];
  attendance?: AttendanceMap;
  onAttendanceChange?: (playerId: string, value: "attended" | "absent") => void;
  initiativeEntries?: InitiativeEntry[];
  value?: StoredXpState;
  onChange?: (state: StoredXpState) => void;
  onCloseFight?: () => void;
};

function defaultPerCharacterState(): PerCharacterState {
  return {
    plus: 0,
    minus: 0,
    customXp: null,
    present: true,
  };
}

function sanitizeState(input: StoredXpState | null | undefined, validCharacterIds: string[]): StoredXpState {
  const valid = new Set(validCharacterIds);
  const perCharacter: Record<string, PerCharacterState> = {};
  for (const [characterId, state] of Object.entries(input?.perCharacter ?? {})) {
    if (!valid.has(characterId)) continue;
    perCharacter[characterId] = {
      present: typeof state.present === "boolean" ? state.present : true,
      plus: Number.isFinite(state.plus) ? Math.max(0, Math.trunc(state.plus)) : 0,
      minus: Number.isFinite(state.minus) ? Math.max(0, Math.trunc(state.minus)) : 0,
      customXp:
        state.customXp != null && Number.isFinite(state.customXp)
          ? Math.max(0, Math.trunc(state.customXp))
          : null,
    };
  }
  return {
    version: 2,
    extraXpManual:
      input?.extraXpManual != null && Number.isFinite(input.extraXpManual)
        ? Math.max(0, Math.trunc(input.extraXpManual))
        : 0,
    bankedMonsterXp:
      input?.bankedMonsterXp != null && Number.isFinite(input.bankedMonsterXp)
        ? Math.max(0, Math.trunc(input.bankedMonsterXp))
        : 0,
    perCharacter,
  };
}

function arePerCharacterStatesEqual(a: PerCharacterState | undefined, b: PerCharacterState | undefined) {
  return (
    (a?.present ?? true) === (b?.present ?? true) &&
    (a?.plus ?? 0) === (b?.plus ?? 0) &&
    (a?.minus ?? 0) === (b?.minus ?? 0) &&
    (a?.customXp ?? null) === (b?.customXp ?? null)
  );
}

function areXpStatesEqual(a: StoredXpState, b: StoredXpState) {
  if (a.version !== b.version || a.extraXpManual !== b.extraXpManual || a.bankedMonsterXp !== b.bankedMonsterXp) return false;
  const aKeys = Object.keys(a.perCharacter);
  const bKeys = Object.keys(b.perCharacter);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (!b.perCharacter[key]) return false;
    if (!arePerCharacterStatesEqual(a.perCharacter[key], b.perCharacter[key])) return false;
  }
  return true;
}

function isMonsterDead(entry: InitiativeStorageEntry | InitiativeEntry) {
  if (entry.type !== "monster" && entry.type !== "custom") return false;
  return entry.isDead === true || entry.hp === 0;
}

export function computeSessionXpAwards({
  characters,
  attendance,
  xpState,
  initiativeEntries,
}: {
  characters: CampaignCharacterRow[];
  attendance?: AttendanceMap;
  xpState: StoredXpState;
  initiativeEntries?: InitiativeEntry[];
}) {
  const deadMonsterXp = (initiativeEntries ?? []).reduce((sum, entry) => {
    if (!isMonsterDead(entry)) return sum;
    return sum + (typeof entry.exp === "number" ? entry.exp : 0);
  }, 0);

  const totalBaseXp =
    deadMonsterXp +
    Math.max(0, Math.trunc(xpState.extraXpManual || 0)) +
    Math.max(0, Math.trunc(xpState.bankedMonsterXp || 0));
  const presentCharacters = characters.filter((character) => {
    if (attendance && character.assigned_to) {
      return attendance[character.assigned_to] !== "absent";
    }
    return (xpState.perCharacter[character.id]?.present ?? true) === true;
  });

  const basePerPlayer = presentCharacters.length > 0 ? Math.floor(totalBaseXp / presentCharacters.length) : 0;
  const finalXpByCharacterId: Record<string, number> = {};

  for (const character of characters) {
    const state = xpState.perCharacter[character.id] ?? defaultPerCharacterState();
    const isPresent = attendance && character.assigned_to
      ? attendance[character.assigned_to] !== "absent"
      : (state.present ?? true);
    if (!isPresent) {
      finalXpByCharacterId[character.id] = 0;
      continue;
    }
    const delta = (state.plus - state.minus) * XP_STEP;
    const computed = Math.max(0, basePerPlayer + delta);
    finalXpByCharacterId[character.id] =
      state.customXp != null && Number.isFinite(state.customXp)
        ? Math.max(0, Math.trunc(state.customXp))
        : computed;
  }

  return {
    deadMonsterXp,
    totalBaseXp,
    basePerPlayer,
    finalXpByCharacterId,
    awards: characters
      .filter((character) => character.assigned_to)
      .map((character) => ({
        playerId: character.assigned_to as string,
        xp: finalXpByCharacterId[character.id] ?? 0,
      }))
      .filter((award) => award.xp > 0),
  };
}

export function PlayerSessionTracker({
  campaignId,
  characters: providedCharacters,
  attendance,
  onAttendanceChange,
  initiativeEntries,
  value,
  onChange,
  onCloseFight,
}: PlayerSessionTrackerProps) {
  const sessionMode = Array.isArray(providedCharacters) && attendance != null && typeof onAttendanceChange === "function";
  const isControlled = value != null && typeof onChange === "function";
  const [characters, setCharacters] = useState<CampaignCharacterRow[]>(providedCharacters ?? []);
  const [loadingCharacters, setLoadingCharacters] = useState(!sessionMode);
  const [xpState, setXpState] = useState<StoredXpState>(sanitizeState(value, (providedCharacters ?? []).map((c) => c.id)));
  const [deadMonsterXp, setDeadMonsterXp] = useState(0);
  const [loadingMonstersXp, setLoadingMonstersXp] = useState(false);
  const lastLegacyKeyRef = useRef("");
  const xpStateRef = useRef(xpState);
  const skipControlledEchoRef = useRef(false);
  const storageKey = `${XP_STORAGE_PREFIX}${campaignId}`;
  const initiativeStorageKey = `${INITIATIVE_STORAGE_PREFIX}${campaignId}`;

  useEffect(() => {
    xpStateRef.current = xpState;
  }, [xpState]);

  useEffect(() => {
    if (!sessionMode) return;
    setCharacters(providedCharacters ?? []);
  }, [providedCharacters, sessionMode]);

  useEffect(() => {
    const validCharacterIds = (providedCharacters ?? characters).map((character) => character.id);
    if (isControlled) {
      const nextState = sanitizeState(value, validCharacterIds);
      if (areXpStatesEqual(xpStateRef.current, nextState)) return;
      skipControlledEchoRef.current = true;
      setXpState(nextState);
    }
  }, [characters, isControlled, providedCharacters, value]);

  useEffect(() => {
    if (sessionMode) return;
    let cancelled = false;
    setLoadingCharacters(true);
    getCampaignCharacters(campaignId)
      .then((result) => {
        if (cancelled) return;
        if (result.success && result.data) {
          setCharacters(result.data);
        } else if (!result.success) {
          toast.error(result.error ?? "Errore nel caricamento dei personaggi.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingCharacters(false);
      });
    return () => {
      cancelled = true;
    };
  }, [campaignId, sessionMode]);

  useEffect(() => {
    if (sessionMode || isControlled) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as StoredXpState & { version?: number };
      const normalized =
        parsed?.version === 2
          ? sanitizeState(parsed, characters.map((character) => character.id))
          : sanitizeState(
              {
                version: 2,
                extraXpManual: parsed?.extraXpManual ?? 0,
                bankedMonsterXp: (parsed as { bankedMonsterXp?: number })?.bankedMonsterXp ?? 0,
                perCharacter: parsed?.perCharacter ?? {},
              },
              characters.map((character) => character.id)
            );
      setXpState((current) => (areXpStatesEqual(current, normalized) ? current : normalized));
    } catch {
      // ignore
    }
  }, [characters, isControlled, sessionMode, storageKey]);

  useEffect(() => {
    const validCharacterIds = characters.map((character) => character.id);
    setXpState((current) => {
      const nextState = sanitizeState(current, validCharacterIds);
      return areXpStatesEqual(current, nextState) ? current : nextState;
    });
  }, [characters]);

  useEffect(() => {
    if (isControlled) {
      if (skipControlledEchoRef.current) {
        skipControlledEchoRef.current = false;
        return;
      }
      onChange?.(xpState);
      return;
    }
    if (sessionMode) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(xpState));
    } catch {
      // ignore
    }
  }, [isControlled, onChange, sessionMode, storageKey, xpState]);

  const setCharacterState = useCallback(
    (characterId: string, updater: (prev: PerCharacterState) => PerCharacterState) => {
      setXpState((current) => {
        const previous = current.perCharacter[characterId] ?? defaultPerCharacterState();
        return {
          ...current,
          perCharacter: {
            ...current.perCharacter,
            [characterId]: updater(previous),
          },
        };
      });
    },
    []
  );

  const syncMonstersXp = useCallback(async () => {
    if (initiativeEntries) {
      setDeadMonsterXp(
        initiativeEntries.reduce((sum, entry) => {
          if (!isMonsterDead(entry)) return sum;
          return sum + (typeof entry.exp === "number" ? entry.exp : 0);
        }, 0)
      );
      return;
    }

    try {
      const raw = localStorage.getItem(initiativeStorageKey);
      if (!raw) {
        setDeadMonsterXp(0);
        lastLegacyKeyRef.current = "";
        return;
      }
      const parsed = JSON.parse(raw) as { entries?: InitiativeStorageEntry[] };
      const entries = Array.isArray(parsed.entries) ? parsed.entries : [];
      const legacyKey = JSON.stringify(
        entries.map((entry) => ({
          entityId: entry.entityId,
          exp: entry.exp,
          hp: entry.hp,
          type: entry.type,
          isDead: entry.isDead,
        }))
      );
      if (legacyKey === lastLegacyKeyRef.current) return;
      lastLegacyKeyRef.current = legacyKey;

      const directTotal = entries.reduce((sum, entry) => {
        if (!isMonsterDead(entry)) return sum;
        return sum + (typeof entry.exp === "number" ? entry.exp : 0);
      }, 0);

      const idsToLookup = entries
        .filter((entry) => isMonsterDead(entry) && entry.entityId && typeof entry.exp !== "number")
        .map((entry) => entry.entityId as string);

      if (idsToLookup.length === 0) {
        setDeadMonsterXp(directTotal);
        return;
      }

      setLoadingMonstersXp(true);
      const result = await getMonstersXpForIds(campaignId, Array.from(new Set(idsToLookup)));
      setLoadingMonstersXp(false);
      if (!result.success) {
        toast.error(result.error ?? "Errore nel calcolo dei PE dei mostri.");
        return;
      }

      const xpByEntityId = new Map(result.data.map((row) => [row.id, row.xp_value ?? 0]));
      const lookedUpTotal = entries.reduce((sum, entry) => {
        if (!isMonsterDead(entry) || !entry.entityId || typeof entry.exp === "number") return sum;
        return sum + (xpByEntityId.get(entry.entityId) ?? 0);
      }, 0);
      setDeadMonsterXp(directTotal + lookedUpTotal);
    } catch {
      // ignore
    }
  }, [campaignId, initiativeEntries, initiativeStorageKey]);

  useEffect(() => {
    void syncMonstersXp();
    if (initiativeEntries) return;
    const id = window.setInterval(() => {
      void syncMonstersXp();
    }, 5000);
    return () => window.clearInterval(id);
  }, [initiativeEntries, syncMonstersXp]);

  const xpSummary = useMemo(
    () =>
      computeSessionXpAwards({
        characters,
        attendance,
        xpState: {
          version: 2,
          extraXpManual: xpState.extraXpManual,
          bankedMonsterXp: xpState.bankedMonsterXp,
          perCharacter: xpState.perCharacter,
        },
        initiativeEntries: initiativeEntries?.length
          ? initiativeEntries
          : Array.from({ length: 0 }),
      }),
    [attendance, characters, initiativeEntries, xpState.bankedMonsterXp, xpState.extraXpManual, xpState.perCharacter]
  );

  const effectiveMonsterXp = initiativeEntries ? xpSummary.deadMonsterXp : deadMonsterXp;
  const presentCharactersCount = characters.filter((character) => {
    const state = xpState.perCharacter[character.id] ?? defaultPerCharacterState();
    if (attendance && character.assigned_to) {
      return attendance[character.assigned_to] !== "absent";
    }
    return (state.present ?? true) === true;
  }).length;
  const effectiveBasePerPlayer =
    presentCharactersCount > 0
      ? Math.floor(
          (effectiveMonsterXp +
            Math.max(0, Math.trunc(xpState.extraXpManual || 0)) +
            Math.max(0, Math.trunc(xpState.bankedMonsterXp || 0))) /
            presentCharactersCount
        )
      : 0;

  const closeCurrentFight = useCallback(() => {
    if (effectiveMonsterXp <= 0) {
      toast.error("Nessun PE mostro da salvare per questo fight.");
      return;
    }
    setXpState((current) => ({
      ...current,
      bankedMonsterXp: Math.max(0, Math.trunc(current.bankedMonsterXp || 0)) + effectiveMonsterXp,
    }));
    onCloseFight?.();
    setDeadMonsterXp(0);
    toast.success(`Fight chiuso: ${effectiveMonsterXp} PE mostro salvati.`);
  }, [effectiveMonsterXp, onCloseFight]);

  const computedXpByCharacterId = useMemo(() => {
    const map: Record<string, number> = {};
    for (const character of characters) {
      const state = xpState.perCharacter[character.id] ?? defaultPerCharacterState();
      const isPresent = attendance && character.assigned_to
        ? attendance[character.assigned_to] !== "absent"
        : (state.present ?? true);
      if (!isPresent) {
        map[character.id] = 0;
        continue;
      }
      const delta = (state.plus - state.minus) * XP_STEP;
      map[character.id] = Math.max(0, effectiveBasePerPlayer + delta);
    }
    return map;
  }, [attendance, characters, effectiveBasePerPlayer, xpState.perCharacter]);

  const finalXpByCharacterId = useMemo(() => {
    const map: Record<string, number> = {};
    for (const character of characters) {
      const state = xpState.perCharacter[character.id] ?? defaultPerCharacterState();
      const isPresent = attendance && character.assigned_to
        ? attendance[character.assigned_to] !== "absent"
        : (state.present ?? true);
      if (!isPresent) {
        map[character.id] = 0;
        continue;
      }
      const computed = computedXpByCharacterId[character.id] ?? 0;
      map[character.id] =
        state.customXp != null && Number.isFinite(state.customXp)
          ? Math.max(0, Math.trunc(state.customXp))
          : computed;
    }
    return map;
  }, [attendance, characters, computedXpByCharacterId, xpState.perCharacter]);

  const totalDistributedXp = useMemo(
    () => Object.values(finalXpByCharacterId).reduce((sum, value) => sum + value, 0),
    [finalXpByCharacterId]
  );

  return (
    <section className="flex min-h-[320px] flex-col rounded-xl border border-amber-600/25 bg-zinc-900/75 p-4 text-zinc-100">
      <header className="mb-3 flex items-center justify-between gap-3 border-b border-amber-600/20 pb-3">
        <div className="flex items-center gap-3">
          <Swords className="h-5 w-5 text-amber-300" />
          <div>
            <h2 className="text-sm font-semibold text-amber-200">Tracker XP Sessione</h2>
            <p className="text-xs text-zinc-400">
              Mostra gli iscritti della sessione e distribuisce i PE ai presenti.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 border-emerald-600/35 text-emerald-200 hover:bg-emerald-600/15"
            onClick={closeCurrentFight}
            disabled={effectiveMonsterXp <= 0}
            title="Chiudi fight e salva i PE mostri nel totale sessione"
          >
            Chiudi fight
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-8 w-8 border-amber-600/30 text-amber-100 hover:bg-amber-600/15"
            onClick={() => void syncMonstersXp()}
            title="Ricalcola PE da mostri morti"
          >
            <RefreshCw className={cn("h-4 w-4", loadingMonstersXp && "animate-spin")} />
          </Button>
        </div>
      </header>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-lg border border-amber-600/20 bg-zinc-950/40 p-3">
          <p className="text-[11px] uppercase tracking-wide text-zinc-400">PE da mostri morti</p>
          <p className="mt-1 text-lg font-semibold text-amber-200">{effectiveMonsterXp} PE</p>
        </div>
        <div className="rounded-lg border border-amber-600/20 bg-zinc-950/40 p-3">
          <p className="text-[11px] uppercase tracking-wide text-zinc-400">PE fight chiusi</p>
          <p className="mt-1 text-lg font-semibold text-amber-200">{xpState.bankedMonsterXp || 0} PE</p>
        </div>
        <div className="rounded-lg border border-amber-600/20 bg-zinc-950/40 p-3">
          <label className="text-[11px] uppercase tracking-wide text-zinc-400">PE extra manuali</label>
          <Input
            type="number"
            min={0}
            value={xpState.extraXpManual || ""}
            onChange={(event) =>
              setXpState((current) => ({
                ...current,
                extraXpManual: Math.max(0, parseInt(event.target.value, 10) || 0),
              }))
            }
            className="mt-2 h-10 border-amber-600/30 bg-zinc-950 text-zinc-100"
            placeholder="0"
          />
        </div>
        <div className="rounded-lg border border-amber-600/20 bg-zinc-950/40 p-3">
          <p className="text-[11px] uppercase tracking-wide text-zinc-400">PE base per presente</p>
          <p className="mt-1 text-lg font-semibold text-amber-200">{effectiveBasePerPlayer} PE</p>
          <p className="mt-1 text-xs text-zinc-500">
            {xpSummary.awards.length} assegnazioni valide • {totalDistributedXp} PE distribuiti
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-amber-600/20">
        <Table>
          <TableHeader>
            <TableRow className="border-amber-600/20 hover:bg-transparent">
              <TableHead className="h-9 w-20 px-2 text-xs font-semibold text-amber-300">Presente</TableHead>
              <TableHead className="h-9 px-2 text-xs font-semibold text-amber-300">Personaggio</TableHead>
              <TableHead className="h-9 w-36 px-2 text-xs font-semibold text-amber-300">+ / -</TableHead>
              <TableHead className="h-9 w-44 px-2 text-xs font-semibold text-amber-300">PE Finali</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingCharacters ? (
              <TableRow className="border-amber-600/20">
                <TableCell colSpan={4} className="py-6 text-center text-sm text-zinc-400">
                  Caricamento personaggi…
                </TableCell>
              </TableRow>
            ) : characters.length === 0 ? (
              <TableRow className="border-amber-600/20">
                <TableCell colSpan={4} className="py-6 text-center text-sm text-zinc-400">
                  Nessun personaggio disponibile per questa sessione.
                </TableCell>
              </TableRow>
            ) : (
              characters.map((character) => {
                const state = xpState.perCharacter[character.id] ?? defaultPerCharacterState();
                const computed = computedXpByCharacterId[character.id] ?? 0;
                const finalValue = finalXpByCharacterId[character.id] ?? 0;
                const isPresent = attendance && character.assigned_to
                  ? attendance[character.assigned_to] !== "absent"
                  : (state.present ?? true);
                const isOverridden =
                  state.customXp != null && Number.isFinite(state.customXp) && Math.floor(state.customXp) !== computed;

                return (
                  <TableRow
                    key={character.id}
                    className={cn(
                      "border-amber-600/20 text-sm",
                      !isPresent && "bg-zinc-900/70 text-zinc-500 opacity-70"
                    )}
                  >
                    <TableCell className="px-2 py-2">
                      <label className="relative inline-flex h-5 w-9 cursor-pointer items-center rounded-full">
                        <input
                          type="checkbox"
                          checked={isPresent}
                          onChange={(event) => {
                            if (attendance && character.assigned_to && onAttendanceChange) {
                              onAttendanceChange(
                                character.assigned_to,
                                event.target.checked ? "attended" : "absent"
                              );
                              return;
                            }
                            setCharacterState(character.id, (previous) => ({
                              ...previous,
                              present: event.target.checked,
                            }));
                          }}
                          className="sr-only"
                        />
                        <span
                          className={cn(
                            "block h-4 w-7 rounded-full transition-colors",
                            isPresent ? "bg-emerald-600" : "bg-zinc-700"
                          )}
                        />
                        <span
                          className={cn(
                            "absolute left-0.5 top-0.5 h-3 w-3 rounded-full bg-white transition-transform",
                            isPresent && "translate-x-[0.875rem]"
                          )}
                        />
                      </label>
                    </TableCell>
                    <TableCell className="px-2 py-2">
                      <div className="min-w-0">
                        <p
                          className={cn(
                            "truncate font-medium",
                            isPresent ? "text-zinc-100" : "text-zinc-500 line-through"
                          )}
                          title={character.name}
                        >
                          {character.name}
                        </p>
                        {character.assigned_to ? (
                          <p className="text-[11px] text-zinc-500">{character.current_xp} XP attuali</p>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="px-2 py-2">
                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="h-7 w-7 border-amber-600/30 text-emerald-300 hover:bg-emerald-600/20"
                          onClick={() =>
                            setCharacterState(character.id, (previous) => ({
                              ...previous,
                              plus: previous.plus + 1,
                            }))
                          }
                          disabled={!isPresent}
                          title={`Aggiungi +${XP_STEP} PE`}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                        <div className="min-w-[72px] text-center text-xs text-zinc-200">
                          +{state.plus} / -{state.minus}
                        </div>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="h-7 w-7 border-amber-600/30 text-red-300 hover:bg-red-600/20"
                          onClick={() =>
                            setCharacterState(character.id, (previous) => ({
                              ...previous,
                              minus: previous.minus + 1,
                            }))
                          }
                          disabled={!isPresent}
                          title={`Aggiungi -${XP_STEP} PE`}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="px-2 py-2">
                      <div className="space-y-1">
                        <Input
                          type="number"
                          min={0}
                          value={state.customXp ?? ""}
                          onChange={(event) => {
                            const raw = event.target.value;
                            if (raw === "") {
                              setCharacterState(character.id, (previous) => ({ ...previous, customXp: null }));
                              return;
                            }
                            setCharacterState(character.id, (previous) => ({
                              ...previous,
                              customXp: Math.max(0, parseInt(raw, 10) || 0),
                            }));
                          }}
                          placeholder={String(computed)}
                          className="h-9 border-amber-600/30 bg-zinc-950 text-zinc-100"
                          disabled={!isPresent}
                        />
                        <p className="text-[11px] text-zinc-400">
                          Calcolato: <span className="font-semibold text-amber-200">{computed} PE</span>
                          {isOverridden ? (
                            <>
                              {" "}
                              • Assegnato: <span className="font-semibold text-emerald-300">{finalValue} PE</span>
                            </>
                          ) : null}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

