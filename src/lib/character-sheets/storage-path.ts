export const CHARACTER_SHEETS_BUCKET = "character_sheets";

export function normalizeCharacterSheetStoragePath(rawPath: string | null | undefined): string | null {
  const p = rawPath?.trim();
  if (!p) return null;

  if (p.startsWith(`${CHARACTER_SHEETS_BUCKET}/`)) {
    return p.slice(CHARACTER_SHEETS_BUCKET.length + 1) || null;
  }

  if (p.startsWith("http://") || p.startsWith("https://")) {
    try {
      const u = new URL(p);
      const marker = `/storage/v1/object/`;
      const idx = u.pathname.indexOf(marker);
      if (idx >= 0) {
        const tail = u.pathname.slice(idx + marker.length);
        const segments = tail.split("/").filter(Boolean);
        if (
          segments.length >= 3 &&
          (segments[0] === "public" || segments[0] === "sign") &&
          segments[1] === CHARACTER_SHEETS_BUCKET
        ) {
          return decodeURIComponent(segments.slice(2).join("/")) || null;
        }
      }
    } catch {
      // ignore
    }
    return null;
  }

  return p;
}
