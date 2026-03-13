"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2, CloudUpload } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BackupDriveImagesButton() {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/backup-to-telegram", {
          method: "POST",
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const msg = body?.error ?? `Errore HTTP ${res.status}`;
          toast.error(msg);
          return;
        }
        const data = (await res.json()) as {
          backedUp?: number;
          failed?: number;
        };
        const ok = data.backedUp ?? 0;
        const ko = data.failed ?? 0;
        toast.success(
          `Backup completato: ${ok} immagini salvate su Telegram, ${ko} fallite.`
        );
      } catch (err) {
        console.error("[BackupDriveImagesButton]", err);
        toast.error("Errore durante il backup. Controlla i log server.");
      }
    });
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-barber-gold/30 bg-barber-dark/80 p-4">
      <div className="space-y-1">
        <p className="flex items-center gap-2 text-sm font-medium text-barber-paper/90">
          <CloudUpload className="h-4 w-4 text-barber-gold" />
          Backup immagini Drive su Telegram
        </p>
        <p className="text-xs text-barber-paper/60">
          Esegue il backup delle immagini ad alta risoluzione su Google Drive
          verso Telegram come fallback. Vengono considerate solo le immagini
          ancora senza backup.
        </p>
      </div>
      <Button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="flex items-center gap-2 bg-barber-red text-barber-paper hover:bg-barber-red/90"
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        {!isPending && <CloudUpload className="h-4 w-4" />}
        <span>Esegui backup ora</span>
      </Button>
    </div>
  );
}

