"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { User, UserX, Search, Map, BookOpen } from "lucide-react";
import {
  closeSession,
  getUnlockableContent,
  batchUnlockContent,
  type UnlockableItem,
} from "@/app/campaigns/actions";

export type ApprovedSignup = {
  id: string;
  player_id: string;
  player_name: string;
};

type CloseSessionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  campaignId: string;
  approvedSignups: ApprovedSignup[];
  onSuccess?: () => void;
};

const GROUP_ORDER = ["Mappe", "NPC", "Luoghi", "Mostri", "Oggetti", "Lore", "Wiki"];

function itemKey(item: UnlockableItem): string {
  return `${item.type}-${item.id}`;
}

export function CloseSessionDialog({
  open,
  onOpenChange,
  sessionId,
  campaignId,
  approvedSignups,
  onSuccess,
}: CloseSessionDialogProps) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [attendance, setAttendance] = useState<Record<string, "attended" | "absent">>({});
  const [secretItems, setSecretItems] = useState<UnlockableItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (open && approvedSignups.length > 0) {
      setAttendance(
        approvedSignups.reduce((acc, s) => ({ ...acc, [s.player_id]: "attended" as const }), {})
      );
    }
    if (open) {
      setStep(1);
      setSearch("");
      setSelectedKeys(new Set());
    }
  }, [open, approvedSignups]);

  useEffect(() => {
    if (!open || step !== 2 || !campaignId) return;
    setItemsLoading(true);
    getUnlockableContent(campaignId).then((res) => {
      setItemsLoading(false);
      if (res.success) setSecretItems(res.items);
      else setSecretItems([]);
    });
  }, [open, step, campaignId]);

  const filteredAndGrouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? secretItems.filter((i) => i.name.toLowerCase().includes(q))
      : secretItems;
    const byGroup = new Map<string, UnlockableItem[]>();
    for (const item of list) {
      const g = item.groupLabel;
      if (!byGroup.has(g)) byGroup.set(g, []);
      byGroup.get(g)!.push(item);
    }
    const ordered: { groupLabel: string; items: UnlockableItem[] }[] = [];
    for (const g of GROUP_ORDER) {
      const items = byGroup.get(g);
      if (items?.length) ordered.push({ groupLabel: g, items });
    }
    byGroup.forEach((items, g) => {
      if (!GROUP_ORDER.includes(g)) ordered.push({ groupLabel: g, items });
    });
    return ordered;
  }, [secretItems, search]);

  const presentUserIds = useMemo(
    () =>
      approvedSignups
        .filter((s) => attendance[s.player_id] === "attended")
        .map((s) => s.player_id),
    [approvedSignups, attendance]
  );

  async function handleConfirmClose() {
    setLoading(true);
    const res = await closeSession(sessionId, attendance);
    if (!res.success) {
      setLoading(false);
      toast.error(res.message);
      return;
    }
    const contentIds = secretItems
      .filter((i) => selectedKeys.has(itemKey(i)))
      .map((i) => ({ id: i.id, type: i.type }));
    if (presentUserIds.length > 0 && contentIds.length > 0) {
      const batchRes = await batchUnlockContent(campaignId, presentUserIds, contentIds);
      if (!batchRes.success) {
        toast.warning(`Sessione chiusa, ma alcuni sblocchi non sono andati a buon fine: ${batchRes.message}`);
      } else {
        toast.success(batchRes.message);
      }
    } else {
      toast.success(res.message);
    }
    setLoading(false);
    onOpenChange(false);
    onSuccess?.();
    router.refresh();
  }

  function setPresence(playerId: string, value: "attended" | "absent") {
    setAttendance((prev) => ({ ...prev, [playerId]: value }));
  }

  function toggleItem(key: string) {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const canGoToStep2 =
    approvedSignups.length > 0 &&
    approvedSignups.every((s) => attendance[s.player_id] === "attended" || attendance[s.player_id] === "absent");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-emerald-700/50 bg-slate-950 text-slate-100 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === 1 ? "Chiudi sessione e fai appello" : "Sblocco contenuti"}
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Segna presenza o assenza per ogni giocatore approvato. Poi potrai scegliere quali contenuti segreti sono stati scoperti."
              : "Seleziona solo i contenuti (mappe e voci wiki) che i presenti hanno scoperto in questa sessione. Gli altri resteranno nascosti."}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <>
            <div className="max-h-64 space-y-2 overflow-y-auto py-2">
              {approvedSignups.length === 0 ? (
                <p className="text-sm text-slate-400">Nessun giocatore approvato per questa sessione.</p>
              ) : (
                approvedSignups.map((signup) => (
                  <div
                    key={signup.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-700/60 px-3 py-2"
                  >
                    <span className="text-sm font-medium text-slate-200">{signup.player_name}</span>
                    <div className="flex items-center gap-3">
                      <label className="flex cursor-pointer items-center gap-1.5 text-sm text-slate-300">
                        <input
                          type="radio"
                          name={`attendance-${signup.player_id}`}
                          checked={attendance[signup.player_id] === "attended"}
                          onChange={() => setPresence(signup.player_id, "attended")}
                          className="border-slate-600 text-emerald-500"
                        />
                        <User className="h-4 w-4 text-emerald-400/80" />
                        Presente
                      </label>
                      <label className="flex cursor-pointer items-center gap-1.5 text-sm text-slate-300">
                        <input
                          type="radio"
                          name={`attendance-${signup.player_id}`}
                          checked={attendance[signup.player_id] === "absent"}
                          onChange={() => setPresence(signup.player_id, "absent")}
                          className="border-slate-600 text-red-500"
                        />
                        <UserX className="h-4 w-4 text-red-400/80" />
                        Assente
                      </label>
                    </div>
                  </div>
                ))
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-slate-600 text-slate-300"
              >
                Annulla
              </Button>
              <Button
                onClick={() => setStep(2)}
                disabled={!canGoToStep2}
                className="bg-emerald-600 hover:bg-emerald-500"
              >
                Avanti – Sblocco contenuti
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 2 && (
          <>
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  type="search"
                  placeholder="Cerca (es. Cripta…)"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="border-slate-600 bg-slate-900/80 pl-9 text-slate-200 placeholder:text-slate-500"
                />
              </div>
              <div className="max-h-72 space-y-4 overflow-y-auto py-2">
                {itemsLoading ? (
                  <p className="text-sm text-slate-400">Caricamento contenuti segreti…</p>
                ) : filteredAndGrouped.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    {secretItems.length === 0
                      ? "Nessun contenuto segreto in questa campagna."
                      : "Nessun risultato per la ricerca."}
                  </p>
                ) : (
                  filteredAndGrouped.map(({ groupLabel, items }) => (
                    <div key={groupLabel} className="space-y-1.5">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        {groupLabel === "Mappe" ? (
                          <Map className="h-3.5 w-3.5" />
                        ) : (
                          <BookOpen className="h-3.5 w-3.5" />
                        )}
                        {groupLabel}
                      </div>
                      <ul className="space-y-1">
                        {items.map((item) => {
                          const key = itemKey(item);
                          return (
                            <li key={key}>
                              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-700/60 px-3 py-2 transition-colors hover:bg-slate-800/60">
                                <input
                                  type="checkbox"
                                  checked={selectedKeys.has(key)}
                                  onChange={() => toggleItem(key)}
                                  className="h-4 w-4 rounded border-slate-600 text-emerald-600 focus:ring-emerald-500"
                                />
                                <span className="text-sm font-medium text-slate-200">{item.name}</span>
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                disabled={loading}
                className="border-slate-600 text-slate-300"
              >
                Indietro
              </Button>
              <Button
                onClick={handleConfirmClose}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-500"
              >
                {loading ? "Chiusura…" : "Conferma chiusura"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
