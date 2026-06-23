const ALLOWED_STORAGE_BUCKETS = new Set(["exploration_maps", "gm_files"]);

export function isAllowedMediaStorageRequest(bucket: string | null, path: string | null): boolean {
  if (!bucket || !path) return false;
  if (!ALLOWED_STORAGE_BUCKETS.has(bucket)) return false;
  if (path.length > 1024 || path.startsWith("/") || path.split("/").includes("..")) return false;
  return true;
}
