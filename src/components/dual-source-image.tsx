"use client";

import { useEffect, useState } from "react";
import { resolveImageSrc } from "@/lib/resolve-image-src";
import { cn } from "@/lib/utils";

type DualSourceImageProps = Omit<
  React.ImgHTMLAttributes<HTMLImageElement>,
  "src"
> & {
  driveUrl?: string | null;
  telegramFallbackId?: string | null;
  className?: string;
};

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
    setCurrentSrc(resolveImageSrc(driveUrl, telegramFallbackId));
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

