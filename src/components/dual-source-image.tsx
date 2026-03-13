"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type DualSourceImageProps = Omit<
  React.ImgHTMLAttributes<HTMLImageElement>,
  "src"
> & {
  driveUrl?: string | null;
  telegramFallbackId?: string | null;
  className?: string;
};

function extractDriveFileId(url: string): string | null {
  const pathMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (pathMatch) return pathMatch[1];
  const queryMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/i);
  if (queryMatch) return queryMatch[1];
  return null;
}

export function DualSourceImage({
  driveUrl,
  telegramFallbackId,
  alt,
  className,
  ...imgProps
}: DualSourceImageProps) {
  const [currentSrc, setCurrentSrc] = useState<string>("");
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);

    if (driveUrl && driveUrl.includes("drive.google.com")) {
      const id = extractDriveFileId(driveUrl);
      if (id) {
        setCurrentSrc(
          `https://drive.google.com/thumbnail?id=${id}&sz=w2000`
        );
        return;
      }
    }

    if (driveUrl) {
      setCurrentSrc(driveUrl);
    } else if (telegramFallbackId) {
      setCurrentSrc(`/api/tg-image/${encodeURIComponent(telegramFallbackId)}`);
    } else {
      setCurrentSrc("");
    }
  }, [driveUrl, telegramFallbackId]);

  if (!currentSrc) {
    return null;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={currentSrc}
      alt={alt}
      className={cn(className)}
      onError={() => {
        if (!hasError && telegramFallbackId) {
          setHasError(true);
          setCurrentSrc(
            `/api/tg-image/${encodeURIComponent(telegramFallbackId)}`
          );
        }
      }}
      {...imgProps}
    />
  );
}

