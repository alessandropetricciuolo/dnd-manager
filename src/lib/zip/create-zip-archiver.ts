import type archiver from "archiver";

/** archiver v8 è ESM-only e non ha più default export; usa ZipArchive. */
// @ts-expect-error ZipArchive esiste in archiver v8; @types/archiver v7 non è aggiornato
import { ZipArchive } from "archiver";

export function createZipArchiver(
  options: { zlib?: { level?: number } } = { zlib: { level: 6 } }
): archiver.Archiver {
  return new ZipArchive(options);
}
