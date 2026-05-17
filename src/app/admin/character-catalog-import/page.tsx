import path from "node:path";
import { readFile } from "node:fs/promises";

import { CharacterCatalogImportClient } from "./character-catalog-import-client";

export const dynamic = "force-dynamic";

export default async function AdminCharacterCatalogImportPage() {
  const examplePath = path.join(process.cwd(), "scripts/character-catalog.import.example.json");
  let exampleJson =
    '{\n  "libraryKey": "barber_and_dragons",\n  "entries": []\n}\n';
  try {
    exampleJson = await readFile(examplePath, "utf-8");
  } catch {
    // fallback se il file non è presente in deploy
  }

  return <CharacterCatalogImportClient exampleJson={exampleJson} />;
}
