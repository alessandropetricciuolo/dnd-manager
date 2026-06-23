import { isSafeTelegramProxyPath } from "@/lib/security/url";

const TELEGRAM_API = "https://api.telegram.org/bot";
const TELEGRAM_FILE_BASE = "https://api.telegram.org/file/bot";

function extractTelegramFileId(publicUrl: string): string | null {
  const trimmed = publicUrl.trim();
  const match = trimmed.match(/\/api\/tg-image\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function fetchTelegramFileAsBuffer(fileId: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN non configurato.");
  }

  const getFileUrl = `${TELEGRAM_API}${token}/getFile?file_id=${encodeURIComponent(fileId)}`;
  const getFileRes = await fetch(getFileUrl);
  const getFileData = (await getFileRes.json()) as {
    ok: boolean;
    result?: { file_path: string };
    description?: string;
  };

  if (!getFileData.ok || !getFileData.result?.file_path) {
    throw new Error(getFileData.description ?? "Impossibile risolvere il file Telegram.");
  }

  const filePath = getFileData.result.file_path;
  const downloadUrl = `${TELEGRAM_FILE_BASE}${token}/${filePath}`;
  const fileRes = await fetch(downloadUrl);
  if (!fileRes.ok) {
    throw new Error(`Download immagine Telegram fallito (HTTP ${fileRes.status}).`);
  }

  const mimeType = fileRes.headers.get("content-type")?.split(";")[0]?.trim() || "image/png";
  return { buffer: Buffer.from(await fileRes.arrayBuffer()), mimeType };
}

/**
 * Scarica un'immagine pubblicata via `/api/tg-image/…` e la converte in data URL.
 * Rifiuta URL arbitrari per evitare SSRF server-side.
 */
export async function fetchPublicImageAsDataUrl(publicUrl: string): Promise<string> {
  const trimmed = publicUrl.trim();
  if (!trimmed) {
    throw new Error("URL immagine di riferimento mancante.");
  }

  const fileId = extractTelegramFileId(trimmed);
  if (!fileId) {
    throw new Error(
      "Solo immagini del sito via /api/tg-image/… possono essere usate come riferimento."
    );
  }

  if (trimmed.startsWith("/") && !isSafeTelegramProxyPath(trimmed)) {
    throw new Error("Percorso immagine di riferimento non valido.");
  }

  const { buffer, mimeType } = await fetchTelegramFileAsBuffer(fileId);
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}
