import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeImageUrl } from "@/lib/image-url";
import type { Database } from "@/types/database.types";
import type { ImageExportRecord } from "./types";
import { isSafeRemoteImageUrl } from "./security";

const TELEGRAM_API = "https://api.telegram.org/bot";
const TELEGRAM_FILE_BASE = "https://api.telegram.org/file/bot";

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

function extFromMime(mime: string): string {
  if (mime.includes("png")) return "png";
  if (mime.includes("gif")) return "gif";
  if (mime.includes("webp")) return "webp";
  return "jpg";
}

function extFromPath(path: string): string {
  const m = path.match(/\.([a-z0-9]+)(?:\?|$)/i);
  const ext = m?.[1]?.toLowerCase();
  if (ext && MIME_BY_EXT[ext]) return ext;
  return "jpg";
}

async function fetchTelegramByFileId(fileId: string): Promise<{ buffer: Buffer; ext: string } | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) return null;

  const getFileRes = await fetch(
    `${TELEGRAM_API}${token}/getFile?file_id=${encodeURIComponent(fileId)}`
  );
  const getFileData = (await getFileRes.json()) as {
    ok: boolean;
    result?: { file_path: string };
  };
  if (!getFileData.ok || !getFileData.result?.file_path) return null;

  const filePath = getFileData.result.file_path;
  const downloadUrl = `${TELEGRAM_FILE_BASE}${token}/${filePath}`;
  const fileRes = await fetch(downloadUrl);
  if (!fileRes.ok) return null;

  const arrayBuffer = await fileRes.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (buffer.length < 64) return null;

  const ext = extFromPath(filePath);
  return { buffer, ext };
}

async function fetchHttpUrl(url: string): Promise<{ buffer: Buffer; ext: string } | null> {
  const normalized = url.includes("drive.google.com") ? normalizeImageUrl(url) : url;
  if (!isSafeRemoteImageUrl(normalized)) return null;

  const res = await fetch(normalized, { redirect: "follow" });
  if (!res.ok) return null;

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("image/")) return null;

  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (buffer.length < 64) return null;

  const ext = extFromMime(contentType.split(";")[0]?.trim() ?? "");

  return { buffer, ext };
}

function parseTgFileIdFromUrl(url: string): string | null {
  const m = url.match(/\/api\/tg-image\/([^/?#]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export async function fetchImageForExport(
  record: ImageExportRecord,
  siteOrigin: string
): Promise<{ buffer: Buffer; ext: string } | null> {
  const candidates: string[] = [];
  if (record.imageUrl?.trim()) {
    const u = record.imageUrl.trim();
    if (u.startsWith("http")) candidates.push(u);
    else if (u.startsWith("/")) candidates.push(`${siteOrigin}${u}`);
  }
  if (record.telegramFallbackId?.trim()) {
    candidates.push(`/api/tg-image/${encodeURIComponent(record.telegramFallbackId.trim())}`);
  }

  for (const candidate of candidates) {
    const tgId = parseTgFileIdFromUrl(candidate);
    if (tgId) {
      const fromTg = await fetchTelegramByFileId(tgId);
      if (fromTg) return fromTg;
      continue;
    }
    if (candidate.startsWith("http")) {
      const fromHttp = await fetchHttpUrl(candidate);
      if (fromHttp) return fromHttp;
    } else if (candidate.startsWith(`${siteOrigin}/api/tg-image/`)) {
      const id = parseTgFileIdFromUrl(candidate);
      if (id) {
        const fromTg = await fetchTelegramByFileId(id);
        if (fromTg) return fromTg;
      }
    }
  }

  if (record.telegramFallbackId?.trim()) {
    return fetchTelegramByFileId(record.telegramFallbackId.trim());
  }

  return null;
}

export async function downloadStorageObject(
  admin: SupabaseClient<Database>,
  bucket: string,
  filePath: string
): Promise<{ buffer: Buffer; ext: string } | null> {
  const { data, error } = await admin.storage.from(bucket).download(filePath);
  if (error || !data) return null;
  const arrayBuffer = await data.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (buffer.length < 64) return null;
  return { buffer, ext: extFromPath(filePath) };
}

export async function downloadGmAttachment(
  admin: SupabaseClient<Database>,
  filePath: string
): Promise<{ buffer: Buffer; ext: string } | null> {
  return downloadStorageObject(admin, "gm_files", filePath);
}
