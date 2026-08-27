import type { SupabaseClient } from "@supabase/supabase-js";
import { lookup } from "dns/promises";
import { isIP } from "net";
import { normalizeImageUrl } from "@/lib/image-url";
import type { Database } from "@/types/database.types";
import type { ImageExportRecord } from "./types";

const TELEGRAM_API = "https://api.telegram.org/bot";
const TELEGRAM_FILE_BASE = "https://api.telegram.org/file/bot";

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

const MAX_REDIRECTS = 3;

function stripIpv6Brackets(hostname: string): string {
  return hostname.replace(/^\[|\]$/g, "").toLowerCase();
}

function isPrivateIpv4(address: string): boolean {
  const parts = address.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true;
  }
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isPrivateIpv6(address: string): boolean {
  const lower = stripIpv6Brackets(address);
  if (lower === "::" || lower === "::1") return true;
  if (lower.startsWith("fe80:") || lower.startsWith("fe90:") || lower.startsWith("fea0:") || lower.startsWith("feb0:")) {
    return true;
  }
  if (/^f[cd][0-9a-f]{2}:/i.test(lower)) return true;
  const mapped = lower.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mapped) return isPrivateIpv4(mapped[1]);
  return false;
}

export function isPrivateNetworkAddress(address: string): boolean {
  const normalized = stripIpv6Brackets(address);
  const version = isIP(normalized);
  if (version === 4) return isPrivateIpv4(normalized);
  if (version === 6) return isPrivateIpv6(normalized);
  return true;
}

function isLocalHostname(hostname: string): boolean {
  const lower = stripIpv6Brackets(hostname);
  return lower === "localhost" || lower.endsWith(".localhost") || lower.endsWith(".local");
}

export async function isSafePublicHttpUrl(rawUrl: string): Promise<boolean> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  if (parsed.username || parsed.password) return false;
  if (isLocalHostname(parsed.hostname)) return false;

  const hostname = stripIpv6Brackets(parsed.hostname);
  if (isIP(hostname)) {
    return !isPrivateNetworkAddress(hostname);
  }

  try {
    const records = await lookup(hostname, { all: true, verbatim: true });
    return records.length > 0 && records.every((record) => !isPrivateNetworkAddress(record.address));
  } catch {
    return false;
  }
}

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
  let normalized = url.includes("drive.google.com") ? normalizeImageUrl(url) : url;
  let res: Response | null = null;

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    if (!(await isSafePublicHttpUrl(normalized))) return null;

    res = await fetch(normalized, { redirect: "manual" });
    if (res.status < 300 || res.status >= 400) break;

    const location = res.headers.get("location");
    if (!location) return null;
    normalized = new URL(location, normalized).toString();
  }

  if (!res || (res.status >= 300 && res.status < 400)) return null;
  if (!res.ok) return null;

  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("text/html") || contentType.includes("application/json")) {
    return null;
  }

  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (buffer.length < 64) return null;

  const ext = contentType.includes("image/")
    ? extFromMime(contentType.split(";")[0]?.trim() ?? "")
    : extFromPath(normalized);

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
