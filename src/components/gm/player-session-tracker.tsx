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

const INITIATIVE_STORAGE_PREFIX = "gm-screen-initiative-";
const XP_STORAGE_PREFIX = "gm-screen-session-xp-";
const XP_STEP = 50;

type PerCharacterState = {
  present: boolean;
  plus: number;
  minus: number;
  /** Se valorizzato, sovrascrive il calcolo automatico. */
  customXp: number | null;
};

type StoredXpState = {
  version: 1;
  extraXpManual: number;
  perCharacter: Record<string, PerCharacterState>;
};

type InitiativeStorageEntry = {
  entityId?: string;
  type?: string;
  hp?: number;
};

type PlayerSessionTrackerProps = {
  campaignId: string;
};

export function PlayerSessionTracker({ campaignId }: PlayerSessionTrackerProps) {
  const [characters, setCharacters] = useState<CampaignCharacterRow[]>([]);
  const [loadingCharacters, setLoadingCharacters] = useState(false);

  const [perCharacter, setPerCharacter] = useState<Record<string, PerCharacterState>>({});
  const [extraXpManual, setExtraXpManual] = useState(0);

  const [monstersBaseXp, setMonstersBaseXp] = useState(0);
  const [loadingMonstersXp, setLoadingMonstersXp] = useState(false);

  const lastDeadEntityIdsRef = useRef<string[]>([]);

  const storageKey = `${XP_STORAGE_PREFIX}${campaignId}`;
  const initiativeStorageKey = `${INITIATIVE_STORAGE_PREFIX}${campaignId}`;

  // Carica personaggi per la campagna (solo GM).
  useEffect(() => {
    let cancelled = false;
    setLoadingCharacters(true);
    getCampaignCharacters(campaignId)
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data) {
          setCharacters(res.data);
        } else if (!res.success) {
          toast.error(res.error ?? "Errore nel caricamento dei personaggi.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingCharacters(false);
      });
    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  // Ripristina stato da localStorage.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as StoredXpState;
      if (parsed && parsed.version === 1) {
        setExtraXpManual(
          Number.isFinite(parsed.extraXpManual) ? Math.max(0, Math.floor(parsed.extraXpManual)) : 0
        );
        setPerCharacter(parsed.perCharacter ?? {});
      }
    } catch {
      // ignore
    }
  }, [storageKey]);

  // Persiste stato su localStorage.
  useEffect(() => {
    try {
      const payload: StoredXpState = {
        version: 1,
        extraXpManual,
        perCharacter,
      };
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {
      // ignore
    }
  }, [storageKey, extraXpManual, perCharacter]);

  const ensureCharacterState = useCallback(
    (characterId: string): PerCharacterState => {
      return (
        perCharacter[characterId] ?? {
          present: true,
          plus: 0,
          minus: 0,
          customXp: null,
        }
      );
    },
    [perCharacter]
  );

  const setCharacterState = useCallback(
    (characterId: string, updater: (prev: PerCharacterState) => PerCharacterState) => {
      setPerCharacter((prev) => {
        const current = prev[characterId] ?? {
          present: true,
          plus: 0,
          minus: 0,
          customXp: null,
        };
        return {
          ...prev,
          [characterId]: updater(current),
        };
      });
    },
    []
  );

  const syncMonstersXpFromInitiative = useCallback(async () => {
    try {
      const raw = localStorage.getItem(initiativeStorageKey);
      if (!raw) {
        setMonstersBaseXp(0);
        lastDeadEntityIdsRef.current = [];
        return;
      }
      const parsed = JSON.parse(raw) as { entries?: InitiativeStorageEntry[] };
      const entries = Array.isArray(parsed.entries) ? parsed.entries : [];
      const deadIds = Array.from(
        new Set(
          entries
            .filter((e) => e && e.entityId && e.hp === 0 && e.type === "monster")
            .map((e) => e.entityId as string)
        )
      );

      // Evita chiamate inutili se l'insieme di id non è cambiato.
      const prev = lastDeadEntityIdsRef.current.slice().sort().join(",");
      const next = deadIds.slice().sort().join(",");
      if (prev === next) return;

      lastDeadEntityIdsRef.current = deadIds;

      if (deadIds.length === 0) {
        setMonstersBaseXp(0);
        return;
      }

      setLoadingMonstersXp(true);
      const res = await getMonstersXpForIds(campaignId, deadIds);
      setLoadingMonstersXp(false);

      if (!res.success) {
        toast.error(res.error ?? "Errore nel calcolo dei PE dei mostri.");
        return;
      }

      const total = res.data.reduce((sum, row) => sum + (row.xp_value ?? 0), 0);
      setMonstersBaseXp(total);
    } catch {
      // ignore
    }
  }, [campaignId, initiativeStorageKey]);

  // Polling leggero del localStorage dell'Initiative Tracker per tenere aggiornati i PE dei mostri uccisi.
  useEffect(() => {
    // Sincronizza subito all'apertura.
    void syncMonstersXpFromInitiative();
    const id = window.setInterval(() => {
      void syncMonstersXpFromInitiative();
    }, 5000);
    return () => window.clearInterval(id);
  }, [syncMonstersXpFromInitiative]);

  const totalBaseXp = useMemo(() => monstersBaseXp + extraXpManual, [monstersBaseXp, extraXpManual]);

  const presentCharacters = useMemo(
    () =>
      characters.filter((c) => {
        const state = ensureCharacterState(c.id);
        return state.present;
      }),
    [characters, ensureCharacterState]
  );

  const basePerPlayer = useMemo(() => {
    if (presentCharacters.length === 0) return 0;
    return Math.floor(totalBaseXp / presentCharacters.length);
  }, [totalBaseXp, presentCharacters.length]);

  const computedXpByCharacterId = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of characters) {
      const state = ensureCharacterState(c.id);
      if (!state.present) {
        map[c.id] = 0;
        continue;
      }
      const delta = (state.plus - state.minus) * XP_STEP;
      const value = Math.max(0, basePerPlayer + delta);
      map[c.id] = value;
    }
    return map;
  }, [characters, ensureCharacterState, basePerPlayer]);

  const finalXpByCharacterId = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of characters) {
      const state = ensureCharacterState(c.id);
      if (!state.present) {
        map[c.id] = 0;
        continue;
      }
      const computed = computedXpByCharacterId[c.id] ?? 0;
      const finalValue =
        state.customXp != null && Number.isFinite(state.customXp) ? Math.max(0, Math.floor(state.customXp)) : computed;
      map[c.id] = finalValue;
    }
    return map;
  }, [characters, ensureCharacterState, computedXpByCharacterId]);

  const totalDistributedXp = useMemo(
    () => Object.values(finalXpByCharacterId).reduce((sum, v) => sum + v, 0),
    [finalXpByCharacterId]
  );

  return (
    <section className="mt-3 flex h-full min-h-[260px] flex-col rounded border border-amber-600/30 bg-zinc-900/80 p-3 text-xs text-zinc-100">
      <header className="mb-2 flex items-center justify-between gap-2 border-b border-amber-600/30 pb-1.5">
        <div className="flex items-center gap-2">
          <Swords className="h-4 w-4 text-amber-400" />
          <div>
            <h2 className="text-xs font-bold tracking-tight text-amber-300">PE Sessione</h2>
            <p className="text-[10px] text-zinc-400">
              Divide i PE tra i personaggi presenti (+/- {XP_STEP} PE).
            </p>
          </div>
        </div>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-7 w-7 border-amber-600/40 text-amber-200 hover:bg-amber-600/20"
          onClick={() => void syncMonstersXpFromInitiative()}
          title="Ricalcola PE da mostri uccisi nel Tracker"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loadingMonstersXp && "animate-spin")} />
        </Button>
      </header>

      <div className="mb-2 grid grid-cols-2 gap-x-3 gap-y-1">
        <div className="space-y-0.5">
          <p className="text-[11px] text-zinc-400">PE da mostri uccisi</p>
          <p className="text-sm font-semibold text-amber-300">{monstersBaseXp} PE</p>
        </div>
        <div className="space-y-0.5">
          <label className="flex items-center justify-between gap-2 text-[11px] text-zinc-400">
            <span>PE extra manuali</span>
          </label>
          <Input
            type="number"
            min={0}
            value={extraXpManual || ""}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              setExtraXpManual(Number.isNaN(v) ? 0 : Math.max(0, v));
            }}
            className="h-7 w-full border-amber-600/40 bg-zinc-950 text-xs text-zinc-100"
            placeholder="0"
          />
        </div>
        <div className="space-y-0.5">
          <p className="text-[11px] text-zinc-400">PE totali base</p>
          <p className="text-sm font-semibold text-amber-300">{totalBaseXp} PE</p>
        </div>
        <div className="space-y-0.5">
          <p className="text-[11px] text-zinc-400">Presenti / Totale PG</p>
          <p className="text-sm font-semibold text-amber-300">
            {presentCharacters.length} / {characters.length || "—"}
          </p>
        </div>
        <div className="space-y-0.5">
          <p className="text-[11px] text-zinc-400">PE per presente (prima di +/-)</p>
          <p className="text-sm font-semibold text-amber-300">{basePerPlayer} PE</p>
        </div>
        <div className="space-y-0.5">
          <p className="text-[11px] text-zinc-400">PE distribuiti totali</p>
          <p className="text-sm font-semibold text-amber-300">{totalDistributedXp} PE</p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded border border-amber-600/30">
        <Table>
          <TableHeader>
            <TableRow className="border-amber-600/20 hover:bg-transparent">
              <TableHead className="h-7 w-16 px-2 text-[11px] font-semibold text-amber-400">Presente</TableHead>
              <TableHead className="h-7 px-2 text-[11px] font-semibold text-amber-400">Personaggio</TableHead>
              <TableHead className="h-7 w-36 px-2 text-[11px] font-semibold text-amber-400">+ / -</TableHead>
              <TableHead className="h-7 w-36 px-2 text-[11px] font-semibold text-amber-400">PE Finale</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingCharacters ? (
              <TableRow className="border-amber-600/20">
                <TableCell colSpan={4} className="py-4 text-center text-[11px] text-zinc-400">
                  Caricamento personaggi…
                </TableCell>
              </TableRow>
            ) : characters.length === 0 ? (
              <TableRow className="border-amber-600/20">
                <TableCell colSpan={4} className="py-4 text-center text-[11px] text-zinc-400">
                  Nessun personaggio nella campagna.
                </TableCell>
              </TableRow>
            ) : (
              characters.map((c) => {
                const state = ensureCharacterState(c.id);
                const computed = computedXpByCharacterId[c.id] ?? 0;
                const final = finalXpByCharacterId[c.id] ?? 0;
                const isOverridden =
                  state.customXp != null && Number.isFinite(state.customXp) && Math.floor(state.customXp) !== computed;
                return (
                  <TableRow
                    key={c.id}
                    className={cn(
                      "border-amber-600/20 text-[11px]",
                      !state.present && "bg-zinc-900/80 text-zinc-500 opacity-70"
                    )}
                  >
                    <TableCell className="px-2 py-1.5">
                      <label className="relative inline-flex h-5 w-9 cursor-pointer items-center rounded-full transition-colors focus-within:ring-2 focus-within:ring-amber-500/50 focus-within:ring-offset-2 focus-within:ring-offset-zinc-900">
                        <input
                          type="checkbox"
                          checked={state.present}
                          onChange={(e) =>
                            setCharacterState(c.id, (prev) => ({
                              ...prev,
                              present: e.target.checked,
                            }))
                          }
                          className="sr-only"
                        />
                        <span
                          className={cn(
                            "block h-4 w-7 rounded-full transition-colors",
                            state.present ? "bg-emerald-600" : "bg-zinc-700"
                          )}
                        />
                        <span
                          className={cn(
                            "absolute left-0.5 top-0.5 h-3 w-3 rounded-full bg-white transition-transform",
                            state.present && "translate-x-[0.875rem]"
                          )}
                        />
                      </label>
                    </TableCell>
                    <TableCell className="max-w-[140px] px-2 py-1.5">
                      <span
                        className={cn(
                          "block truncate font-medium",
                          state.present ? "text-zinc-100" : "text-zinc-500 line-through"
                        )}
                        title={c.name}
                      >
                        {c.name}
                      </span>
                    </TableCell>
                    <TableCell className="px-2 py-1.5">
                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="h-6 w-6 border-amber-600/40 text-emerald-300 hover:bg-emerald-600/20"
                          onClick={() =>
                            setCharacterState(c.id, (prev) => ({
                              ...prev,
                              plus: prev.plus + 1,
                            }))
                          }
                          disabled={!state.present}
                          title={`Aggiungi +${XP_STEP} PE`}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <div className="min-w-[72px] text-center text-[11px] text-zinc-200">
                          +{state.plus} / -{state.minus}
                        </div>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="h-6 w-6 border-amber-600/40 text-red-300 hover:bg-red-600/20"
                          onClick={() =>
                            setCharacterState(c.id, (prev) => ({
                              ...prev,
                              minus: prev.minus + 1,
                            }))
                          }
                          disabled={!state.present}
                          title={`Aggiungi -${XP_STEP} PE`}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="px-2 py-1.5">
                      <div className="space-y-1">
                        <Input
                          type="number"
                          min={0}
                          value={state.customXp ?? ""}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (raw === "") {
                              setCharacterState(c.id, (prev) => ({ ...prev, customXp: null }));
                              return;
                            }
                            const v = parseInt(raw, 10);
                            setCharacterState(c.id, (prev) => ({
                              ...prev,
                              customXp: Number.isNaN(v) ? null : Math.max(0, v),
                            }));
                          }}
                          placeholder={String(computed)}
                          className={cn(
                            "h-7 w-full border-amber-600/40 bg-zinc-950 text-xs text-zinc-100",
                            !state.present && "opacity-60"
                          )}
                          disabled={!state.present}
                        />
                        <p className="text-[10px] text-zinc-400">
                          Calcolato:{" "}
                          <span className="font-semibold text-amber-200">
                            {computed} PE
                          </span>
                          {isOverridden && (
                            <>
                              {" "}
                              • Assegnato:{" "}
                              <span className="font-semibold text-emerald-300">
                                {final} PE
                              </span>
                            </>
                          )}
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

