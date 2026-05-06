"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { Coins, Loader2, Minus, Plus } from "lucide-react";
import {
  getLongCampaignEconomySnapshot,
  adjustCharacterCoinsBatchAction,
  distributeMissionTreasureAction,
  type EconomyCharacterSnapshot,
  type EconomyMissionSnapshot,
} from "@/lib/actions/campaign-economy-actions";
import type { LongSessionAttendanceStatus, LongSessionEconomyDraft } from "@/components/gm/gm-screen-long-state";

type LongEconomyPanelProps = {
  campaignId: string;
  playerIds?: string[];
  attendance?: Record<string, LongSessionAttendanceStatus>;
  economyDraft?: LongSessionEconomyDraft;
  onDraftChange?: (draft: LongSessionEconomyDraft) => void;
  onCoinsCommitted?: (
    characterId: string,
    next: { coins_gp: number; coins_sp: number; coins_cp: number }
  ) => void;
  onRefreshCharacters?: () => Promise<void>;
};

type RowSaveState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "saved" }
  | { status: "error"; message: string };

function parseNonNeg(s: string): number {
  const n = Math.trunc(Number.parseInt(s, 10) || 0);
  return Math.max(0, n);
}

function parseRowDelta(row: { gp: string; sp: string; cp: string }) {
  return {
    gp: Math.trunc(Number.parseInt(row.gp, 10) || 0),
    sp: Math.trunc(Number.parseInt(row.sp, 10) || 0),
    cp: Math.trunc(Number.parseInt(row.cp, 10) || 0),
  };
}

export function LongEconomyPanel({
  campaignId,
  playerIds,
  economyDraft,
  onDraftChange,
  onCoinsCommitted,
  onRefreshCharacters,
}: LongEconomyPanelProps) {
  const economyDraftRef = useRef(economyDraft);
  const [loading, setLoading] = useState(true);
  const [missions, setMissions] = useState<EconomyMissionSnapshot[]>([]);
  const [characters, setCharacters] = useState<EconomyCharacterSnapshot[]>([]);
  const [isPending, setIsPending] = useState(false);

  const [payoutMissionId, setPayoutMissionId] = useState<string>("");
  const [payoutAlloc, setPayoutAlloc] = useState<Record<string, { gp: string; sp: string; cp: string }>>({});
  const [liveDeltaDraft, setLiveDeltaDraft] = useState<Record<string, { gp: string; sp: string; cp: string }>>({});
  const [rowSaveState, setRowSaveState] = useState<Record<string, RowSaveState>>({});
  const saveStatusTimersRef = useRef<Record<string, number>>({});

  useEffect(() => {
    economyDraftRef.current = economyDraft;
  }, [economyDraft]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getLongCampaignEconomySnapshot(campaignId);
    setLoading(false);
    if (!res.success) {
      toast.error(res.message);
      return;
    }
    setMissions(res.data.missions);
    const filteredCharacters = playerIds?.length
      ? res.data.characters.filter((character) => {
          const belongsToSession = character.assigned_to ? playerIds.includes(character.assigned_to) : false;
          if (!belongsToSession) return false;
          return true;
        })
      : res.data.characters;
    setCharacters(filteredCharacters);
    const init: Record<string, { gp: string; sp: string; cp: string }> = {};
    for (const c of filteredCharacters) {
      init[c.id] = { gp: "", sp: "", cp: "" };
    }
    setPayoutAlloc(
      economyDraftRef.current?.payoutAlloc
        ? {
            ...init,
            ...Object.fromEntries(
              Object.entries(economyDraftRef.current.payoutAlloc).filter(([characterId]) =>
                filteredCharacters.some((character) => character.id === characterId)
              )
            ),
          }
        : init
    );
    setPayoutMissionId(economyDraftRef.current?.payoutMissionId ?? "");
    setLiveDeltaDraft(
      filteredCharacters.reduce(
        (acc, character) => {
          acc[character.id] = { gp: "", sp: "", cp: "" };
          return acc;
        },
        {} as Record<string, { gp: string; sp: string; cp: string }>
      )
    );
  }, [campaignId, playerIds]);

  useEffect(() => {
    void load();
  }, [load]);

  const missionsWithTreasure = useMemo(
    () => missions.filter((m) => m.status === "completed" && (m.treasure_gp > 0 || m.treasure_sp > 0 || m.treasure_cp > 0)),
    [missions]
  );

  const selectedMission = useMemo(
    () => missions.find((m) => m.id === payoutMissionId),
    [missions, payoutMissionId]
  );

  async function submitDistribute() {
    if (!payoutMissionId || !selectedMission) {
      toast.error("Seleziona una missione con tesoretto.");
      return;
    }
    const allocations = characters.map((c) => {
      const a = payoutAlloc[c.id] ?? { gp: "", sp: "", cp: "" };
      return {
        characterId: c.id,
        coins_gp: parseNonNeg(a.gp),
        coins_sp: parseNonNeg(a.sp),
        coins_cp: parseNonNeg(a.cp),
      };
    });
    const sum = allocations.reduce(
      (acc, a) => ({
        gp: acc.gp + a.coins_gp,
        sp: acc.sp + a.coins_sp,
        cp: acc.cp + a.coins_cp,
      }),
      { gp: 0, sp: 0, cp: 0 }
    );
    if (sum.gp === 0 && sum.sp === 0 && sum.cp === 0) {
      toast.error("Indica almeno una moneta da distribuire.");
      return;
    }
    if (sum.gp > selectedMission.treasure_gp || sum.sp > selectedMission.treasure_sp || sum.cp > selectedMission.treasure_cp) {
      toast.error("Importi superiori al tesoretto disponibile.");
      return;
    }
    setIsPending(true);
    try {
      const res = await distributeMissionTreasureAction(campaignId, payoutMissionId, allocations);
      if (!res.success) {
        toast.error(res.message ?? "Errore distribuzione");
        return;
      }
      toast.success("Tesoretto distribuito.");
      await load();
    } finally {
      setIsPending(false);
    }
  }

  const adjustDraft = useCallback((characterId: string, key: "gp" | "sp" | "cp", delta: number) => {
    setLiveDeltaDraft((current) => {
      const row = current[characterId] ?? { gp: "", sp: "", cp: "" };
      const nextValue = String((Number.parseInt(row[key], 10) || 0) + delta);
      return {
        ...current,
        [characterId]: {
          ...row,
          [key]: nextValue,
        },
      };
    });
  }, []);

  const saveRowDraft = useCallback(
    async (characterId: string) => {
      const draft = liveDeltaDraft[characterId] ?? { gp: "", sp: "", cp: "" };
      const { gp, sp, cp } = parseRowDelta(draft);
      if (gp === 0 && sp === 0 && cp === 0) {
        toast.error("Nessuna modifica da salvare per questa riga.");
        return;
      }

      setRowSaveState((current) => ({
        ...current,
        [characterId]: { status: "saving" },
      }));
      const resetTimer = saveStatusTimersRef.current[characterId];
      if (resetTimer) window.clearTimeout(resetTimer);

      const result = await adjustCharacterCoinsBatchAction(campaignId, [
        { characterId, coins_gp: gp, coins_sp: sp, coins_cp: cp },
      ]);
      if (!result.success) {
        const errorMessage = result.message ?? "Errore aggiornamento monete.";
        toast.error(errorMessage);
        setRowSaveState((current) => ({
          ...current,
          [characterId]: { status: "error", message: errorMessage },
        }));
        return;
      }

      const next = result.balances[characterId];
      if (next) {
        setCharacters((current) =>
          current.map((character) =>
            character.id === characterId
              ? { ...character, coins_gp: next.coins_gp, coins_sp: next.coins_sp, coins_cp: next.coins_cp }
              : character
          )
        );
        onCoinsCommitted?.(characterId, next);
      }
      setLiveDeltaDraft((current) => ({
        ...current,
        [characterId]: { gp: "", sp: "", cp: "" },
      }));
      setRowSaveState((current) => ({
        ...current,
        [characterId]: { status: "saved" },
      }));
      saveStatusTimersRef.current[characterId] = window.setTimeout(() => {
        setRowSaveState((current) => ({
          ...current,
          [characterId]: { status: "idle" },
        }));
      }, 1600);
      await onRefreshCharacters?.();
    },
    [campaignId, liveDeltaDraft, onCoinsCommitted, onRefreshCharacters]
  );

  const saveAllDrafts = useCallback(async () => {
    const rows = characters
      .map((character) => {
        const delta = parseRowDelta(liveDeltaDraft[character.id] ?? { gp: "", sp: "", cp: "" });
        return { characterId: character.id, ...delta };
      })
      .filter((row) => row.gp !== 0 || row.sp !== 0 || row.cp !== 0);

    if (rows.length === 0) {
      toast.error("Non ci sono modifiche da salvare.");
      return;
    }

    setIsPending(true);
    setRowSaveState((current) => {
      const next = { ...current };
      for (const row of rows) {
        next[row.characterId] = { status: "saving" };
      }
      return next;
    });

    const result = await adjustCharacterCoinsBatchAction(
      campaignId,
      rows.map((row) => ({
        characterId: row.characterId,
        coins_gp: row.gp,
        coins_sp: row.sp,
        coins_cp: row.cp,
      }))
    );
    if (!result.success) {
      const errorMessage = result.message ?? "Errore salvataggio modifiche.";
      toast.error(errorMessage);
      setRowSaveState((current) => {
        const next = { ...current };
        for (const row of rows) {
          next[row.characterId] = { status: "error", message: errorMessage };
        }
        return next;
      });
      setIsPending(false);
      return;
    }

    setCharacters((current) =>
      current.map((character) => {
        const nextBalance = result.balances[character.id];
        if (!nextBalance) return character;
        onCoinsCommitted?.(character.id, nextBalance);
        return {
          ...character,
          coins_gp: nextBalance.coins_gp,
          coins_sp: nextBalance.coins_sp,
          coins_cp: nextBalance.coins_cp,
        };
      })
    );

    setLiveDeltaDraft((current) => {
      const next = { ...current };
      for (const row of rows) {
        next[row.characterId] = { gp: "", sp: "", cp: "" };
      }
      return next;
    });

    setRowSaveState((current) => {
      const next = { ...current };
      for (const row of rows) {
        next[row.characterId] = { status: "saved" };
        const timer = saveStatusTimersRef.current[row.characterId];
        if (timer) window.clearTimeout(timer);
        saveStatusTimersRef.current[row.characterId] = window.setTimeout(() => {
          setRowSaveState((now) => ({
            ...now,
            [row.characterId]: { status: "idle" },
          }));
        }, 1600);
      }
      return next;
    });

    toast.success(`Salvate ${rows.length} righe.`);
    setIsPending(false);
    await onRefreshCharacters?.();
  }, [campaignId, characters, liveDeltaDraft, onCoinsCommitted, onRefreshCharacters]);

  useEffect(() => {
    const statusTimers = saveStatusTimersRef.current;
    return () => {
      Object.values(statusTimers).forEach((timerId) => window.clearTimeout(timerId));
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6 text-amber-200/80">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Carico economia…
      </div>
    );
  }

  return (
    <div className="space-y-3 text-zinc-200">
      <div>
        <div className="flex items-center gap-2">
          <Coins className="h-5 w-5 text-amber-300" />
          <h3 className="text-sm font-semibold text-amber-300/95">Economia Sessione</h3>
        </div>
        <p className="text-xs text-zinc-500 mt-0.5">
          Bottino missione residuo e saldi PG aggiornabili in tempo reale.
        </p>
      </div>

      <div className="space-y-2.5 rounded-lg border border-amber-700/25 bg-zinc-950/50 p-2.5">
        <Label className="text-amber-200/80 text-xs">Distribuisci da bottino missione</Label>
        <Select
          value={payoutMissionId || "none"}
          onValueChange={(v) => {
            const nextMissionId = v === "none" ? "" : v;
            setPayoutMissionId(nextMissionId);
            onDraftChange?.({
              payoutMissionId: nextMissionId,
              payoutAlloc,
            });
          }}
        >
          <SelectTrigger className="border-amber-600/30 bg-zinc-900 text-zinc-100 h-9 text-sm">
            <SelectValue placeholder="Scegli missione" />
          </SelectTrigger>
          <SelectContent className="border-amber-600/30 bg-zinc-900">
            <SelectItem value="none" className="text-zinc-300">
              — Nessuna —
            </SelectItem>
            {missionsWithTreasure.map((m) => (
              <SelectItem key={m.id} value={m.id} className="text-zinc-300">
                {m.title.slice(0, 42)}
                {m.title.length > 42 ? "…" : ""} — {m.treasure_gp}/{m.treasure_sp}/{m.treasure_cp} (o/a/r)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedMission && (
          <p className="text-[11px] text-zinc-500">
            Disponibile: <span className="tabular-nums text-zinc-300">{selectedMission.treasure_gp}</span> oro,{" "}
            <span className="tabular-nums text-zinc-300">{selectedMission.treasure_sp}</span> arg,{" "}
            <span className="tabular-nums text-zinc-300">{selectedMission.treasure_cp}</span> rame.
          </p>
        )}
        <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
          {characters.map((c) => {
            const a = payoutAlloc[c.id] ?? { gp: "", sp: "", cp: "" };
            return (
              <div key={c.id} className="grid grid-cols-[1fr_repeat(3,minmax(0,4.25rem))] items-end gap-1.5 text-[10px]">
                <div className="min-w-0 pr-1">
                  <span className="text-zinc-300 font-medium truncate block">{c.name}</span>
                  {c.assignee_label && <span className="text-zinc-500 truncate block">{c.assignee_label}</span>}
                </div>
                <Input
                  placeholder="O"
                  value={a.gp}
                  onChange={(e) =>
                    setPayoutAlloc((prev) => {
                      const next = {
                        ...prev,
                        [c.id]: { ...a, gp: e.target.value },
                      };
                      onDraftChange?.({ payoutMissionId, payoutAlloc: next });
                      return next;
                    })
                  }
                  className="h-7 border-amber-600/25 bg-zinc-900 px-1.5 text-xs text-zinc-100"
                />
                <Input
                  placeholder="A"
                  value={a.sp}
                  onChange={(e) =>
                    setPayoutAlloc((prev) => {
                      const next = {
                        ...prev,
                        [c.id]: { ...a, sp: e.target.value },
                      };
                      onDraftChange?.({ payoutMissionId, payoutAlloc: next });
                      return next;
                    })
                  }
                  className="h-7 border-amber-600/25 bg-zinc-900 px-1.5 text-xs text-zinc-100"
                />
                <Input
                  placeholder="R"
                  value={a.cp}
                  onChange={(e) =>
                    setPayoutAlloc((prev) => {
                      const next = {
                        ...prev,
                        [c.id]: { ...a, cp: e.target.value },
                      };
                      onDraftChange?.({ payoutMissionId, payoutAlloc: next });
                      return next;
                    })
                  }
                  className="h-7 border-amber-600/25 bg-zinc-900 px-1.5 text-xs text-zinc-100"
                />
              </div>
            );
          })}
        </div>
        <Button
          type="button"
          size="sm"
          className="w-full bg-amber-700 text-zinc-950 hover:bg-amber-600"
          disabled={isPending || !payoutMissionId}
          onClick={() => void submitDistribute()}
        >
          Applica distribuzione
        </Button>
      </div>

      <div className="space-y-2.5 rounded-lg border border-amber-700/25 bg-zinc-950/50 p-2.5">
        <div>
          <Label className="text-amber-200/80 text-xs">Saldi live dei personaggi</Label>
          <p className="mt-1 text-[11px] text-zinc-500">
            Prepara le variazioni in bozza (anche oltre +/-1) e salva manualmente la riga quando hai finito.
          </p>
        </div>
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 border-amber-600/35 text-amber-100 hover:bg-amber-600/15"
            disabled={isPending}
            onClick={() => void saveAllDrafts()}
          >
            Salva tutte le righe
          </Button>
        </div>
        <div className="max-h-[24rem] space-y-2 overflow-y-auto pr-1">
          {characters.map((character) => {
            const liveDraft = liveDeltaDraft[character.id] ?? { gp: "", sp: "", cp: "" };
            const saveState = rowSaveState[character.id] ?? { status: "idle" };
            return (
              <div key={character.id} className="space-y-2 rounded-lg border border-amber-600/20 bg-zinc-900/60 p-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-zinc-100">{character.name}</p>
                    {character.assignee_label ? (
                      <p className="truncate text-[11px] text-zinc-500">{character.assignee_label}</p>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                    <span className="rounded border border-amber-600/20 bg-zinc-950/40 px-2 py-1 text-center text-amber-100">
                      O {character.coins_gp}
                    </span>
                    <span className="rounded border border-amber-600/20 bg-zinc-950/40 px-2 py-1 text-center text-amber-100">
                      A {character.coins_sp}
                    </span>
                    <span className="rounded border border-amber-600/20 bg-zinc-950/40 px-2 py-1 text-center text-amber-100">
                      R {character.coins_cp}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {([
                    ["gp", "Oro"],
                    ["sp", "Argento"],
                    ["cp", "Rame"],
                  ] as const).map(([key, label]) => (
                    <div key={key} className="space-y-2">
                      <Label className="text-[10px] text-zinc-500">{label}</Label>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="h-7 w-7 border-amber-600/25 text-amber-100 hover:bg-amber-600/15"
                          onClick={() => adjustDraft(character.id, key, -1)}
                          disabled={isPending}
                          title="-1"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="h-7 w-7 border-amber-600/25 text-amber-100 hover:bg-amber-600/15"
                          onClick={() => adjustDraft(character.id, key, 1)}
                          disabled={isPending}
                          title="+1"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="h-7 w-7 border-amber-600/25 text-amber-100 hover:bg-amber-600/15"
                          onClick={() => adjustDraft(character.id, key, key === "gp" ? -10 : -5)}
                          disabled={isPending}
                          title={key === "gp" ? "-10" : "-5"}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="h-7 w-7 border-amber-600/25 text-amber-100 hover:bg-amber-600/15"
                          onClick={() => adjustDraft(character.id, key, key === "gp" ? 10 : 5)}
                          disabled={isPending}
                          title={key === "gp" ? "+10" : "+5"}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                        <Input
                          value={liveDraft[key]}
                          onChange={(event) => {
                            const nextDraft = {
                              ...liveDraft,
                              [key]: event.target.value,
                            };
                            setLiveDeltaDraft((current) => ({
                              ...current,
                              [character.id]: nextDraft,
                            }));
                          }}
                          placeholder="Δ"
                          className="h-7 border-amber-600/25 bg-zinc-950 text-xs text-zinc-100"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="min-h-[14px] text-[10px]">
                  {saveState.status === "saving" ? (
                    <span className="text-amber-300">Salvataggio in corso...</span>
                  ) : null}
                  {saveState.status === "saved" ? (
                    <span className="text-emerald-300">Salvato.</span>
                  ) : null}
                  {saveState.status === "error" ? (
                    <div className="flex flex-wrap items-center gap-2 text-red-300">
                      <span>{saveState.message}</span>
                    </div>
                  ) : null}
                </div>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 bg-amber-700 text-zinc-950 hover:bg-amber-600"
                    disabled={isPending || saveState.status === "saving"}
                    onClick={() => void saveRowDraft(character.id)}
                  >
                    Salva modifiche riga
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-full text-zinc-500 hover:text-zinc-300"
        onClick={() => void load()}
      >
        Ricarica saldi
      </Button>
    </div>
  );
}
