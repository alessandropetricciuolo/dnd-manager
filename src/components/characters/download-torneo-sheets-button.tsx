"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { CampaignCharacterRow } from "@/app/campaigns/character-actions";

type Props = {
  campaignId: string;
  characters: CampaignCharacterRow[];
};

export function DownloadTorneoSheetsButton({ campaignId, characters }: Props) {
  const [loading, setLoading] = useState(false);
  const withSheetCount = characters.filter((c) => c.sheet_url?.trim()).length;

  if (withSheetCount === 0) return null;

  async function onDownload() {
    setLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${encodeURIComponent(campaignId)}/character-sheets-zip`);
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(err.error ?? "Errore durante il download delle schede.");
        return;
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition");
      const match = cd?.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? "schede-torneo.zip";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Scaricato pacchetto con ${withSheetCount} sched${withSheetCount === 1 ? "a" : "e"} PDF.`);
    } catch {
      toast.error("Errore di rete durante il download.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="border-barber-gold/40 text-barber-gold hover:bg-barber-gold/10"
      disabled={loading}
      onClick={() => void onDownload()}
      title="Scarica tutte le schede PDF in un file ZIP"
    >
      <Download className="mr-2 h-4 w-4" />
      {loading ? "Preparazione ZIP…" : `Scarica tutte le schede (${withSheetCount})`}
    </Button>
  );
}
