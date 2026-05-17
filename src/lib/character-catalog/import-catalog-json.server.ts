/**
 * Logica condivisa import catalogo PG (CLI + admin da JSON).
 * Server-only: storage, Telegram, fetch HTTPS.
 * Scheda PDF: supporto link Google Drive (condivisione /file/d/…).
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { uploadToTelegram } from "@/lib/telegram-storage";
import { parseSafeExternalUrl } from "@/lib/security/url";
import { normalizeImageUrl, extractGoogleDriveFileId } from "@/lib/image-url";
import { downloadGoogleDriveFileBuffer } from "@/lib/google-drive-file-download";

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CHARACTER_SHEETS_BUCKET = "character_sheets";

export type JsonImage = { file?: string; url?: string; base64?: string; fileName?: string };
export type JsonSheet = { file?: string; url?: string; base64?: string; fileName?: string };

export type CatalogJsonEntry = {
  slug: string;
  name: string;
  character_class?: string | null;
  class_subclass?: string | null;
  armor_class?: number | null;
  hit_points?: number | null;
  background?: string | null;
  race_slug?: string | null;
  subclass_slug?: string | null;
  background_slug?: string | null;
  image: JsonImage;
  sheet: JsonSheet;
};

export type CatalogJsonFile = {
  libraryKey?: string;
  entries?: CatalogJsonEntry[];
};

export type CatalogImportRunResult = {
  total: number;
  ok: number;
  errors: string[];
  /** Slug importati con successo (ordine di processing). */
  successSlugs: string[];
};

type ResolvedCatalogAsset =
  | { kind: "url"; url: string }
  | { kind: "file"; path: string }
  | { kind: "base64"; payload: string; fileName?: string };

/** Risolve asset: una stringa https in `file` viene trattata come URL (Drive incluso). */
function resolveCatalogAsset(x: JsonImage | JsonSheet): ResolvedCatalogAsset | null {
  const b64Raw = typeof x.base64 === "string" ? x.base64.trim() : "";
  if (b64Raw.length > 0) {
    const fn = typeof x.fileName === "string" && x.fileName.trim() ? x.fileName.trim() : undefined;
    return { kind: "base64", payload: b64Raw, fileName: fn };
  }

  const urlRaw = typeof x.url === "string" ? x.url.trim() : "";
  const fileRaw = typeof x.file === "string" ? x.file.trim() : "";

  if (fileRaw && /^https?:\/\//i.test(fileRaw)) {
    return { kind: "url", url: fileRaw };
  }
  if (urlRaw) return { kind: "url", url: urlRaw };
  if (fileRaw) return { kind: "file", path: fileRaw };
  return null;
}

function getEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Missing environment variable: ${name}`);
  return v;
}

function mimeFromFilePath(p: string): string {
  const low = p.toLowerCase();
  if (low.endsWith(".png")) return "image/png";
  if (low.endsWith(".jpg") || low.endsWith(".jpeg")) return "image/jpeg";
  if (low.endsWith(".webp")) return "image/webp";
  if (low.endsWith(".gif")) return "image/gif";
  return "application/octet-stream";
}

function mimeFromFileName(fname: string): string {
  return mimeFromFilePath(fname);
}

function resolvePathCli(jsonPath: string, rel: string): string {
  return path.isAbsolute(rel) ? rel : path.resolve(path.dirname(jsonPath), rel);
}

async function fetchBinary(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function fetchBinaryFromCatalogUrl(rawUrl: string): Promise<Buffer> {
  const trimmed = rawUrl.trim();
  if (extractGoogleDriveFileId(trimmed)) {
    return downloadGoogleDriveFileBuffer(trimmed);
  }
  const safe = parseSafeExternalUrl(trimmed);
  if (!safe) throw new Error("URL non consentito (solo https e host pubblico)");
  return fetchBinary(safe);
}

/** URL pubblico salvato su DB per avatar (Drive → thumbnail stabile come nel resto dell’app). */
function resolvePublicImageUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (extractGoogleDriveFileId(trimmed)) {
    return normalizeImageUrl(trimmed).trim();
  }
  const safe = parseSafeExternalUrl(trimmed);
  if (!safe) throw new Error("image.url non consentito (solo https, host pubblico)");
  return safe;
}

function decodeBase64Payload(raw: string): { buf: Buffer; dataUrlMime: string | null } {
  const t = raw.trim();
  const m = /^data:([^;]+);base64,([\s\S]*)$/.exec(t);
  if (m) {
    return { buf: Buffer.from(m[2], "base64"), dataUrlMime: m[1].trim() };
  }
  return { buf: Buffer.from(t, "base64"), dataUrlMime: null };
}

function isPdfBuffer(buf: Buffer): boolean {
  return buf.length >= 4 && buf.subarray(0, 4).toString("latin1") === "%PDF";
}

/**
 * Esegue l’import nel DB + storage Telegram/PDF.
 * @param mode - `cli`: consente `image.file` / `sheet.file` sul disco; `admin`: solo URL o base64 (anche Drive).
 */
export async function runCharacterCatalogImport(
  parsed: CatalogJsonFile,
  options: { mode: "cli"; jsonPath: string } | { mode: "admin" }
): Promise<CatalogImportRunResult> {
  const entries = parsed.entries;
  if (!Array.isArray(entries) || entries.length === 0) {
    return { total: 0, ok: 0, errors: ["Il JSON deve contenere un array entries non vuoto."], successSlugs: [] };
  }

  const libraryKey =
    typeof parsed.libraryKey === "string" && parsed.libraryKey.trim()
      ? parsed.libraryKey.trim()
      : "barber_and_dragons";

  const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const errors: string[] = [];
  const successSlugs: string[] = [];
  let ok = 0;

  for (const entry of entries) {
    const label = entry.slug ?? entry.name ?? "?";
    try {
      if (!entry.slug?.trim() || !SLUG_RE.test(entry.slug.trim())) {
        throw new Error(`slug non valido (solo a-z, 0-9, trattini): ${entry.slug}`);
      }
      if (!entry.name?.trim()) throw new Error("name obbligatorio");

      const slug = entry.slug.trim().toLowerCase();
      const img = entry.image;
      const sh = entry.sheet;
      if (!img || !sh) throw new Error("image e sheet obbligatori");

      const imgRes = resolveCatalogAsset(img);
      const sheetRes = resolveCatalogAsset(sh);
      if (!imgRes) throw new Error("image: file locale (CLI), url/https (anche Drive in url o file), o base64");
      if (!sheetRes) throw new Error("sheet: file locale (CLI), url/https (anche Drive in url o file), o base64");

      if (options.mode === "admin") {
        if (imgRes.kind === "file" || sheetRes.kind === "file") {
          throw new Error(
            'Percorsi file locali non disponibili da questa pagina: usa URL (anche Drive) o base64, oppure lo script CLI.'
          );
        }
      }

      let imageUrl: string | null = null;

      if (imgRes.kind === "file" && options.mode === "cli") {
        const fp = resolvePathCli(options.jsonPath, imgRes.path);
        const buf = await readFile(fp);
        const mime = mimeFromFilePath(fp);
        const fname = path.basename(fp) || "portrait.png";
        const file = new File([new Uint8Array(buf)], fname, { type: mime });
        const fileId = await uploadToTelegram(file, undefined, "photo");
        imageUrl = `/api/tg-image/${encodeURIComponent(fileId)}`;
      } else if (imgRes.kind === "url") {
        imageUrl = resolvePublicImageUrl(imgRes.url);
      } else if (imgRes.kind === "base64") {
        const { buf, dataUrlMime } = decodeBase64Payload(imgRes.payload);
        if (!buf.length) throw new Error("image base64 vuoto");
        const fname =
          imgRes.fileName?.trim() ||
          "portrait.png";
        const mime = dataUrlMime?.startsWith("image/") ? dataUrlMime : mimeFromFileName(fname);
        if (!mime.startsWith("image/")) {
          throw new Error(
            "image.base64: serve un MIME immagine (usa data:image/png;base64,... o fileName .png/.jpg)"
          );
        }
        const file = new File([new Uint8Array(buf)], fname, { type: mime });
        const fileId = await uploadToTelegram(file, undefined, "photo");
        imageUrl = `/api/tg-image/${encodeURIComponent(fileId)}`;
      }

      if (!imageUrl) throw new Error("immagine non risolta");

      let pdfBuf: Buffer;

      if (sheetRes.kind === "file" && options.mode === "cli") {
        const fp = resolvePathCli(options.jsonPath, sheetRes.path);
        pdfBuf = await readFile(fp);
      } else if (sheetRes.kind === "url") {
        pdfBuf = await fetchBinaryFromCatalogUrl(sheetRes.url);
      } else if (sheetRes.kind === "base64") {
        const { buf } = decodeBase64Payload(sheetRes.payload);
        pdfBuf = buf;
      } else {
        throw new Error("sheet non risolvibile");
      }

      if (!pdfBuf.length) throw new Error("PDF vuoto");
      if (!isPdfBuffer(pdfBuf)) throw new Error("Il foglio non sembra un PDF valido");

      const storagePath = `catalog/${slug}/scheda.pdf`;
      const { error: upErr } = await supabase.storage.from(CHARACTER_SHEETS_BUCKET).upload(storagePath, pdfBuf, {
        contentType: "application/pdf",
        upsert: true,
      });
      if (upErr) throw new Error(`Storage PDF: ${upErr.message}`);

      const row = {
        slug,
        library_key: libraryKey,
        name: entry.name.trim(),
        character_class: entry.character_class?.trim() || null,
        class_subclass: entry.class_subclass?.trim() || null,
        armor_class: entry.armor_class ?? null,
        hit_points: entry.hit_points ?? null,
        background: entry.background?.trim() || null,
        race_slug: entry.race_slug?.trim() || null,
        subclass_slug: entry.subclass_slug?.trim() || null,
        background_slug: entry.background_slug?.trim() || null,
        image_url: imageUrl,
        sheet_file_path: storagePath,
      };

      const { error: dbErr } = await supabase.from("character_catalog").upsert(row, {
        onConflict: "slug,library_key",
      });
      if (dbErr) throw new Error(dbErr.message);

      ok += 1;
      successSlugs.push(slug);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${label}: ${msg}`);
    }
  }

  return { total: entries.length, ok, errors, successSlugs };
}
