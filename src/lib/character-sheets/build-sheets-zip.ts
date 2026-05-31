import archiver from "archiver";
import { PassThrough } from "stream";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import {
  CHARACTER_SHEETS_BUCKET,
  normalizeCharacterSheetStoragePath,
} from "@/lib/character-sheets/storage-path";

type BuildZipResult = {
  stream: PassThrough;
  filename: string;
};

function sheetZipEntryName(name: string, used: Set<string>): string {
  const slug =
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 60) || "personaggio";
  let candidate = `${slug}.pdf`;
  let n = 2;
  while (used.has(candidate)) {
    candidate = `${slug}_${n}.pdf`;
    n += 1;
  }
  used.add(candidate);
  return candidate;
}

export async function buildCampaignCharacterSheetsZip(
  admin: SupabaseClient<Database>,
  campaignId: string,
  options?: { zipLabel?: string }
): Promise<BuildZipResult> {
  const { data: rows, error } = await admin
    .from("campaign_characters")
    .select("id, name, sheet_file_path")
    .eq("campaign_id", campaignId)
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);

  type SheetRow = { id: string; name: string | null; sheet_file_path: string | null };
  const characters = (rows ?? []) as SheetRow[];
  const withPath = characters
    .map((row) => {
      const path = normalizeCharacterSheetStoragePath(row.sheet_file_path);
      if (!path) return null;
      return { id: row.id, name: row.name?.trim() || "Personaggio", path };
    })
    .filter((r): r is { id: string; name: string; path: string } => r !== null);

  const withoutSheet = characters.filter(
    (row) => !normalizeCharacterSheetStoragePath(row.sheet_file_path)
  );

  const stamp = new Date().toISOString().slice(0, 10);
  const label = options?.zipLabel?.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 40) || "torneo";
  const filename = `barber-and-dragons-schede_${label}_${stamp}.zip`;

  const passThrough = new PassThrough();
  const archive = archiver("zip", { zlib: { level: 6 } });
  archive.pipe(passThrough);

  const usedNames = new Set<string>();
  const failed: string[] = [];

  for (const row of withPath) {
    const { data: fileBlob, error: dlErr } = await admin.storage
      .from(CHARACTER_SHEETS_BUCKET)
      .download(row.path);
    if (dlErr || !fileBlob) {
      failed.push(`${row.name}: ${dlErr?.message ?? "download fallito"}`);
      continue;
    }
    const bytes = Buffer.from(await fileBlob.arrayBuffer());
    if (!bytes.length) {
      failed.push(`${row.name}: PDF vuoto`);
      continue;
    }
    archive.append(bytes, { name: sheetZipEntryName(row.name, usedNames) });
  }

  archive.append(
    [
      "Export schede PDF — Barber And Dragons",
      `Data: ${new Date().toISOString()}`,
      `Campagna: ${campaignId}`,
      `PDF inclusi: ${usedNames.size}`,
      withoutSheet.length > 0
        ? `\nSenza scheda PDF (${withoutSheet.length}):\n${withoutSheet.map((r) => `- ${r.name?.trim() || r.id}`).join("\n")}`
        : "",
      failed.length > 0 ? `\nErrori download (${failed.length}):\n${failed.join("\n")}` : "",
      usedNames.size === 0 ? "\nNessun PDF disponibile nel pacchetto." : "",
      "",
    ]
      .filter((line) => line !== undefined)
      .join("\n"),
    { name: "LEGGIMI.txt" }
  );

  if (usedNames.size === 0) {
    throw new Error(
      withoutSheet.length === characters.length
        ? "Nessun personaggio ha una scheda PDF caricata."
        : "Impossibile scaricare le schede PDF dal storage."
    );
  }

  void archive.finalize();

  return { stream: passThrough, filename };
}
