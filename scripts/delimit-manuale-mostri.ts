/**
 * Anteprima confini creatura (Manuale dei Mostri) senza caricare Supabase.
 * Uso: npm run mm:chunks
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  chunkMonsterManualByCreatureIndex,
  parseMonsterManualIndexNames,
  summarizeMonsterManualChunks,
} from "../src/lib/manuals/monster-manual-chunks";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultFile = path.join(root, "public", "manuals", "manuale mostri.md");
const target = process.argv[2] ? path.resolve(process.argv[2]) : defaultFile;

if (!fs.existsSync(target)) {
  console.error("File non trovato:", target);
  process.exit(1);
}

const raw = fs.readFileSync(target, "utf-8");
const lines = raw.split(/\n/);
const index = parseMonsterManualIndexNames(lines);

console.log("File:", target);
console.log("Voci indice estratte:", index.length);
console.log("Prime 10:", index.slice(0, 10).join(" · "));
console.log("Ultime 6:", index.slice(-6).join(" · "));

const chunks = chunkMonsterManualByCreatureIndex(raw);
if (chunks.length === 0) {
  console.error("Nessun chunk: verifica # INDICE / righe «Nome pagina» e # INTRODUZIONE.");
  process.exit(2);
}

const { count, headings, sizes } = summarizeMonsterManualChunks(chunks);
console.log("\nChunk totali (DB ≈ stesso numero, salvo parti extra per lunghezza):", count);
console.log("Primi 8 titoli:", headings.slice(0, 8).join(" | "));
console.log("Ultimi 6 titoli:", headings.slice(-6).join(" | "));

const max = Math.max(...sizes);
const maxIdx = sizes.indexOf(max);
console.log("\nLunghezza max (caratteri):", max, "→", headings[maxIdx]);
const over10k = sizes.filter((n) => n > 10_000).length;
console.log("Blocchi > 10k char (splittati in più righe in ingest):", over10k);
