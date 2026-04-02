"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
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
import { Loader2 } from "lucide-react";
import {
  getLongCampaignEconomySnapshot,
  adjustCharacterCoinsDeltaAction,
  distributeMissionTreasureAction,
  type EconomyCharacterSnapshot,
  type EconomyMissionSnapshot,
} from "@/lib/actions/campaign-economy-actions";

type LongEconomyPanelProps = {
  campaignId: string;
};

function parseNonNeg(s: string): number {
  const n = Math.trunc(Number.parseInt(s, 10) || 0);
  return Math.max(0, n);
}

export function LongEconomyPanel({ campaignId }: LongEconomyPanelProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [missions, setMissions] = useState<EconomyMissionSnapshot[]>([]);
  const [characters, setCharacters] = useState<EconomyCharacterSnapshot[]>([]);
  const [isPending, startTransition] = useTransition();

  const [payoutMissionId, setPayoutMissionId] = useState<string>("");
  const [payoutAlloc, setPayoutAlloc] = useState<Record<string, { gp: string; sp: string; cp: string }>>({});

  const [deltaCharId, setDeltaCharId] = useState<string>("");
  const [deltaGp, setDeltaGp] = useState("");
  const [deltaSp, setDeltaSp] = useState("");
  const [deltaCp, setDeltaCp] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getLongCampaignEconomySnapshot(campaignId);
    setLoading(false);
    if (!res.success) {
      toast.error(res.message);
      return;
    }
    setMissions(res.data.missions);
    setCharacters(res.data.characters);
    const init: Record<string, { gp: string; sp: string; cp: string }> = {};
    for (const c of res.data.characters) {
      init[c.id] = { gp: "", sp: "", cp: "" };
    }
    setPayoutAlloc(init);
    setPayoutMissionId("");
  }, [campaignId]);

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

  function submitDelta() {
    if (!deltaCharId) {
      toast.error("Seleziona un personaggio.");
      return;
    }
    const dg = Math.trunc(Number.parseInt(deltaGp, 10) || 0);
    const ds = Math.trunc(Number.parseInt(deltaSp, 10) || 0);
    const dc = Math.trunc(Number.parseInt(deltaCp, 10) || 0);
    if (dg === 0 && ds === 0 && dc === 0) {
      toast.error("Usa numeri positivi per aggiungere, negativi per togliere.");
      return;
    }
    startTransition(async () => {
      const res = await adjustCharacterCoinsDeltaAction(campaignId, deltaCharId, dg, ds, dc);
      if (!res.success) {
        toast.error(res.message ?? "Errore");
        return;
      }
      toast.success("Monete aggiornate.");
      setDeltaGp("");
      setDeltaSp("");
      setDeltaCp("");
      router.refresh();
      await load();
    });
  }

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
        <h3 className="text-sm font-semibold text-amber-300/95">Economia (campagna lunga)</h3>
        <p className="text-xs text-zinc-500 mt-0.5">
          Tesoretti da missioni completate e aggiustamenti liberi ai PG (delta: + per aggiungere, − per togliere).
        </p>
      </div>

      <div className="rounded-lg border border-amber-700/25 bg-zinc-950/50 p-3 space-y-3">
        <Label className="text-amber-200/80 text-xs">Distribuisci da tesoretto missione</Label>
        <Select value={payoutMissionId || "none"} onValueChange={(v) => setPayoutMissionId(v === "none" ? "" : v)}>
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
        <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
          {characters.map((c) => {
            const a = payoutAlloc[c.id] ?? { gp: "", sp: "", cp: "" };
            return (
              <div key={c.id} className="grid grid-cols-[1fr_repeat(3,minmax(0,4rem))] gap-1.5 items-end text-[10px]">
                <div className="min-w-0 pr-1">
                  <span className="text-zinc-300 font-medium truncate block">{c.name}</span>
                  {c.assignee_label && <span className="text-zinc-500 truncate block">{c.assignee_label}</span>}
                </div>
                <Input
                  placeholder="O"
                  value={a.gp}
                  onChange={(e) =>
                    setPayoutAlloc((prev) => ({
                      ...prev,
                      [c.id]: { ...a, gp: e.target.value },
                    }))
                  }
                  className="h-8 px-1.5 border-amber-600/25 bg-zinc-900 text-zinc-100 text-xs"
                />
                <Input
                  placeholder="A"
                  value={a.sp}
                  onChange={(e) =>
                    setPayoutAlloc((prev) => ({
                      ...prev,
                      [c.id]: { ...a, sp: e.target.value },
                    }))
                  }
                  className="h-8 px-1.5 border-amber-600/25 bg-zinc-900 text-zinc-100 text-xs"
                />
                <Input
                  placeholder="R"
                  value={a.cp}
                  onChange={(e) =>
                    setPayoutAlloc((prev) => ({
                      ...prev,
                      [c.id]: { ...a, cp: e.target.value },
                    }))
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

      <div className="rounded-lg border border-amber-700/25 bg-zinc-950/50 p-3 space-y-2">
        <Label className="text-amber-200/80 text-xs">Variazione libera (delta)</Label>
        <Select value={deltaCharId || "none"} onValueChange={(v) => setDeltaCharId(v === "none" ? "" : v)}>
          <SelectTrigger className="border-amber-600/30 bg-zinc-900 text-zinc-100 h-9 text-sm">
            <SelectValue placeholder="Personaggio" />
          </SelectTrigger>
          <SelectContent className="border-amber-600/30 bg-zinc-900">
            <SelectItem value="none" className="text-zinc-300">
              —
            </SelectItem>
            {characters.map((c) => (
              <SelectItem key={c.id} value={c.id} className="text-zinc-300">
                {c.name} ({c.coins_gp}/{c.coins_sp}/{c.coins_cp})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-[10px] text-zinc-500">Δ oro</Label>
            <Input
              value={deltaGp}
              onChange={(e) => setDeltaGp(e.target.value)}
              placeholder="±"
              className="h-8 border-amber-600/25 bg-zinc-900 text-zinc-100 text-sm"
            />
          </div>
          <div>
            <Label className="text-[10px] text-zinc-500">Δ arg</Label>
            <Input
              value={deltaSp}
              onChange={(e) => setDeltaSp(e.target.value)}
              placeholder="±"
              className="h-8 border-amber-600/25 bg-zinc-900 text-zinc-100 text-sm"
            />
          </div>
          <div>
            <Label className="text-[10px] text-zinc-500">Δ rame</Label>
            <Input
              value={deltaCp}
              onChange={(e) => setDeltaCp(e.target.value)}
              placeholder="±"
              className="h-8 border-amber-600/25 bg-zinc-900 text-zinc-100 text-sm"
            />
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-full border-amber-600/40 text-amber-200 hover:bg-amber-600/15"
          disabled={isPending || !deltaCharId}
          onClick={submitDelta}
        >
          Applica delta
        </Button>
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
