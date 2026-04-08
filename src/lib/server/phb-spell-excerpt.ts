import fs from "fs";
import path from "path";
import { PHB_MD_FILE } from "@/lib/character-build-catalog";

/** Testo PHB; `undefined` = preload non completato; stringa vuota = nessun sorgente disponibile. */
let cachedPhb: string | undefined;
let preloadDone = false;
let preloadPromise: Promise<void> | null = null;

function resolvePhbAbsolutePath(): string | null {
  const rel = path.join("public", "manuals", PHB_MD_FILE);
  for (const cwd of [ process.cwd(), path.join(process.cwd(), "dnd-manager") ]) {
    const p = path.join(cwd, rel);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function tryReadPhbFromFs(): string | null {
  const p = resolvePhbAbsolutePath();
  if (!p) return null;
  try {
    return fs.readFileSync(p, "utf-8");
  } catch {
    return null;
  }
}

const PHB_API_PATH = "/api/manuals/player-handbook-md";

function publicManualUrlCandidates(requestOrigin?: string | null): string[] {
  const pathSeg = `/manuals/${encodeURI(PHB_MD_FILE)}`;
  const out: string[] = [];
  const pushPair = (origin: string) => {
    const o = origin.replace(/\/$/, "");
    out.push(`${o}${PHB_API_PATH}`);
    out.push(`${o}${pathSeg}`);
  };
  const origin = requestOrigin?.trim();
  if (origin) pushPair(origin);
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (site) pushPair(site);
  const vercel = process.env.VERCEL_URL?.trim().replace(/^https?:\/\//, "");
  if (vercel) pushPair(`https://${vercel}`);
  return [...new Set(out)];
}

/**
 * Carica il markdown PHB: filesystem, poi URL (host della richiesta corrente, env pubblico, VERCEL_URL).
 */
export async function preloadPhbMarkdown(requestOrigin?: string | null): Promise<void> {
  if (preloadDone) return;
  preloadPromise ??= (async () => {
    try {
      const fromFs = tryReadPhbFromFs();
      if (fromFs && fromFs.length > 5000) {
        cachedPhb = fromFs;
        return;
      }
      for (const url of publicManualUrlCandidates(requestOrigin)) {
        try {
          const res = await fetch(url, { cache: "no-store" });
          if (res.ok) {
            const t = await res.text();
            if (t.length > 5000) {
              cachedPhb = t;
              return;
            }
          }
        } catch {
          /* prova il prossimo URL */
        }
      }
      cachedPhb = fromFs ?? "";
    } catch {
      cachedPhb = tryReadPhbFromFs() ?? "";
    } finally {
      preloadDone = true;
      preloadPromise = null;
    }
  })();
  await preloadPromise;
}

function getPhbMarkdown(): string {
  if (cachedPhb !== undefined) return cachedPhb;
  return tryReadPhbFromFs() ?? "";
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Estrae il blocco da `# Titolo incantesimo` al prossimo heading ATX. */
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
  return normalizeSpellExcerptFirstHeading(txt.slice(start, end).trim());
}

/** Il PHB italiano mescola `#` / `##` / `###` per i titoli incantesimo; unifichiamo a `#` per UI/tooltip. */
export function normalizeSpellExcerptFirstHeading(md: string): string {
  const lines = md.split("\n");
  const first = lines[0]?.match(/^(#{1,6})(\s+\S.*)$/);
  if (!first) return md;
  lines[0] = `#${first[2]}`;
  return lines.join("\n");
}
