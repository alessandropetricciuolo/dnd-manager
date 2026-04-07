import fs from "fs";
import path from "path";
import { PHB_MD_FILE } from "@/lib/character-build-catalog";

/** Contenuto PHB caricato; `undefined` = non ancora tentato in questa sessione di preload. */
let cachedRaw: string | undefined;

/** Promise condivisa se preload parte più volte in parallelo. */
let preloadPromise: Promise<void> | null = null;

function resolvePhbAbsolutePath(): string | null {
  const rel = path.join("public", "manuals", PHB_MD_FILE);
  for (const cwd of [process.cwd(), path.join(process.cwd(), "dnd-manager")]) {
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

/** URL assoluto del manuale servito da `public/manuals` (Vercel / sito pubblico). */
function publicManualUrl(): string | null {
  const pathSeg = `/manuals/${encodeURI(PHB_MD_FILE)}`;
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (site) return `${site}${pathSeg}`;
  const vercel = process.env.VERCEL_URL?.trim().replace(/^https?:\/\//, "");
  if (vercel) return `https://${vercel}${pathSeg}`;
  return null;
}

/**
 * Carica il markdown PHB una volta: prima da filesystem (dev / Docker), altrimenti via HTTP
 * (es. deploy Vercel: `VERCEL_URL` o `NEXT_PUBLIC_SITE_URL`).
 * Chiamare all’inizio di `fetchSpellDetails` prima di `extractPhbSpellMarkdown`.
 */
export async function preloadPhbMarkdown(): Promise<void> {
  if (typeof cachedRaw === "string") return;
  preloadPromise ??= (async () => {
    try {
      const fromFs = tryReadPhbFromFs();
      if (fromFs && fromFs.length > 5000) {
        cachedRaw = fromFs;
        return;
      }
      const url = publicManualUrl();
      if (url) {
        const res = await fetch(url, { next: { revalidate: 86_400 } });
        if (res.ok) {
          const t = await res.text();
          if (t.length > 5000) {
            cachedRaw = t;
            return;
          }
        }
      }
      cachedRaw = fromFs ?? "";
    } catch {
      cachedRaw = "";
    } finally {
      preloadPromise = null;
    }
  })();
  await preloadPromise;
}

function getPhbMarkdown(): string {
  if (typeof cachedRaw === "string") return cachedRaw;
  const fromFs = tryReadPhbFromFs();
  if (fromFs) {
    cachedRaw = fromFs;
    return cachedRaw;
  }
  return "";
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
  return txt.slice(start, end).trim();
}
