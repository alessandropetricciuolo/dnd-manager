/**
 * Download binario da link di condivisione Google Drive (/file/d/ID/view ecc.).
 * Usa uc?export=download e gestione pagina intermediaria antivirus per file più grandi.
 */

import { extractGoogleDriveFileId } from "@/lib/image-url";

const MAX_HTML_SCAN_BYTES = 500_000;

function looksLikeHtml(buf: Buffer): boolean {
  const head = buf
    .subarray(0, Math.min(buf.length, 6144))
    .toString("utf-8")
    .trimStart()
    .toLowerCase();
  return (
    head.startsWith("<!doctype") ||
    head.startsWith("<html") ||
    head.startsWith("<head") ||
    head.startsWith("<body")
  );
}

function extractConfirmToken(html: string): string | null {
  const input = /<input[^>]+type=["']hidden["'][^>]*name=["']confirm["'][^>]*value=["']([^"']+)["']/i.exec(
    html
  );
  if (input?.[1]) return input[1].trim();
  const input2 = /<input[^>]+name=["']confirm["'][^>]*value=["']([^"']+)["']/i.exec(html);
  if (input2?.[1]) return input2[1].trim();

  const inUrl = html.match(/[?&]confirm=([\w\d-]+)&/);
  if (inUrl?.[1] && !["t", "true"].includes(inUrl[1].toLowerCase())) {
    return inUrl[1].trim();
  }

  return null;
}

async function fetchBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url, {
    redirect: "follow",
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; BarberDragonsCatalog/1.0)",
      Accept: "*/*",
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

/**
 * @param raw - Link di condivisione Drive o solo il file id alfanumerico.
 */
export async function downloadGoogleDriveFileBuffer(raw: string): Promise<Buffer> {
  const trimmed = raw.trim();
  const id =
    extractGoogleDriveFileId(trimmed) ??
    (/^[a-zA-Z0-9_-]{10,}$/.test(trimmed) ? trimmed : null);
  if (!id) {
    throw new Error("Link Google Drive non riconosciuto (servono URL /file/d/... o id file).");
  }

  const base = `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`;
  let buf = await fetchBuffer(base);

  if (!looksLikeHtml(buf)) {
    return buf;
  }

  const htmlSnippet = buf.subarray(0, Math.min(buf.length, MAX_HTML_SCAN_BYTES)).toString("utf-8");
  const token = extractConfirmToken(htmlSnippet);
  if (token) {
    buf = await fetchBuffer(`${base}&confirm=${encodeURIComponent(token)}`);
    if (!looksLikeHtml(buf)) {
      return buf;
    }
  }

  buf = await fetchBuffer(
    `https://drive.usercontent.google.com/download?id=${encodeURIComponent(id)}&export=download`
  );
  if (!looksLikeHtml(buf)) {
    return buf;
  }

  throw new Error(
    "Drive ha restituito HTML invece del file: imposta «Chiunque con il link può vedere», verifica dimensioni PDF o usa export scaricabile."
  );
}
