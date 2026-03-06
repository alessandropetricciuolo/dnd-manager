/**
 * Estrae il FILE_ID da un URL Google Drive (condivisione).
 * Supporta: /file/d/FILE_ID/view, /open?id=FILE_ID, ecc.
 */
function extractGoogleDriveFileId(url: string): string | null {
  const matchPath = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (matchPath) return matchPath[1];
  const matchQuery = url.match(/[?&]id=([a-zA-Z0-9_-]+)/i);
  if (matchQuery) return matchQuery[1];
  return null;
}

/**
 * Converte un URL Google Drive (condivisione) in un link utilizzabile per <img>.
 * Con "chiunque con il link" /uc?export=view può dare 403; l'endpoint thumbnail
 * funziona in più casi. sz=w1920 chiede larghezza max 1920px (Full HD).
 */
export function normalizeImageUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;

  try {
    const lower = trimmed.toLowerCase();
    if (lower.includes("drive.google.com")) {
      const fileId = extractGoogleDriveFileId(trimmed);
      if (fileId) {
        return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1920`;
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
