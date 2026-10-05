const TELEGRAM_API = "https://api.telegram.org/bot";
const TELEGRAM_FILE_BASE = "https://api.telegram.org/file/bot";

/** Detect the actual format rather than trusting a proxy's Content-Type header. */
export function imageBufferToDataUrl(buffer: Buffer): string {
  let mimeType: string | undefined;
  if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) mimeType = "image/png";
  else if (buffer.length >= 3 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) mimeType = "image/jpeg";
  else if (["GIF87a", "GIF89a"].includes(buffer.subarray(0, 6).toString("ascii"))) mimeType = "image/gif";
  else if (buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") mimeType = "image/webp";
  if (!mimeType) throw new Error("Il riferimento scaricato non è un'immagine PNG, JPEG, GIF o WebP valida.");
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

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

/** Scarica un'immagine pubblicata via `/api/tg-image/…` o URL assoluto e la converte in data URL. */
export async function fetchPublicImageAsDataUrl(publicUrl: string): Promise<string> {
  const fileId = extractTelegramFileId(publicUrl);
  if (fileId) {
    const { buffer } = await fetchTelegramFileAsBuffer(fileId);
    return imageBufferToDataUrl(buffer);
  }

  const absolute = resolveAbsolutePublicUrl(publicUrl);
  const res = await fetch(absolute);
  if (!res.ok) {
    throw new Error(`Download immagine di riferimento fallito (HTTP ${res.status}).`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  return imageBufferToDataUrl(buffer);
}

/** Send image bytes directly so the provider does not have to fetch the site's URL. */
export async function resolveImageReferenceForOpenRouter(publicUrl: string): Promise<string> {
  return fetchPublicImageAsDataUrl(publicUrl.trim());
}
