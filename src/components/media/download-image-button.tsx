"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";
import { hasDownloadableImage } from "@/lib/resolve-image-src";
import { cn } from "@/lib/utils";

type DownloadImageButtonProps = {
  driveUrl?: string | null;
  telegramFallbackId?: string | null;
  /** Nome file senza estensione */
  filename: string;
  /** Scarica da storage Supabase (es. mappe esplorazione legacy) */
  storageBucket?: string | null;
  storagePath?: string | null;
  compact?: boolean;
  className?: string;
  title?: string;
  stopPropagation?: boolean;
} & Pick<ButtonProps, "variant" | "size">;

function parseFilename(contentDisposition: string | null): string | null {
  if (!contentDisposition) return null;
  const match = /filename="([^"]+)"/i.exec(contentDisposition);
  return match?.[1] ?? null;
}

export function DownloadImageButton({
  driveUrl,
  telegramFallbackId,
  filename,
  storageBucket,
  storagePath,
  compact = false,
  className,
  title = "Scarica immagine",
  stopPropagation = false,
  variant = "outline",
  size = "sm",
}: DownloadImageButtonProps) {
  const [loading, setLoading] = useState(false);

  const canDownload =
    Boolean(storageBucket && storagePath) ||
    hasDownloadableImage(driveUrl, telegramFallbackId);

  if (!canDownload) return null;

  async function handleDownload(e: React.MouseEvent) {
    if (stopPropagation) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (loading) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (driveUrl?.trim()) params.set("driveUrl", driveUrl.trim());
      if (telegramFallbackId?.trim()) {
        params.set("telegramFallbackId", telegramFallbackId.trim());
      }
      if (storageBucket?.trim() && storagePath?.trim()) {
        params.set("storageBucket", storageBucket.trim());
        params.set("storagePath", storagePath.trim());
      }
      params.set("filename", filename.trim() || "immagine");

      const res = await fetch(`/api/media-download?${params.toString()}`);
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(j.error ?? "Download non riuscito.");
        return;
      }
      const blob = await res.blob();
      const downloadName =
        parseFilename(res.headers.get("Content-Disposition")) ?? `${filename}.jpg`;
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      toast.error("Errore di rete durante il download.");
    } finally {
      setLoading(false);
    }
  }

  if (compact) {
    return (
      <Button
        type="button"
        variant={variant}
        size={size}
        className={cn(
          "inline-flex shrink-0 border-barber-gold/40 text-barber-gold hover:bg-barber-gold/15 hover:text-barber-gold",
          className
        )}
        disabled={loading}
        onClick={(e) => void handleDownload(e)}
        title={title}
        aria-label={title}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        <span className="sr-only">{title}</span>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn(
        "shrink-0 gap-2 border-barber-gold/40 text-barber-paper hover:bg-barber-gold/10 hover:text-barber-gold",
        className
      )}
      disabled={loading}
      onClick={(e) => void handleDownload(e)}
      title={title}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      Scarica
    </Button>
  );
}
