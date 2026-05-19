"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type DownloadAllImagesButtonProps = {
  /** Se impostato, esporta solo le immagini della campagna. */
  campaignId?: string | null;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
  label?: string;
};

function parseFilename(contentDisposition: string | null): string {
  if (!contentDisposition) return "barber-and-dragons-immagini.zip";
  const match = /filename="([^"]+)"/i.exec(contentDisposition);
  return match?.[1] ?? "barber-and-dragons-immagini.zip";
}

export function DownloadAllImagesButton({
  campaignId,
  variant = "outline",
  size = "sm",
  className,
  label,
}: DownloadAllImagesButtonProps) {
  const [loading, setLoading] = useState(false);

  const defaultLabel = campaignId ? "Scarica immagini campagna (ZIP)" : "Scarica tutte le immagini (ZIP)";

  async function handleDownload() {
    if (loading) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (campaignId) params.set("campaignId", campaignId);
      const url = `/api/media-export${params.size ? `?${params.toString()}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(j.error ?? "Export non riuscito.");
        return;
      }
      const blob = await res.blob();
      if (blob.size < 100) {
        toast.error("Il pacchetto risulta vuoto o troppo piccolo.");
        return;
      }
      const filename = parseFilename(res.headers.get("Content-Disposition"));
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
      toast.success("Download avviato.");
    } catch {
      toast.error("Errore di rete durante il download.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      disabled={loading}
      onClick={() => void handleDownload()}
    >
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
      {loading ? "Preparo ZIP..." : (label ?? defaultLabel)}
    </Button>
  );
}
