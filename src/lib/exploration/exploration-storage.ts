const BUCKET = "exploration_maps";

/**
 * `image_path` può essere:
 * - `/api/tg-image/<file_id>` (come le altre immagini dell'app)
 * - percorso legacy nello storage Supabase `exploration_maps`, es. `<campaignId>/<uuid>.png`
 */
export function getExplorationMapPublicUrl(imagePath: string): string {
  const p = imagePath.trim();
  if (p.startsWith("/api/tg-image/") || p.startsWith("/api/tg-file/")) {
    return p;
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const safe = p
    .split("/")
    .filter(Boolean)
    .map((s) => encodeURIComponent(s))
    .join("/");
  return `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${safe}`;
}
