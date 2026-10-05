import { isSafeTelegramProxyPath, parseSafeExternalUrl } from "@/lib/security/url";

export type WikiImage = { id: string; url: string; title: string };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function getWikiImages(attributes: Record<string, unknown> | null | undefined): WikiImage[] {
  if (!Array.isArray(attributes?.images)) return [];
  const seen = new Set<string>();
  return attributes.images.flatMap((entry: unknown) => {
    if (!entry || typeof entry !== "object") return [];
    const row = entry as Record<string, unknown>;
    if (typeof row.id !== "string" || !UUID.test(row.id) || seen.has(row.id) || typeof row.url !== "string") return [];
    const url = isSafeTelegramProxyPath(row.url) ? row.url.trim() : parseSafeExternalUrl(row.url);
    if (!url) return [];
    seen.add(row.id);
    return [{ id: row.id, url, title: typeof row.title === "string" ? row.title.trim().slice(0, 200) : "" }];
  });
}
export function parseWikiImageKey(key: string): { entityId: string; imageId?: string } | null {
  const [entityId, imageId, extra] = key.split(":");
  if (!UUID.test(entityId) || extra !== undefined || (imageId !== undefined && !UUID.test(imageId))) return null;
  return { entityId, imageId };
}

/** Keep multipart requests below the existing 10 MB server-action limit. */
export function validateWikiImageUpload(formData: FormData): string | null {
  const files = [...formData.values()].filter((value): value is File => typeof value !== "string" && value.size > 0);
  const extra = formData.getAll("gallery_images").filter(value => typeof value !== "string" && value.size > 0);
  if (extra.length > 50) return "Massimo 50 immagini aggiuntive per voce.";
  if (files.some(file => file.size > 4 * 1024 * 1024)) return "Ogni immagine deve essere inferiore a 4 MB.";
  if (files.reduce((total, file) => total + file.size, 0) > 8 * 1024 * 1024) return "Carica fino a 8 MB alla volta. Puoi aggiungere altre immagini con un nuovo salvataggio.";
  if (extra.some(file => typeof file !== "string" && !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type))) return "Usa immagini JPG, PNG, WebP o GIF.";
  return null;
}
