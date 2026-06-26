const BUCKET = "exploration_maps";

/**
 * `image_path` può essere:
 * - `/api/tg-image/<file_id>` (come le altre immagini dell'app)
 * - percorso legacy nello storage Supabase `exploration_maps`, es. `<campaignId>/<uuid>.png`
 */
export function getExplorationMapPublicUrl(imagePath: string, cacheVersion?: string | null): string {
  const p = imagePath.trim();
  let url: string;
  if (p.startsWith("/api/tg-image/") || p.startsWith("/api/tg-file/")) {
    url = p;
  } else {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const safe = p
      .split("/")
      .filter(Boolean)
      .map((s) => encodeURIComponent(s))
      .join("/");
    url = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${safe}`;
  }
  if (cacheVersion) {
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}v=${encodeURIComponent(cacheVersion)}`;
  }
  return url;
}
