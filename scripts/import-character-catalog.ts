/**
 * Import nel catalogo `character_catalog` + upload PDF in storage (stesso formato della pagina admin).
 *
 * Uso:
 *   npm run catalog:import -- path/al/file.json
 *   npx tsx scripts/import-character-catalog.ts path/al/file.json
 *
 * .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
 * (Telegram richiesto se usi image.file o image.base64)
 */

import { loadEnvConfig } from "@next/env";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { runCharacterCatalogImport, type CatalogJsonFile } from "@/lib/character-catalog/import-catalog-json.server";

async function main() {
  loadEnvConfig(process.cwd());

  const jsonPathArg = process.argv[2];
  if (!jsonPathArg) {
    console.error("Uso: npx tsx scripts/import-character-catalog.ts <file.json>");
    process.exit(1);
  }

  const jsonPath = path.resolve(process.cwd(), jsonPathArg);
  const raw = await readFile(jsonPath, "utf-8");
  const body = JSON.parse(raw) as CatalogJsonFile;

  const result = await runCharacterCatalogImport(body, { mode: "cli", jsonPath });

  console.log(`\nCompletati: ${result.ok}/${result.total} senza errori.`);
  if (result.successSlugs.length) {
    console.log("Slug OK:", result.successSlugs.join(", "));
  }
  if (result.errors.length) {
    console.error("\nErrori:\n", result.errors.join("\n"));
  }

  console.log(`
--- Formato JSON (stesso della pagina Admin → Catalogo PG) ---
{
  "libraryKey": "barber_and_dragons",
  "entries": [
    {
      "slug": "mio-pg",
      "name": "Nome",
      "character_class": "Guerriero",
      "sheet": { "url": "https://....pdf" },
      "image": { "url": "https://....png" }
    }
  ]
}
Percorsi "file" solo da CLI (relativi al file JSON). Da browser: url o base64.
`);

  if (result.errors.length) {
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
