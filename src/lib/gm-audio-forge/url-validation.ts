/**
 * Consente solo URL audio serviti in HTTPS o path assoluti same-origin.
 * Evita javascript: e data: accidentalmente incollati.
 */
export function isAllowedAudioUrl(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  try {
    if (trimmed.startsWith("/")) {
      return !trimmed.startsWith("//");
    }
    const u = new URL(trimmed);
    if (u.protocol !== "https:") return false;
    return true;
  } catch {
    return false;
  }
}

export function normalizeAudioUrl(raw: string): string {
  return raw.trim();
}

/** URL assoluto same-origin per `<audio>` (alcuni browser con path `/api/…` relativo falliscono). */
export function toAbsoluteMediaUrl(raw: string): string {
  const t = raw.trim();
  if (typeof window === "undefined") return t;
  if (t.startsWith("/") && !t.startsWith("//")) {
    return new URL(t, window.location.origin).href;
  }
  return t;
}
