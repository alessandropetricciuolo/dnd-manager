"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "nextjs-toploader/app";
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

function parseNonNeg(s: string): number {
  const n = Math.trunc(Number.parseInt(s, 10) || 0);
  return Math.max(0, n);
}

export function LongEconomyPanel({
  campaignId,
  playerIds,
  attendance,
  economyDraft,
  onDraftChange,
  onCoinsCommitted,
  onRefreshCharacters,
}: LongEconomyPanelProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [missions, setMissions] = useState<EconomyMissionSnapshot[]>([]);
  const [characters, setCharacters] = useState<EconomyCharacterSnapshot[]>([]);
  const [isPending, startTransition] = useTransition();

  const [payoutMissionId, setPayoutMissionId] = useState<string>("");
  const [payoutAlloc, setPayoutAlloc] = useState<Record<string, { gp: string; sp: string; cp: string }>>({});
  const [liveDeltaDraft, setLiveDeltaDraft] = useState<Record<string, { gp: string; sp: string; cp: string }>>({});
  const saveTimersRef = useRef<Record<string, number>>({});

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
          if (!attendance || !character.assigned_to) return true;
          return true;
        })
      : res.data.characters;
    setCharacters(filteredCharacters);
    const init: Record<string, { gp: string; sp: string; cp: string }> = {};
    for (const c of filteredCharacters) {
      init[c.id] = { gp: "", sp: "", cp: "" };
    }
    setPayoutAlloc(
      economyDraft?.payoutAlloc
        ? {
            ...init,
            ...Object.fromEntries(
              Object.entries(economyDraft.payoutAlloc).filter(([characterId]) =>
                filteredCharacters.some((character) => character.id === characterId)
              )
            ),
          }
        : init
    );
    setPayoutMissionId(economyDraft?.payoutMissionId ?? "");
    setLiveDeltaDraft(
      filteredCharacters.reduce(
        (acc, character) => {
          acc[character.id] = { gp: "", sp: "", cp: "" };
          return acc;
        },
        {} as Record<string, { gp: string; sp: string; cp: string }>
      )
    );
  }, [attendance, campaignId, economyDraft?.payoutAlloc, economyDraft?.payoutMissionId, playerIds]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!economyDraft || !onDraftChange) return;
    onDraftChange({
      payoutMissionId,
      payoutAlloc,
    });
  }, [economyDraft, onDraftChange, payoutAlloc, payoutMissionId]);

  const missionsWithTreasure = useMemo(
    () => missions.filter((m) => m.status === "completed" && (m.treasure_gp > 0 || m.treasure_sp > 0 || m.treasure_cp > 0)),
    [missions]
  );

  const selectedMission = useMemo(
    () => missions.find((m) => m.id === payoutMissionId),
    [missions, payoutMissionId]
  );

  function submitDistribute() {
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
    startTransition(async () => {
      const res = await distributeMissionTreasureAction(campaignId, payoutMissionId, allocations);
      if (!res.success) {
        toast.error(res.message ?? "Errore distribuzione");
        return;
      }
      toast.success("Tesoretto distribuito.");
      router.refresh();
      await load();
    });
  }

  const commitImmediateDelta = useCallback(
    (characterId: string, gp: number, sp: number, cp: number) => {
      startTransition(async () => {
        const result = await adjustCharacterCoinsBatchAction(campaignId, [
          { characterId, coins_gp: gp, coins_sp: sp, coins_cp: cp },
        ]);
        if (!result.success) {
          toast.error(result.message ?? "Errore aggiornamento monete.");
          return;
        }
        const next = result.balances[characterId];
        if (next) {
          setCharacters((current) =>
            current.map((character) =>
              character.id === characterId
                ? {
                    ...character,
                    coins_gp: next.coins_gp,
                    coins_sp: next.coins_sp,
                    coins_cp: next.coins_cp,
                  }
                : character
            )
          );
          onCoinsCommitted?.(characterId, next);
        }
        router.refresh();
        await onRefreshCharacters?.();
      });
    },
    [campaignId, onCoinsCommitted, onRefreshCharacters, router]
  );

  const scheduleDraftCommit = useCallback(
    (characterId: string, nextDraft: { gp: string; sp: string; cp: string }) => {
      const existing = saveTimersRef.current[characterId];
      if (existing) {
        window.clearTimeout(existing);
      }
      saveTimersRef.current[characterId] = window.setTimeout(() => {
        const gp = Math.trunc(Number.parseInt(nextDraft.gp, 10) || 0);
        const sp = Math.trunc(Number.parseInt(nextDraft.sp, 10) || 0);
        const cp = Math.trunc(Number.parseInt(nextDraft.cp, 10) || 0);
        if (gp === 0 && sp === 0 && cp === 0) return;
        void commitImmediateDelta(characterId, gp, sp, cp);
        setLiveDeltaDraft((current) => ({
          ...current,
          [characterId]: { gp: "", sp: "", cp: "" },
        }));
      }, 700);
    },
    [commitImmediateDelta]
  );

  useEffect(() => {
    return () => {
      Object.values(saveTimersRef.current).forEach((timerId) => window.clearTimeout(timerId));
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
    <div className="space-y-4 text-zinc-200">
      <div>
        <div className="flex items-center gap-2">
          <Coins className="h-5 w-5 text-amber-300" />
          <h3 className="text-sm font-semibold text-amber-300/95">Economia Sessione</h3>
        </div>
        <p className="text-xs text-zinc-500 mt-0.5">
          Bottino missione residuo e saldi PG aggiornabili in tempo reale.
        </p>
      </div>

      <div className="rounded-lg border border-amber-700/25 bg-zinc-950/50 p-3 space-y-3">
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
        <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
          {characters.map((c) => {
            const a = payoutAlloc[c.id] ?? { gp: "", sp: "", cp: "" };
            return (
              <div key={c.id} className="grid grid-cols-[1fr_repeat(3,minmax(0,4.5rem))] gap-1.5 items-end text-[10px]">
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
                  className="h-8 px-1.5 border-amber-600/25 bg-zinc-900 text-zinc-100 text-xs"
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
                  className="h-8 px-1.5 border-amber-600/25 bg-zinc-900 text-zinc-100 text-xs"
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
                  className="h-8 px-1.5 border-amber-600/25 bg-zinc-900 text-zinc-100 text-xs"
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
          onClick={submitDistribute}
        >
          Applica distribuzione
        </Button>
      </div>

      <div className="rounded-lg border border-amber-700/25 bg-zinc-950/50 p-3 space-y-3">
        <div>
          <Label className="text-amber-200/80 text-xs">Saldi live dei personaggi</Label>
          <p className="mt-1 text-[11px] text-zinc-500">
            Puoi usare i bottoni rapidi oppure digitare una variazione nei campi `Δ`: il pannello salva quasi in tempo reale.
          </p>
        </div>
        <div className="max-h-[22rem] overflow-y-auto space-y-3 pr-1">
          {characters.map((character) => {
            const liveDraft = liveDeltaDraft[character.id] ?? { gp: "", sp: "", cp: "" };
            return (
              <div key={character.id} className="rounded-lg border border-amber-600/20 bg-zinc-900/60 p-3 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-100">{character.name}</p>
                    {character.assignee_label ? (
                      <p className="truncate text-[11px] text-zinc-500">{character.assignee_label}</p>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[11px]">
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
                    ["gp", "Oro", "coins_gp"],
                    ["sp", "Argento", "coins_sp"],
                    ["cp", "Rame", "coins_cp"],
                  ] as const).map(([key, label, balanceKey]) => (
                    <div key={key} className="space-y-2">
                      <Label className="text-[10px] text-zinc-500">{label}</Label>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="h-8 w-8 border-amber-600/25 text-amber-100 hover:bg-amber-600/15"
                          onClick={() =>
                            void commitImmediateDelta(
                              character.id,
                              key === "gp" ? -1 : 0,
                              key === "sp" ? -1 : 0,
                              key === "cp" ? -1 : 0
                            )
                          }
                          disabled={isPending || (character[balanceKey] ?? 0) <= 0}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="h-8 w-8 border-amber-600/25 text-amber-100 hover:bg-amber-600/15"
                          onClick={() =>
                            void commitImmediateDelta(
                              character.id,
                              key === "gp" ? 1 : 0,
                              key === "sp" ? 1 : 0,
                              key === "cp" ? 1 : 0
                            )
                          }
                          disabled={isPending}
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
                            scheduleDraftCommit(character.id, nextDraft);
                          }}
                          placeholder="Δ"
                          className="h-8 border-amber-600/25 bg-zinc-950 text-zinc-100 text-xs"
                        />
                      </div>
                    </div>
                  ))}
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
