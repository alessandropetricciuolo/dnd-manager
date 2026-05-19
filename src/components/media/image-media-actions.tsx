"use client";

import { MapPopoutButton } from "@/components/maps/map-popout-button";
import { DownloadImageButton } from "@/components/media/download-image-button";
import { hasDownloadableImage, resolveImageSrc } from "@/lib/resolve-image-src";
import { cn } from "@/lib/utils";
import type { ButtonProps } from "@/components/ui/button";

const PLACEHOLDER_FALLBACK = "https://placehold.co/400x400/1c1917/fbbf24/png?text=Immagine";

type ImageMediaActionsProps = {
  driveUrl?: string | null;
  telegramFallbackId?: string | null;
  title: string;
  viewUrl?: string;
  showPopout?: boolean;
  compact?: boolean;
  className?: string;
} & Pick<ButtonProps, "variant" | "size">;

export function ImageMediaActions({
  driveUrl,
  telegramFallbackId,
  title,
  viewUrl,
  showPopout = true,
  compact = false,
  className,
  variant,
  size,
}: ImageMediaActionsProps) {
  const canDownload = hasDownloadableImage(driveUrl, telegramFallbackId);
  const popoutSrc =
    resolveImageSrc(driveUrl, telegramFallbackId) ||
    driveUrl?.trim() ||
    PLACEHOLDER_FALLBACK;

  if (!showPopout && !canDownload) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {showPopout && (
        <MapPopoutButton
          imageUrl={popoutSrc}
          title={title}
          viewUrl={viewUrl}
          compact={compact}
          variant={variant}
          size={size}
        />
      )}
      {canDownload && (
        <DownloadImageButton
          driveUrl={driveUrl}
          telegramFallbackId={telegramFallbackId}
          filename={title}
          compact={compact}
          variant={variant}
          size={size}
        />
      )}
    </div>
  );
}
