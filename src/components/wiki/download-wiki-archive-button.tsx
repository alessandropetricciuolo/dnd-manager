"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type Props = {
  campaignId: string;
};

export function DownloadWikiArchiveButton({ campaignId }: Props) {
  const [loading, setLoading] = useState(false);

  async function onDownload() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/campaigns/${encodeURIComponent(campaignId)}/wiki-archive-zip`
      );
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(err.error ?? "Errore durante il download dell'archivio wiki.");
        return;
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition");
      const match = cd?.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? "archivio-wiki.zip";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Archivio wiki scaricato (testi, immagini e manifest JSON).");
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
      title="Scarica tutte le voci wiki con testi, immagini e manifest JSON"
    >
      <Download className="mr-2 h-4 w-4" />
      {loading ? "Preparazione ZIP…" : "Scarica archivio wiki"}
    </Button>
  );
}
