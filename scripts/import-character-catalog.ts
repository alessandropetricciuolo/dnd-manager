/**
 * Import interno nel catalogo globale `character_catalog` + upload PDF in storage `character_sheets/catalog/<slug>/`.
 *
 * Uso:
 *   npx tsx scripts/import-character-catalog.ts path/al/file.json
 *
 * Richiede .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
 */

import { loadEnvConfig } from "@next/env";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { uploadToTelegram } from "@/lib/telegram-storage";
import { parseSafeExternalUrl } from "@/lib/security/url";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CHARACTER_SHEETS_BUCKET = "character_sheets";

function getEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Missing environment variable: ${name}`);
  return v;
}

type JsonImage = { file?: string; url?: string };
type JsonSheet = { file?: string; url?: string };

type CatalogJsonEntry = {
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

type CatalogJsonFile = {
  libraryKey?: string;
  entries: CatalogJsonEntry[];
};

function mimeFromFilePath(p: string): string {
  const low = p.toLowerCase();
  if (low.endsWith(".png")) return "image/png";
  if (low.endsWith(".jpg") || low.endsWith(".jpeg")) return "image/jpeg";
  if (low.endsWith(".webp")) return "image/webp";
  if (low.endsWith(".gif")) return "image/gif";
  return "application/octet-stream";
}

function resolvePath(jsonPath: string, rel: string): string {
  return path.isAbsolute(rel) ? rel : path.resolve(path.dirname(jsonPath), rel);
}

async function fetchBinary(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

function printSchema(examplePath: string): void {
  console.log(`
--- Formato JSON (vedi anche ${examplePath}) ---
{
  "libraryKey": "barber_and_dragons",
  "entries": [
    {
      "slug": "mio-pg",
      "name": "Nome",
      "character_class": "Guerriero",
      "class_subclass": null,
      "armor_class": 18,
      "hit_points": 30,
      "background": "Testo storia",
      "race_slug": "umano",
      "subclass_slug": null,
      "background_slug": "soldato",
      "image": { "file": "rel/path/img.png" },
      "image": { "url": "https://..." },
      "sheet": { "file": "rel/path/scheda.pdf" },
      "sheet": { "url": "https://....pdf" }
    }
  ]
}
- slug: solo minuscolo, numeri e trattini (chiave stabile).
- Percorsi "file" sono relativi alla cartella del JSON (o assoluti).
- Immagine "file": upload Telegram → image_url /api/tg-image/...
- Immagine "url": URL https valido (nessun upload Telegram).
- Scheda: sempre salvata in storage come character_sheets/catalog/<slug>/scheda.pdf
`);
}

async function main() {
  loadEnvConfig(process.cwd());

  const jsonPathArg = process.argv[2];
  if (!jsonPathArg) {
    console.error("Uso: npx tsx scripts/import-character-catalog.ts <file.json>");
    process.exit(1);
  }

  const jsonPath = path.resolve(process.cwd(), jsonPathArg);
  const exampleRel = "scripts/character-catalog.import.example.json";

  const raw = await readFile(jsonPath, "utf-8");
  const body = JSON.parse(raw) as CatalogJsonFile;
  if (!body.entries?.length) {
    console.error("Nessuna entry nel JSON.");
    printSchema(exampleRel);
    process.exit(1);
  }

  const libraryKey = body.libraryKey?.trim() || "barber_and_dragons";
  const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  getEnv("TELEGRAM_BOT_TOKEN");
  getEnv("TELEGRAM_CHAT_ID");

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const errors: string[] = [];

  for (const entry of body.entries) {
    const label = entry.slug ?? entry.name ?? "?";
    try {
      if (!entry.slug?.trim() || !SLUG_RE.test(entry.slug.trim())) {
        throw new Error(`slug non valido (usare solo a-z 0-9 trattini): ${entry.slug}`);
      }
      if (!entry.name?.trim()) throw new Error("name obbligatorio");

      const slug = entry.slug.trim().toLowerCase();
      const img = entry.image;
      const sh = entry.sheet;
      if (!img?.file && !img?.url) throw new Error("image.file o image.url obbligatorio");
      if (!sh?.file && !sh?.url) throw new Error("sheet.file o sheet.url obbligatorio");

      let imageUrl: string | null = null;
      if (img.file) {
        const fp = resolvePath(jsonPath, img.file);
        const buf = await readFile(fp);
        const mime = mimeFromFilePath(fp);
        const fname = path.basename(fp) || "portrait.png";
        const file = new File([buf], fname, { type: mime });
        const fileId = await uploadToTelegram(file, undefined, "photo");
        imageUrl = `/api/tg-image/${encodeURIComponent(fileId)}`;
      } else if (img.url) {
        const safe = parseSafeExternalUrl(img.url);
        if (!safe) throw new Error("image.url non consentito (solo https, host pubblico)");
        imageUrl = safe;
      }

      let pdfBuf: Buffer;
      if (sh.file) {
        const fp = resolvePath(jsonPath, sh.file);
        pdfBuf = await readFile(fp);
      } else if (sh.url) {
        const safe = parseSafeExternalUrl(sh.url);
        if (!safe) throw new Error("sheet.url non consentito");
        pdfBuf = await fetchBinary(safe);
      } else {
        throw new Error("sheet mancante");
      }

      if (!pdfBuf.length) throw new Error("PDF vuoto");

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

      console.log(`[ok] ${slug} → DB + ${storagePath}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${label}: ${msg}`);
      console.error(`[ERR] ${label}: ${msg}`);
    }
  }

  console.log(`\nCompletato: ${body.entries.length - errors.length}/${body.entries.length} senza errori.`);
  if (errors.length) {
    console.error("\nErrori:", errors.join("\n"));
    process.exitCode = 1;
  }

  printSchema(exampleRel);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
