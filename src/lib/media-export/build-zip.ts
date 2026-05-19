import archiver from "archiver";
import { PassThrough } from "stream";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { collectSiteImages } from "./collect-images";
import { downloadGmAttachment, downloadStorageObject, fetchImageForExport } from "./fetch-image";
import type { CollectImagesOptions } from "./types";

const CONCURRENCY = 4;
const MAX_IMAGES = 800;

type BuildZipResult = {
  stream: PassThrough;
  filename: string;
  archive: archiver.Archiver;
};

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      results[i] = await fn(items[i], i);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

export async function buildImagesZipStream(
  admin: SupabaseClient<Database>,
  siteOrigin: string,
  options: CollectImagesOptions = {}
): Promise<BuildZipResult> {
  const allRecords = await collectSiteImages(admin, options);
  const records = allRecords.slice(0, MAX_IMAGES);

  const stamp = new Date().toISOString().slice(0, 10);
  const scope = options.campaignId ? `campagna_${options.campaignId.slice(0, 8)}` : "sito";
  const filename = `barber-and-dragons-immagini_${scope}_${stamp}.zip`;

  const passThrough = new PassThrough();
  const archive = archiver("zip", { zlib: { level: 6 } });
  archive.pipe(passThrough);

  archive.append(
    [
      "Export immagini Barber And Dragons",
      `Data: ${new Date().toISOString()}`,
      `Ambito: ${options.campaignId ? `campagna ${options.campaignId}` : "intero sito"}`,
      `Immagini nel pacchetto: ${records.length} (su ${allRecords.length} trovate)`,
      allRecords.length > MAX_IMAGES
        ? `Nota: export limitato a ${MAX_IMAGES} immagini per timeout server.`
        : "",
      "",
    ]
      .filter(Boolean)
      .join("\n"),
    { name: "LEGGIMI.txt" }
  );

  const usedNames = new Set<string>();

  await mapPool(records, CONCURRENCY, async (record) => {
    let fetched: { buffer: Buffer; ext: string } | null = null;

    if (record.imageUrl && !record.imageUrl.startsWith("http") && !record.imageUrl.startsWith("/")) {
      if (record.source === "gm_allegati") {
        fetched = await downloadGmAttachment(admin, record.imageUrl);
      } else if (record.source === "mappe_esplorazione") {
        fetched = await downloadStorageObject(admin, "exploration_maps", record.imageUrl);
      }
    }
    if (!fetched) {
      fetched = await fetchImageForExport(record, siteOrigin);
    }
    if (!fetched) return;

    let base = `${record.source}/${record.label}_${record.id.slice(0, 8)}.${fetched.ext}`;
    let n = 1;
    while (usedNames.has(base)) {
      base = `${record.source}/${record.label}_${record.id.slice(0, 8)}_${n}.${fetched.ext}`;
      n += 1;
    }
    usedNames.add(base);
    archive.append(fetched.buffer, { name: base });
  });

  void archive.finalize();

  return { stream: passThrough, filename, archive };
}
