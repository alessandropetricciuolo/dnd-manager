/**
 * Normalizza il nome file per download PDF (evita path traversal e caratteri pericolosi).
 */
export function sanitizePdfAttachmentFileName(raw: string | undefined | null): string {
  const base = (raw?.trim() || "scheda-compilata.pdf").slice(0, 200);
  return base.replace(/[^\w.\- ]+/g, "_");
}
