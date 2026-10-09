export const MAX_WIKI_VIDEO_BYTES = 100 * 1024 * 1024;
export const MAX_WIKI_VIDEOS = 20;
export type WikiVideo = { id: string; url: string; title: string; storage_key: string; file_size_bytes: number };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseWikiVideoKey(key: string): { entityId: string; videoId: string } | null {
  const [prefix, entityId, videoId, extra] = key.split(":");
  return prefix === "video" && UUID.test(entityId ?? "") && UUID.test(videoId ?? "") && extra === undefined ? { entityId, videoId } : null;
}

export function getWikiVideos(attributes: Record<string, unknown> | null | undefined): WikiVideo[] {
  if (!Array.isArray(attributes?.videos)) return [];
  const seen = new Set<string>();
  return attributes.videos.flatMap((entry: unknown) => {
    if (!entry || typeof entry !== "object") return [];
    const row = entry as Record<string, unknown>;
    if (typeof row.id !== "string" || !UUID.test(row.id) || seen.has(row.id) || typeof row.url !== "string" || typeof row.storage_key !== "string") return [];
    try { const url = new URL(row.url); if (url.protocol !== "https:" || url.username || url.password) return []; } catch { return []; }
    seen.add(row.id);
    return [{ id: row.id, url: row.url, title: typeof row.title === "string" ? row.title.slice(0, 200) : "Video ambientale", storage_key: row.storage_key, file_size_bytes: typeof row.file_size_bytes === "number" ? row.file_size_bytes : 0 }];
  });
}

export function validateWikiVideoFile(size: number, mime: string): string | null {
  if (mime !== "video/mp4") return "Usa un video MP4 (consigliato H.264).";
  if (!Number.isSafeInteger(size) || size <= 0 || size > MAX_WIKI_VIDEO_BYTES) return "Ogni video deve essere inferiore o uguale a 100 MB.";
  return null;
}
