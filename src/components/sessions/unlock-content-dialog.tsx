"use client";

import { useEffect, useState } from "react";
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
import { getUnlockableContent, unlockContent, type UnlockableItem } from "@/app/campaigns/actions";
import { cn } from "@/lib/utils";

type UnlockContentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  userId: string;
  playerName: string;
  onSuccess?: () => void;
};

export function UnlockContentDialog({
  open,
  onOpenChange,
  campaignId,
  userId,
  playerName,
  onSuccess,
}: UnlockContentDialogProps) {
  const [items, setItems] = useState<UnlockableItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [unlockLoading, setUnlockLoading] = useState(false);

  useEffect(() => {
    if (!open || !campaignId) return;
    setLoading(true);
    getUnlockableContent(campaignId).then((res) => {
      setLoading(false);
      if (res.success) setItems(res.items);
      else setItems([]);
      setSelected(new Set());
    });
  }, [open, campaignId]);

  async function handleUnlock() {
    if (selected.size === 0) {
      toast.info("Seleziona almeno un contenuto da sbloccare.");
      return;
    }
    setUnlockLoading(true);
    const contentIds = items
      .filter((i) => selected.has(i.id))
      .map((i) => ({ id: i.id, type: i.type }));
    const result = await unlockContent(userId, campaignId, contentIds);
    setUnlockLoading(false);
    if (result.success) {
      toast.success(`Contenuti sbloccati per ${playerName}.`);
      onOpenChange(false);
      onSuccess?.();
    } else {
      toast.error(result.message);
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-emerald-700/50 bg-slate-950 text-slate-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sblocca contenuti per {playerName}</DialogTitle>
          <DialogDescription>
            Seleziona le Wiki e le Mappe segrete da sbloccare per questo giocatore.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-64 space-y-2 overflow-y-auto py-2">
          {loading ? (
            <p className="text-sm text-slate-400">Caricamento...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-slate-400">Nessun contenuto segreto da sbloccare.</p>
          ) : (
            items.map((item) => (
              <label
                key={item.id}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border border-slate-700/60 px-3 py-2 transition-colors hover:bg-slate-800/60",
                  selected.has(item.id) && "bg-emerald-500/10 border-emerald-600/50"
                )}
              >
                <input
                  type="checkbox"
                  checked={selected.has(item.id)}
                  onChange={() => toggle(item.id)}
                  className="h-4 w-4 rounded border-slate-600 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm font-medium text-slate-200">{item.name}</span>
                <span className="rounded bg-slate-700/80 px-1.5 py-0.5 text-xs text-slate-400">
                  {item.type === "wiki" ? "Wiki" : "Mappa"}
                </span>
              </label>
            ))
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-slate-600 text-slate-300"
          >
            Chiudi
          </Button>
          <Button
            onClick={handleUnlock}
            disabled={loading || unlockLoading || items.length === 0}
            className="bg-emerald-600 hover:bg-emerald-500"
          >
            {unlockLoading ? "Sblocco..." : "Sblocca selezionati"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
