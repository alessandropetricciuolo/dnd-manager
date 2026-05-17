/**
 * Logica condivisa import catalogo PG (CLI + admin da JSON).
 * Server-only: storage, Telegram, fetch HTTPS.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { uploadToTelegram } from "@/lib/telegram-storage";
import { parseSafeExternalUrl } from "@/lib/security/url";

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

function hasAssetSource(x: JsonImage | JsonSheet): "file" | "url" | "base64" | null {
  if (x.file) return "file";
  if (x.url) return "url";
  if (x.base64) return "base64";
  return null;
}

/**
 * Esegue l’import nel DB + storage Telegram/PDF.
 * @param mode - `cli`: consente `image.file` / `sheet.file` sul disco; `admin`: solo URL o base64.
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

      const imgSrc = hasAssetSource(img);
      const sheetSrc = hasAssetSource(sh);
      if (!imgSrc) throw new Error("image: indica file (solo CLI), url o base64");
      if (!sheetSrc) throw new Error("sheet: indica file (solo CLI), url o base64");

      if (options.mode === "admin") {
        if (imgSrc === "file" || sheetSrc === "file") {
          throw new Error(
            'Percorsi "file" non disponibili da questa pagina: usa "url" o "base64", oppure lo script CLI.'
          );
        }
      }

      let imageUrl: string | null = null;

      if (imgSrc === "file" && options.mode === "cli") {
        const fp = resolvePathCli(options.jsonPath, img.file!);
        const buf = await readFile(fp);
        const mime = mimeFromFilePath(fp);
        const fname = path.basename(fp) || "portrait.png";
        const file = new File([new Uint8Array(buf)], fname, { type: mime });
        const fileId = await uploadToTelegram(file, undefined, "photo");
        imageUrl = `/api/tg-image/${encodeURIComponent(fileId)}`;
      } else if (imgSrc === "url") {
        const safe = parseSafeExternalUrl(img.url!);
        if (!safe) throw new Error("image.url non consentito (solo https, host pubblico)");
        imageUrl = safe;
      } else if (imgSrc === "base64") {
        const { buf, dataUrlMime } = decodeBase64Payload(img.base64!);
        if (!buf.length) throw new Error("image base64 vuoto");
        const fname =
          (typeof img.fileName === "string" && img.fileName.trim()) || "portrait.png";
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

      if (sheetSrc === "file" && options.mode === "cli") {
        const fp = resolvePathCli(options.jsonPath, sh.file!);
        pdfBuf = await readFile(fp);
      } else if (sheetSrc === "url") {
        const safe = parseSafeExternalUrl(sh.url!);
        if (!safe) throw new Error("sheet.url non consentito");
        pdfBuf = await fetchBinary(safe);
      } else if (sheetSrc === "base64") {
        const { buf } = decodeBase64Payload(sh.base64!);
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
