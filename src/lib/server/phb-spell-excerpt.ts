import fs from "fs";
import path from "path";
import { PHB_MD_FILE } from "@/lib/character-build-catalog";

/** `undefined` = non ancora letto; stringa (anche vuota) = contenuto o file assente. */
let cachedRaw: string | undefined;

function resolvePhbAbsolutePath(): string | null {
  const rel = path.join("public", "manuals", PHB_MD_FILE);
  for (const cwd of [process.cwd(), path.join(process.cwd(), "dnd-manager")]) {
    const p = path.join(cwd, rel);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function getPhbMarkdown(): string {
  if (typeof cachedRaw === "string") return cachedRaw;
  const p = resolvePhbAbsolutePath();
  if (!p) {
    cachedRaw = "";
    return cachedRaw;
  }
  cachedRaw = fs.readFileSync(p, "utf-8");
  return cachedRaw;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Estrae il blocco da `# Titolo incantesimo` al prossimo heading ATX (solo file PHB locale). */
export function extractPhbSpellMarkdown(spellName: string): string {
  const name = spellName.trim();
  if (!name) return "";
  const txt = getPhbMarkdown().replace(/\r/g, "");
  if (!txt) return "";
  const head = new RegExp(
    `^#{1,6}\\s+${escapeRegExp(name)}(?:\\s*\\([^)]*\\))?\\s*$`,
    "im"
  );
  const m = head.exec(txt);
  if (!m || m.index < 0) return "";
  const start = m.index;
  const rest = txt.slice(start + m[0].length);
  const next = /^#{1,6}\s+.+$/m.exec(rest);
  const end = next && typeof next.index === "number" ? start + m[0].length + next.index : txt.length;
  return txt.slice(start, end).trim();
}
