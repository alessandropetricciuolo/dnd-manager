import {
  getManualMarkdownByFileName,
  preloadManualMarkdownFile,
} from "./phb-spell-excerpt";
import type { CharacterSheetSpell } from "@/lib/character-sheet";

export type CompendiumSpellResult = CharacterSheetSpell & {
  sourceBook: string;
};

let cachedIndex: CompendiumSpellResult[] | null = null;

const SOURCE_FILES: Array<{ file: string; label: string }> = [
  { file: "manuale_giocatore.md", label: "Manuale del Giocatore" },
  { file: "xanathar.md", label: "Guida Omnicomprensiva di Xanathar" },
  { file: "Tasha.md", label: "Calderone Omnicomprensivo di Tasha" },
];

function normalizeSearch(s: string): string {
  return s
    .toLocaleLowerCase("it")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function parseSpellBlocksFromMarkdown(textRaw: string, sourceBook: string): CompendiumSpellResult[] {
  const text = textRaw.replace(/[’‘]/g, "'");
  if (!text) return [];
  const marker = text.search(/^# DESCRIZION[EI] DEGLI INCANTESIMI\s*$/m);
  let chapter = marker >= 0 ? text.slice(marker) : text;
  const stopIdx = chapter.search(/^# (?:INCANTESIMI PERSONALIZZATI|APPENDICE [AB]:)/m);
  if (stopIdx > 0) chapter = chapter.slice(0, stopIdx);

  const headingRegex =
    /^(?:#{1,6}\s+([^\n]+)|\*\*([A-ZÀ-Ü' ()/-]{3,})\*\*(?=\s*\n+\s*(?:#{1,6}\s*)?\*{0,2}(?:Trucchetto|[A-Za-zÀ-ü]+ di \$?[1-9])))/gm;
  const matches = [...chapter.matchAll(headingRegex)].filter((m) => {
    const title = (m[1] ?? m[2] ?? "").replace(/\*+/g, "").trim();
    return (
      title.length >= 2 &&
      title.length <= 120 &&
      !/^DESCRIZION[EI] DEGLI INCANTESIMI$/i.test(title) &&
      !/Trucchetto|livello|^(?:Tempo di Lancio|Gittata|Componenti|Durata|Ai Livelli Superiori)/i.test(title)
    );
  });

  const results: CompendiumSpellResult[] = [];

  for (let i = 0; i < matches.length; i += 1) {
    const current = matches[i]!;
    const next = matches[i + 1];
    const rawTitle = (current[1] ?? current[2] ?? "").replace(/\*+/g, "").trim();
    const start = current.index ?? 0;
    const end = next?.index ?? chapter.length;
    let block = chapter.slice(start, end).trim();

    const bodyLines = block
      .slice(current[0].length)
      .split("\n")
      .map((line) => line.replace(/\*/g, "").replace(/^#{1,6}\s*/, "").trim())
      .filter(Boolean);
    const metaLine = bodyLines[0] ?? "";

    const isCantrip = /Trucchetto/i.test(metaLine);
    const lvlMatch = metaLine.match(/\$?([1-9])(?:\s*(?:[°º]|\^\{\\circ\}\$?))?\s*livello/i);
    if (!isCantrip && !lvlMatch) continue;
    const level = isCantrip ? 0 : Number.parseInt(lvlMatch![1]!, 10);

    block = block
      .replace(/^#{1,6}\s+(?=(?:Tempo di Lancio|Gittata|Componenti|Durata):)/gm, "")
      .replace(/^\*{0,2}(Tempo di Lancio|Gittata|Componenti|Durata):?\*{0,2}:?\s*/gim, "**$1:** ");

    if (!/\*\*Durata:\*\*/i.test(block) || !/\*\*Componenti:\*\*/i.test(block)) continue;

    const castingTime = block.match(/\*\*Tempo di Lancio:\*\*\s*([^\n]+)/i)?.[1]?.trim() ?? "";
    const range = block.match(/\*\*Gittata:\*\*\s*([^\n]+)/i)?.[1]?.trim() ?? "";
    const components = block.match(/\*\*Componenti:\*\*\s*([^\n]+)/i)?.[1]?.trim() ?? "";
    const duration = block.match(/\*\*Durata:\*\*\s*([^\n]+)/i)?.[1]?.trim() ?? "";

    const summaryParts = [
      metaLine,
      castingTime && `Lancio: ${castingTime}`,
      range && `Gittata: ${range}`,
      duration && `Durata: ${duration}`,
    ].filter(Boolean);

    results.push({
      name: rawTitle,
      level,
      summary: summaryParts.join(" · ").slice(0, 500),
      fullTextMd: `Fonte: ${sourceBook}\n\n${block}`.slice(0, 38_000),
      ritual: /rituale/i.test(metaLine),
      concentration: /\bConcentrazione\b/i.test(duration),
      verbal: /\bV\b/.test(components),
      somatic: /\bS\b/.test(components),
      material: /\bM\b/.test(components),
      sourceBook,
    });
  }

  return results;
}

export async function ensureCompendiumSpellIndex(requestOrigin?: string | null): Promise<CompendiumSpellResult[]> {
  if (cachedIndex && cachedIndex.length > 50) return cachedIndex;
  await Promise.all(SOURCE_FILES.map((s) => preloadManualMarkdownFile(s.file, requestOrigin)));

  const dedup = new Map<string, CompendiumSpellResult>();
  for (const src of SOURCE_FILES) {
    const md = getManualMarkdownByFileName(src.file);
    const parsed = parseSpellBlocksFromMarkdown(md, src.label);
    for (const sp of parsed) {
      const key = `${sp.level}:${normalizeSearch(sp.name)}`;
      if (!dedup.has(key)) dedup.set(key, sp);
    }
  }
  const built = Array.from(dedup.values()).sort(
    (a, b) => a.level - b.level || a.name.localeCompare(b.name, "it"),
  );
  if (built.length > 0) cachedIndex = built;
  return built;
}

export async function searchCompendiumSpells(params: {
  query: string;
  level?: number | null;
  limit?: number;
  requestOrigin?: string | null;
}): Promise<CompendiumSpellResult[]> {
  const index = await ensureCompendiumSpellIndex(params.requestOrigin);
  const q = normalizeSearch(params.query);
  const limit = Math.max(1, Math.min(40, params.limit ?? 20));

  const filtered = index.filter((spell) => {
    if (params.level !== undefined && params.level !== null && spell.level !== params.level) {
      return false;
    }
    if (!q) return true;
    return normalizeSearch(spell.name).includes(q);
  });

  // Prioritize prefix matches when query is provided
  if (q) {
    filtered.sort((a, b) => {
      const aStarts = normalizeSearch(a.name).startsWith(q) ? 0 : 1;
      const bStarts = normalizeSearch(b.name).startsWith(q) ? 0 : 1;
      return aStarts - bStarts || a.level - b.level || a.name.localeCompare(b.name, "it");
    });
  }

  return filtered.slice(0, limit);
}
