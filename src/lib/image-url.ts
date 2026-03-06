/**
 * Converte un URL Google Drive (condivisione) nel formato direct link per embedding/immagini.
 * Es: https://drive.google.com/file/d/FILE_ID/view?usp=sharing → https://drive.google.com/uc?export=view&id=FILE_ID
 */
export function normalizeImageUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;

  try {
    const lower = trimmed.toLowerCase();
    if (lower.includes("drive.google.com")) {
      let fileId: string | null = null;
      const matchPath = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/i);
      if (matchPath) fileId = matchPath[1];
      const matchQuery = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/i);
      if (!fileId && matchQuery) fileId = matchQuery[1];
      if (fileId) {
        return `https://drive.google.com/uc?export=view&id=${fileId}`;
      }
    }
    return trimmed;
  } catch {
    return trimmed;
  }
}

/** Verifica che la stringa assomigli a un URL assoluto valido (http/https). */
export function isValidImageUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  try {
    const u = new URL(trimmed);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
