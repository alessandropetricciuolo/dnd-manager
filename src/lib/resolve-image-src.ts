import { normalizeImageUrl } from "@/lib/image-url";

/** URL utilizzabile in `<img src>` o per il download (stessa logica di DualSourceImage). */
export function resolveImageSrc(
  driveUrl?: string | null,
  telegramFallbackId?: string | null
): string {
  const url = driveUrl?.trim() ?? "";
  if (url.includes("drive.google.com")) {
    return normalizeImageUrl(url);
  }
  if (url) return url;
  if (telegramFallbackId?.trim()) {
    return `/api/tg-image/${encodeURIComponent(telegramFallbackId.trim())}`;
  }
  return "";
}

export function hasDownloadableImage(
  driveUrl?: string | null,
  telegramFallbackId?: string | null
): boolean {
  if (telegramFallbackId?.trim()) return true;
  const url = driveUrl?.trim() ?? "";
  if (!url) return false;
  if (url.includes("placehold.co")) return false;
  return true;
}
