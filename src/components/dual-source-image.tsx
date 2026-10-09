"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { resolveImageSrc } from "@/lib/resolve-image-src";
import { isImageSourceOptimizable } from "@/lib/is-image-optimizable";
import { cn } from "@/lib/utils";

type DualSourceImageProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  driveUrl?: string | null;
  telegramFallbackId?: string | null;
  className?: string;
  preserveOriginal?: boolean;
};

export function DualSourceImage({
  driveUrl,
  telegramFallbackId,
  alt,
  className,
  preserveOriginal = false,
  ...imgProps
}: DualSourceImageProps) {
  const { width, height, sizes, ...restImgProps } = imgProps;
  const resolvedSource = resolveImageSrc(driveUrl, telegramFallbackId);
  const [currentSrc, setCurrentSrc] = useState<string>(resolvedSource);
  const [forceUnoptimized, setForceUnoptimized] = useState(preserveOriginal);
  const [usingTelegramFallback, setUsingTelegramFallback] = useState(
    !driveUrl?.trim() && Boolean(telegramFallbackId?.trim())
  );

  useEffect(() => {
    setCurrentSrc(resolveImageSrc(driveUrl, telegramFallbackId));
    setForceUnoptimized(preserveOriginal);
    setUsingTelegramFallback(!driveUrl?.trim() && Boolean(telegramFallbackId?.trim()));
  }, [driveUrl, telegramFallbackId, preserveOriginal]);

  if (!currentSrc) {
    return null;
  }

  function handleError() {
    if (!forceUnoptimized && !preserveOriginal && isImageSourceOptimizable(currentSrc)) {
      setForceUnoptimized(true);
      return;
    }

    if (!usingTelegramFallback && telegramFallbackId?.trim()) {
      setUsingTelegramFallback(true);
      setForceUnoptimized(preserveOriginal);
      setCurrentSrc(`/api/tg-image/${encodeURIComponent(telegramFallbackId.trim())}`);
    }
  }

  if (preserveOriginal) {
    // Projection/zoom must keep the source's natural dimensions and aspect ratio.
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...imgProps} src={currentSrc} alt={alt} className={cn(className)} onError={handleError} />;
  }

  return (
    <Image
      src={currentSrc}
      width={typeof width === "number" ? width : 1200}
      height={typeof height === "number" ? height : 800}
      sizes={sizes ?? "50vw"}
      unoptimized={forceUnoptimized || !isImageSourceOptimizable(currentSrc)}
      {...restImgProps}
      alt={alt ?? ""}
      className={cn(className)}
      onError={handleError}
    />
  );
}
