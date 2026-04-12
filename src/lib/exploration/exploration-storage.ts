const BUCKET = "exploration_maps";

export function getExplorationMapPublicUrl(imagePath: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const safe = imagePath
    .split("/")
    .filter(Boolean)
    .map((s) => encodeURIComponent(s))
    .join("/");
  return `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${safe}`;
}
