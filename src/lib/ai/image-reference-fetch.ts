import { isSafeTelegramProxyPath, parseSafeExternalUrl } from "@/lib/security/url";

const TELEGRAM_API = "https://api.telegram.org/bot";
const TELEGRAM_FILE_BASE = "https://api.telegram.org/file/bot";

function extractTelegramFileId(publicUrl: string): string | null {
  const trimmed = publicUrl.trim();
  const match = trimmed.match(/\/api\/tg-image\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function resolveAbsolutePublicUrl(publicUrl: string): string {
  const trimmed = publicUrl.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://127.0.0.1:3000");
  return `${base.replace(/\/$/, "")}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
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

function resolveSafeFetchUrl(publicUrl: string): string {
  const trimmed = publicUrl.trim();
  if (!trimmed) {
    throw new Error("URL immagine non valido.");
  }

  if (extractTelegramFileId(trimmed) || isSafeTelegramProxyPath(trimmed)) {
    return resolveAbsolutePublicUrl(trimmed);
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    const safe = parseSafeExternalUrl(trimmed, { allowedProtocols: ["https:", "http:"] });
    if (!safe) {
      throw new Error("URL immagine non consentito.");
    }
    return safe;
  }

  if (!trimmed.startsWith("/")) {
    throw new Error("URL immagine non valido.");
  }

  return resolveAbsolutePublicUrl(trimmed);
}

/** Scarica un'immagine pubblicata via `/api/tg-image/…` o URL assoluto e la converte in data URL. */
export async function fetchPublicImageAsDataUrl(publicUrl: string): Promise<string> {
  const fileId = extractTelegramFileId(publicUrl);
  if (fileId) {
    const { buffer, mimeType } = await fetchTelegramFileAsBuffer(fileId);
    return `data:${mimeType};base64,${buffer.toString("base64")}`;
  }

  const absolute = resolveSafeFetchUrl(publicUrl);
  const res = await fetch(absolute);
  if (!res.ok) {
    throw new Error(`Download immagine di riferimento fallito (HTTP ${res.status}).`);
  }
  const mimeType = res.headers.get("content-type")?.split(";")[0]?.trim() || "image/png";
  const buffer = Buffer.from(await res.arrayBuffer());
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}
