import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { uploadToTelegram } from "@/lib/telegram-storage";
import type { Database } from "@/types/database.types";

type StorageImageRow = {
  bucket: string;
  path: string;
  mimetype: string;
};

function getEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function isImageObject(path: string, mimetype: string): boolean {
  if (mimetype.startsWith("image/")) return true;
  return /\.(png|jpe?g|gif|webp|svg|bmp|tiff?)$/i.test(path);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function parseRetryAfterSeconds(errorMessage: string): number | null {
  const match = errorMessage.match(/retry after\s+(\d+)/i);
  if (!match) return null;
  const seconds = Number.parseInt(match[1], 10);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return seconds;
}

async function uploadWithRetry(blob: Blob, caption: string): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      return await uploadToTelegram(blob, caption, "photo");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      lastError = err instanceof Error ? err : new Error(message);
      const retryAfter = parseRetryAfterSeconds(message);
      if (retryAfter == null) {
        break;
      }
      const waitMs = (retryAfter + 1) * 1000;
      console.warn(`[retry] Telegram rate limit, waiting ${retryAfter + 1}s (attempt ${attempt}/4)`);
      await sleep(waitMs);
    }
  }

  // Some images fail as photo due to Telegram processing limits; fallback to document upload.
  if (lastError && /IMAGE_PROCESS_FAILED/i.test(lastError.message)) {
    return uploadToTelegram(blob, caption, "document");
  }

  throw lastError ?? new Error("Upload failed without details");
}

async function collectBucketImages(
  supabase: ReturnType<typeof createClient<Database>>,
  bucket: string,
  prefix = ""
): Promise<StorageImageRow[]> {
  const images: StorageImageRow[] = [];
  let offset = 0;
  const pageSize = 100;

  while (true) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit: pageSize,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) {
      throw new Error(`List failed for ${bucket}/${prefix || ""}: ${error.message}`);
    }
    if (!data?.length) break;

    for (const item of data) {
      const itemPath = `${prefix}${item.name}`;
      const metadata = (item.metadata ?? {}) as Record<string, unknown>;
      const mimetypeRaw = metadata["mimetype"];
      const mimetype = typeof mimetypeRaw === "string" ? mimetypeRaw : "";

      // Folders in Supabase list responses have id=null and no metadata.
      if (!item.id) {
        const nested = await collectBucketImages(supabase, bucket, `${itemPath}/`);
        images.push(...nested);
        continue;
      }

      if (isImageObject(itemPath, mimetype)) {
        images.push({
          bucket,
          path: itemPath,
          mimetype,
        });
      }
    }

    if (data.length < pageSize) break;
    offset += pageSize;
  }

  return images;
}

async function main() {
  loadEnvConfig(process.cwd());

  const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRole = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  getEnv("TELEGRAM_BOT_TOKEN");
  getEnv("TELEGRAM_CHAT_ID");

  const supabase = createClient<Database>(supabaseUrl, serviceRole, {
    auth: { persistSession: false },
  });

  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
  if (bucketsError) {
    throw new Error(`Failed to list buckets: ${bucketsError.message}`);
  }

  const images: StorageImageRow[] = [];
  for (const bucket of buckets ?? []) {
    const bucketImages = await collectBucketImages(supabase, bucket.name);
    images.push(...bucketImages);
  }

  console.log(`Found ${images.length} images in Supabase storage.`);
  if (!images.length) return;

  let uploaded = 0;
  let failed = 0;
  const failedItems: Array<{ bucket: string; path: string; error: string }> = [];
  const byBucket = new Map<string, number>();

  for (const item of images) {
    try {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from(item.bucket)
        .download(item.path);
      if (downloadError || !fileData) {
        throw new Error(downloadError?.message ?? "Download returned empty blob");
      }

      const fileId = await uploadWithRetry(fileData, `Backup ${item.bucket}/${item.path}`);
      uploaded += 1;
      byBucket.set(item.bucket, (byBucket.get(item.bucket) ?? 0) + 1);
      console.log(
        `[OK ${uploaded}/${images.length}] ${item.bucket}/${item.path} -> ${fileId.slice(0, 16)}...`
      );
    } catch (err) {
      failed += 1;
      const message = err instanceof Error ? err.message : "Unknown error";
      failedItems.push({ bucket: item.bucket, path: item.path, error: message });
      console.error(`[FAIL ${failed}/${images.length}] ${item.bucket}/${item.path} -> ${message}`);
    }
  }

  console.log("\nTransfer completed.");
  console.log(`Uploaded: ${uploaded}`);
  console.log(`Failed: ${failed}`);
  console.log("Uploaded by bucket:");
  for (const [bucket, count] of [...byBucket.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`- ${bucket}: ${count}`);
  }

  if (failedItems.length) {
    console.log("\nFailed items:");
    for (const item of failedItems) {
      console.log(`- ${item.bucket}/${item.path}: ${item.error}`);
    }
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("[transfer-supabase-storage-images-to-telegram] fatal", err);
  process.exit(1);
});
