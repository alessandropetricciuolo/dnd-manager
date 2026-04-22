import {
  backgroundBySlug,
  CLASS_OPTIONS,
  classByLabel,
  maxSpellLevelOnSheet,
  PHB_MD_FILE,
  raceBySlug,
  type ClassCatalogEntry,
} from "@/lib/character-build-catalog";
import { matchSupplementSubclass, supplementSubclassesForClass } from "@/lib/character-subclass-catalog";
import { extractClassPrivilegesMarkdown } from "@/lib/server/phb-class-privileges-excerpt";
import {
  extractPhbSpellMarkdown,
  getManualMarkdownByFileName,
  preloadManualMarkdownFile,
  preloadPhbMarkdown,
} from "@/lib/server/phb-spell-excerpt";
import type { AbilityKey, GeneratedSpell } from "@/lib/sheet-generator/types";

function headingLevel(line: string): number | null {
  const m = line.match(/^(\s*#{1,6})\s+.+$/);
  if (!m) return null;
  return (m[1].match(/#/g) ?? []).length;
}

function normalizeHeadingForMatch(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[*_`>#]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function headingTextRaw(line: string): string | null {
  const m = line.match(/^(\s*#{1,6})\s+(.+?)\s*$/);
  if (!m) return null;
  return m[2].replace(/\s+#+\s*$/, "").trim();
}

function extractSectionByHeadingsMarkdown(raw: string, headings: string[]): string {
  const txt = raw.replace(/\r/g, "");
  if (!txt.trim()) return "";
  const targets = headings.map(normalizeHeadingForMatch).filter(Boolean);
  if (!targets.length) return "";
  const lines = txt.split("\n");
  let startIdx = -1;
  let startLevel = 7;
  for (let i = 0; i < lines.length; i += 1) {
    const ht = headingTextRaw(lines[i]);
    if (!ht) continue;
    if (!targets.includes(normalizeHeadingForMatch(ht))) continue;
    const lv = headingLevel(lines[i]);
    if (!lv) continue;
    startIdx = i;
    startLevel = lv;
    break;
  }
  if (startIdx < 0) return "";
  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i += 1) {
    const lv = headingLevel(lines[i]);
    if (lv && lv <= startLevel) {
      endIdx = i;
      break;
    }
  }
  return lines.slice(startIdx, endIdx).join("\n").trim();
}

/**
 * Estrae il blocco di una sottoclasse dal manuale: inizia dal primo heading tra `sectionHeadings`
 * che compare nel testo (ordine nel file) e termina prima del primo heading che appartiene a un
 * altro archetipo (`stopHeadingNorms`, es. ## SIGNORE DELLE BESTIE dopo ### CACCIATORE).
 * Evita il troncamento che si ha con {@link extractSectionByHeadingsMarkdown} quando un ### è
 * seguito da ## (livello “più alto” nel markdown) come sotto il Cacciatore.
 */
/** H1 dei capitoli classe nel PHB IT: serve quando gli heading “fratelli” sono tutti prima nel file (es. ultimo giuramento del paladino). */
function phbClassChapterH1StopNorms(excludeParentClassLabel: string | null | undefined): Set<string> {
  const set = new Set<string>();
  for (const c of CLASS_OPTIONS) {
    set.add(normalizeHeadingForMatch(c.label));
  }
  if (excludeParentClassLabel?.trim()) {
    set.delete(normalizeHeadingForMatch(excludeParentClassLabel));
  }
  return set;
}

function extractSubclassSectionMarkdown(
  raw: string,
  sectionHeadings: string[],
  stopHeadingNorms: string[],
  parentClassLabel?: string | null
): string {
  const txt = raw.replace(/\r/g, "");
  if (!txt.trim()) return "";
  const targets = sectionHeadings.map(normalizeHeadingForMatch).filter(Boolean);
  if (!targets.length) return "";
  const stops = new Set(stopHeadingNorms.map(normalizeHeadingForMatch).filter(Boolean));
  const classChapterStops = phbClassChapterH1StopNorms(parentClassLabel);
  const lines = txt.split("\n");
  let startIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const ht = headingTextRaw(lines[i]);
    if (!ht) continue;
    if (!targets.includes(normalizeHeadingForMatch(ht))) continue;
    if (startIdx < 0 || i < startIdx) startIdx = i;
  }
  if (startIdx < 0) return "";

  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    const ht = headingTextRaw(lines[i]);
    const lv = headingLevel(lines[i]);
    if (!lv || !ht) continue;
    const n = normalizeHeadingForMatch(ht);
    if (stops.has(n)) {
      endIdx = i;
      break;
    }
    if (lv === 1 && classChapterStops.has(n)) {
      endIdx = i;
      break;
    }
  }
  return lines.slice(startIdx, endIdx).join("\n").trim();
}

function siblingSubclassStopHeadings(parentClassLabel: string, currentSubclassLabel: string): string[] {
  const cur = currentSubclassLabel
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return supplementSubclassesForClass(parentClassLabel)
    .filter((e) => {
      const lab = e.label
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      return lab !== cur;
    })
    .flatMap((e) => e.sectionHeadings);
}

function cleanRulesExcerpt(md: string): string {
  let t = md.replace(/\r/g, "");
  t = t.replace(/^!\[[^\]]*]\([^)]*\)\s*$/gm, "");
  t = t.replace(/^CAPITOLO\s+\d+\s*\|[^\n]*$/gim, "");
  t = t.replace(/^Offrimi un caff[eè]:.*$/gim, "");
  t = t.replace(/^\s*(?:https?:\/\/)?(?:www\.)?paypal\.me\/\S+\s*$/gim, "");
  t = t.replace(/^\s*\d{1,4}\s*$/gm, "");
  t = t.replace(/\n{3,}/g, "\n\n");
  return t.trim();
}

function featureUnlockLevel(text: string): number | null {
  const t = text.replace(/\r/g, "");
  const patterns = [
    /\ba partire dal\s+(\d+)[°º]?\s+livello\b/i,
    /\bal\s+(\d+)[°º]?\s+livello\b/i,
    /\bquando arriva al\s+(\d+)[°º]?\s+livello\b/i,
    /\barriva al\s+(\d+)[°º]?\s+livello\b/i,
  ];
  for (const p of patterns) {
    const m = t.match(p);
    if (!m) continue;
    const n = Number.parseInt(m[1], 10);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function normalizeTitleForMatch(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function filterClassFeaturesByLevel(md: string, level: number): string {
  const txt = cleanRulesExcerpt(md)
    .replace(/^##\s+PRIVILEGI DI CLASSE\s*$/gim, "")
    .replace(/^Un\s+.+?\s+ottiene i seguenti privilegi di classe\.\s*$/gim, "")
    .trim();
  if (!txt) return "";

  /** Blocchi ripetitivi / meccaniche incantesimi: non sono «privilegi» da lista in scheda (come PF/competenze). */
  const omittedStaticSections = new Set([
    "PUNTI FERITA",
    "COMPETENZE",
    "EQUIPAGGIAMENTO",
    "INCANTESIMI",
    "TRUCCHETTI",
    /** Tabella livelli bardo convertita da `# BARDO` + HTML. */
    "BARDO",
    "SLOT INCANTESIMO",
    "INCANTESIMI CONOSCIUTI DI 1 LIVELLO E DI LIVELLO SUPERIORE",
    "PREPARARE E LANCIARE INCANTESIMI",
    "PREPARARE GLI INCANTESIMI",
    "LANCIARE INCANTESIMI",
    "INCANTESIMI PREPARATI",
    "CARATTERISTICA DA INCANTATORE",
    "CARATTERISTICA DA LANCIO DEGLI INCANTESIMI",
    "CD TIRO SALVEZZA INCANTESIMI",
    "MODIFICATORE DI ATTACCO INCANTESIMI",
    "CELEBRARE RITUALI",
    "LANCIO RITUALE",
    "LANCIARE COME RITUALE",
    "FOCUS DA INCANTATORE",
    "FOCUS ARCANO",
    "FOCUS DRUIDICO",
    "FOCUS SACRO",
  ]);
  /** Titolo dell’H1/H2 d’introduzione: non è un privilegio numerato. */
  const skippedIntroHeadings = new Set(["PRIVILEGI DI CLASSE"]);
  const lines = txt.split("\n");
  const kept: string[] = [];
  let currentHeading: string | null = null;
  let currentLines: string[] = [];
  const seenHeadings = new Set<string>();

  function flushSection() {
    if (!currentHeading) {
      currentLines = [];
      return;
    }
    const headingNorm = normalizeTitleForMatch(currentHeading);
    if (omittedStaticSections.has(headingNorm) || skippedIntroHeadings.has(headingNorm)) {
      currentHeading = null;
      currentLines = [];
      return;
    }
    if (seenHeadings.has(headingNorm)) {
      currentHeading = null;
      currentLines = [];
      return;
    }
    const body = currentLines.join("\n").trim();
    if (!body) {
      currentHeading = null;
      currentLines = [];
      return;
    }
    const unlock = featureUnlockLevel(body);
    if (unlock && unlock > level) {
      currentHeading = null;
      currentLines = [];
      return;
    }
    seenHeadings.add(headingNorm);
    kept.push(`### ${currentHeading}\n\n${body}`);
    currentHeading = null;
    currentLines = [];
  }

  for (const line of lines) {
    const h = line.match(/^(#{1,3})\s+(.+?)\s*$/);
    if (h) {
      flushSection();
      currentHeading = h[2].trim();
      continue;
    }
    if (!currentHeading) continue;
    currentLines.push(line);
  }
  flushSection();

  return kept.join("\n\n").trim();
}

function stripHtmlTagsCellText(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function htmlTableToMarkdown(tableHtml: string): string | null {
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const rows: string[][] = [];
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRe.exec(tableHtml)) !== null) {
    const cellRe = /<(th|td)[^>]*>([\s\S]*?)<\/\1>/gi;
    const cells: string[] = [];
    let cellMatch: RegExpExecArray | null;
    while ((cellMatch = cellRe.exec(rowMatch[1])) !== null) {
      const text = stripHtmlTagsCellText(cellMatch[2]);
      if (text) cells.push(text);
      else cells.push("");
    }
    if (cells.length > 0) rows.push(cells);
  }
  if (!rows.length) return null;
  const colCount = Math.max(...rows.map((r) => r.length));
  const normalized = rows.map((r) => {
    if (r.length < colCount) return [...r, ...Array(colCount - r.length).fill("")];
    return r;
  });
  const header = normalized[0];
  const sep = Array(colCount).fill("---");
  const body = normalized.slice(1);
  return [
    `| ${header.join(" | ")} |`,
    `| ${sep.join(" | ")} |`,
    ...body.map((r) => `| ${r.join(" | ")} |`),
  ].join("\n");
}

function normalizeMarkdownTables(md: string): string {
  if (!/<table>/i.test(md)) return md;
  const tableRe = /<table[^>]*>[\s\S]*?<\/table>/gi;
  let out = md;
  let match: RegExpExecArray | null;
  const pieces: Array<{ raw: string; md: string }> = [];
  while ((match = tableRe.exec(md)) !== null) {
    const raw = match[0];
    const conv = htmlTableToMarkdown(raw);
    if (conv) pieces.push({ raw, md: conv });
  }
  for (const p of pieces) {
    out = out.replace(p.raw, p.md);
  }
  // Compatta eventuali duplicati consecutivi (OCR a tabelle spezzate con stessa intestazione).
  out = out.replace(
    /(\|[^\n]+\|\n\|[^\n]+\|\n(?:\|[^\n]+\|\n)+)\s*(\|[^\n]+\|\n\|[^\n]+\|\n(?:\|[^\n]+\|\n)+)/g,
    (full, t1, t2) => {
      const h1 = t1.split("\n")[0]?.trim();
      const h2 = t2.split("\n")[0]?.trim();
      if (!h1 || h1 !== h2) return full;
      const rows1 = t1.trim().split("\n");
      const rows2 = t2.trim().split("\n");
      return [...rows1, ...rows2.slice(2)].join("\n");
    }
  );
  return out;
}

function stripOptionalHumanTraits(md: string): string {
  const txt = md.replace(/\r/g, "");
  const marker = /^(?:\s*>\s*)+#{1,6}\s*TRATTI UMANI ALTERNATIVI\b.*$/im;
  const m = marker.exec(txt);
  if (!m || m.index < 0) return txt.trim();
  return txt.slice(0, m.index).trim();
}

function extractSectionByContentAnchorMarkdown(raw: string, anchor: string): string {
  const txt = raw.replace(/\r/g, "");
  if (!txt.trim() || !anchor.trim()) return "";
  const idx = txt.toLocaleLowerCase("it").indexOf(anchor.toLocaleLowerCase("it"));
  if (idx < 0) return "";
  const lines = txt.split("\n");
  let charCount = 0;
  let lineIdx = 0;
  for (; lineIdx < lines.length; lineIdx += 1) {
    const lineLen = lines[lineIdx].length + 1;
    if (charCount + lineLen > idx) break;
    charCount += lineLen;
  }
  let startIdx = -1;
  let startLevel = 7;
  for (let i = lineIdx; i >= 0; i -= 1) {
    const lv = headingLevel(lines[i]);
    if (!lv) continue;
    startIdx = i;
    startLevel = lv;
    break;
  }
  if (startIdx < 0) return "";
  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i += 1) {
    const lv = headingLevel(lines[i]);
    if (lv && lv <= startLevel) {
      endIdx = i;
      break;
    }
  }
  return lines.slice(startIdx, endIdx).join("\n").trim();
}

function extractSpellListByMaxLevel(raw: string, maxSpellLevel: number): string {
  if (maxSpellLevel < 0 || !raw.trim()) return "";
  const lines = raw.replace(/\r/g, "").split("\n");
  const out: string[] = [];
  let take = false;
  for (const line of lines) {
    const trimmed = line.trim();
    const m =
      trimmed.match(/^(#{1,3})\s+(TRUCCHETTI(?:\s*\(LIVELLO\s*0\))?)\s*$/i) ||
      trimmed.match(/^(#{1,3})\s+(\d+)°\s*LIVELLO\s*$/i);
    if (m) {
      if (/TRUCCHETTI/i.test(m[2] ?? "")) {
        take = true;
      } else {
        const lvl = Number.parseInt(m[2] ?? "0", 10);
        take = Number.isFinite(lvl) && lvl >= 1 && lvl <= maxSpellLevel;
      }
      if (take) out.push(line);
      continue;
    }
    if (take) out.push(line);
  }
  return out.join("\n").trim();
}

function parseSpellsWithLevelFromList(md: string): Array<{ name: string; level: number }> {
  if (!md.trim()) return [];
  const out: Array<{ name: string; level: number }> = [];
  const seen = new Set<string>();
  let currentLevel = 0;
  for (const rawLine of md.replace(/\r/g, "").split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const cantripHead = line.match(/^#{1,6}\s+TRUCCHETTI(?:\s*\(LIVELLO\s*0\))?\s*$/i);
    if (cantripHead) {
      currentLevel = 0;
      continue;
    }
    const lvlHead = line.match(/^#{1,6}\s+(\d+)°\s*LIVELLO\s*$/i);
    if (lvlHead) {
      currentLevel = Number.parseInt(lvlHead[1], 10) || currentLevel;
      continue;
    }
    if (/^#{1,6}\s+/.test(line)) continue;
    const core = line
      .replace(/^(?:[-*]|\d+[.)])\s+/, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/\s*\([^)]*\)\s*$/g, "")
      .replace(/[;,:.]+$/g, "")
      .trim();
    if (!core || core.length < 2 || core.length > 70) continue;
    const key = `${currentLevel}:${core.toLocaleLowerCase("it")}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name: core, level: currentLevel });
  }
  return out;
}

function pickRandomUnique<T>(items: T[], count: number): T[] {
  if (count <= 0 || items.length === 0) return [];
  const pool = [...items];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length));
}

function compactSpellSummary(md: string): string {
  const source = md.replace(/\r/g, "");
  const lines = source
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean)
    .filter((x) => !/^#{1,6}\s+/.test(x))
    .filter(
      (x) =>
        !/^(?:\*\*)?\s*(?:livello|scuola|tempo di lancio|gittata|componenti|durata)\b/i.test(x)
    );
  const body = lines.join(" ").replace(/\s+/g, " ").trim();
  if (!body) return "";
  const sentences = body
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const summary = sentences.slice(0, 2).join(" ").trim() || body;
  const maxLen = 120;
  if (summary.length <= maxLen) return summary;
  const cut = summary.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  const clean = (lastSpace > 70 ? cut.slice(0, lastSpace) : cut).replace(/[;,:.\-–—\s]+$/g, "");
  return `${clean}…`;
}

function extractSpellFlags(mdSpell: string): {
  ritual: boolean;
  concentration: boolean;
  verbal: boolean;
  somatic: boolean;
  material: boolean;
} {
  const body = mdSpell.replace(/\r/g, "");
  const compact = body.replace(/\s+/g, " ");
  const componentsLine =
    compact.match(/(?:\*\*|__)?\s*componenti(?:\*\*|__)?\s*:\s*([^.\n]+)/i)?.[1] ?? "";
  const components = componentsLine.toUpperCase();

  const verbal = /\bV\b/.test(components) || /\bverbale\b/i.test(body);
  const somatic = /\bS\b/.test(components) || /\bsomatica\b/i.test(body);
  const material = /\bM\b/.test(components) || /\bmateriale\b/i.test(body);
  const ritual = /\brituale\b/i.test(body);
  const concentration =
    /\bconcentrazione\b/i.test(body) ||
    /durata[^.\n]{0,80}\bconcentrazione\b/i.test(compact);

  return { ritual, concentration, verbal, somatic, material };
}

function pickLeveledSpellsBalanced(
  entries: Array<{ name: string; level: number }>,
  count: number,
  maxLevel: number
): Array<{ name: string; level: number }> {
  if (count <= 0) return [];
  const pool = entries.filter((e) => e.level >= 1 && e.level <= maxLevel);
  if (!pool.length) return [];

  const byLevel = new Map<number, Array<{ name: string; level: number }>>();
  for (const e of pool) {
    const list = byLevel.get(e.level) ?? [];
    list.push(e);
    byLevel.set(e.level, list);
  }
  // Evita bias alfabetico: mescola il pool di ogni livello prima della selezione.
  for (const [lvl, list] of byLevel.entries()) {
    byLevel.set(lvl, pickRandomUnique(list, list.length));
  }

  const picked: Array<{ name: string; level: number }> = [];
  // 1) Garantisci almeno un incantesimo per ogni livello disponibile (partendo dal più alto).
  for (let lvl = maxLevel; lvl >= 1 && picked.length < count; lvl -= 1) {
    const list = byLevel.get(lvl);
    if (!list?.length) continue;
    const next = list.shift();
    if (next) picked.push(next);
  }
  // 2) Riempi i restanti slot: scelta random su tutto il rimanente, pesata verso livelli alti.
  const remaining = Array.from(byLevel.entries())
    .flatMap(([lvl, list]) => list.map((e) => ({ ...e, __weight: Math.max(1, lvl) })));
  while (remaining.length > 0 && picked.length < count) {
    const totalWeight = remaining.reduce((acc, x) => acc + x.__weight, 0);
    let roll = Math.random() * totalWeight;
    let idx = 0;
    for (let i = 0; i < remaining.length; i += 1) {
      roll -= remaining[i].__weight;
      if (roll <= 0) {
        idx = i;
        break;
      }
    }
    const [chosen] = remaining.splice(idx, 1);
    picked.push({ name: chosen.name, level: chosen.level });
  }
  return picked;
}

const SPELLCASTING_ABILITY_BY_CLASS: Record<string, AbilityKey | null> = {
  Barbaro: null,
  Bardo: "cha",
  Chierico: "wis",
  Druido: "wis",
  Guerriero: null,
  Ladro: null,
  Mago: "int",
  Monaco: null,
  Paladino: "cha",
  Ranger: "wis",
  Stregone: "cha",
  Warlock: "cha",
  Artefice: "int",
};

const CANTRIPS_BY_CLASS_LEVEL: Partial<Record<string, number[]>> = {
  Bardo: [2, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  Chierico: [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  Druido: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  Mago: [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  Stregone: [4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6],
  Warlock: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  Artefice: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
};

function cantripsKnownForClass(classLabel: string, level: number): number {
  const table = CANTRIPS_BY_CLASS_LEVEL[classLabel];
  if (!table) return 0;
  const idx = Math.min(table.length - 1, Math.max(0, Math.max(1, level) - 1));
  return table[idx] ?? table[table.length - 1] ?? 0;
}

function slotsForClassLevel(classDef: ClassCatalogEntry | null, level: number): Record<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9, number> {
  const out = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
  if (!classDef?.spellList) return out;
  const lvl = Math.max(1, Math.min(20, level));
  const full: Array<[number, number, number, number, number, number, number, number, number]> = [
    [2, 0, 0, 0, 0, 0, 0, 0, 0],
    [3, 0, 0, 0, 0, 0, 0, 0, 0],
    [4, 2, 0, 0, 0, 0, 0, 0, 0],
    [4, 3, 0, 0, 0, 0, 0, 0, 0],
    [4, 3, 2, 0, 0, 0, 0, 0, 0],
    [4, 3, 3, 0, 0, 0, 0, 0, 0],
    [4, 3, 3, 1, 0, 0, 0, 0, 0],
    [4, 3, 3, 2, 0, 0, 0, 0, 0],
    [4, 3, 3, 3, 1, 0, 0, 0, 0],
    [4, 3, 3, 3, 2, 0, 0, 0, 0],
    [4, 3, 3, 3, 2, 1, 0, 0, 0],
    [4, 3, 3, 3, 2, 1, 0, 0, 0],
    [4, 3, 3, 3, 2, 1, 1, 0, 0],
    [4, 3, 3, 3, 2, 1, 1, 0, 0],
    [4, 3, 3, 3, 2, 1, 1, 1, 0],
    [4, 3, 3, 3, 2, 1, 1, 1, 0],
    [4, 3, 3, 3, 2, 1, 1, 1, 1],
    [4, 3, 3, 3, 3, 1, 1, 1, 1],
    [4, 3, 3, 3, 3, 2, 1, 1, 1],
    [4, 3, 3, 3, 3, 2, 2, 1, 1],
  ];
  const row = full[lvl - 1] ?? full[full.length - 1];
  if (classDef.spellProgression === "full") {
    row.forEach((v, i) => {
      out[(i + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9] = v;
    });
    return out;
  }
  const half: Array<[number, number, number, number, number]> = [
    [0, 0, 0, 0, 0],
    [2, 0, 0, 0, 0],
    [3, 0, 0, 0, 0],
    [3, 0, 0, 0, 0],
    [4, 2, 0, 0, 0],
    [4, 2, 0, 0, 0],
    [4, 3, 0, 0, 0],
    [4, 3, 0, 0, 0],
    [4, 3, 2, 0, 0],
    [4, 3, 2, 0, 0],
    [4, 3, 3, 0, 0],
    [4, 3, 3, 0, 0],
    [4, 3, 3, 1, 0],
    [4, 3, 3, 1, 0],
    [4, 3, 3, 2, 0],
    [4, 3, 3, 2, 0],
    [4, 3, 3, 3, 1],
    [4, 3, 3, 3, 1],
    [4, 3, 3, 3, 2],
    [4, 3, 3, 3, 2],
  ];
  const halfUp: Array<[number, number, number, number, number]> = [
    [2, 0, 0, 0, 0],
    [2, 0, 0, 0, 0],
    [3, 0, 0, 0, 0],
    [3, 0, 0, 0, 0],
    [4, 2, 0, 0, 0],
    [4, 2, 0, 0, 0],
    [4, 3, 0, 0, 0],
    [4, 3, 0, 0, 0],
    [4, 3, 2, 0, 0],
    [4, 3, 2, 0, 0],
    [4, 3, 3, 0, 0],
    [4, 3, 3, 0, 0],
    [4, 3, 3, 1, 0],
    [4, 3, 3, 1, 0],
    [4, 3, 3, 2, 0],
    [4, 3, 3, 2, 0],
    [4, 3, 3, 3, 1],
    [4, 3, 3, 3, 1],
    [4, 3, 3, 3, 2],
    [4, 3, 3, 3, 2],
  ];
  const pactSlots = [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4];
  const pactSlotLevel = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5];
  if (classDef.spellProgression === "half") {
    const r = half[lvl - 1];
    if (r) r.forEach((v, i) => (out[(i + 1) as 1 | 2 | 3 | 4 | 5] = v));
    return out;
  }
  if (classDef.spellProgression === "half_up") {
    const r = halfUp[lvl - 1];
    if (r) r.forEach((v, i) => (out[(i + 1) as 1 | 2 | 3 | 4 | 5] = v));
    return out;
  }
  if (classDef.spellProgression === "pact") {
    const slots = pactSlots[lvl - 1] ?? 0;
    const slotLevel = pactSlotLevel[lvl - 1] ?? 1;
    out[slotLevel as 1 | 2 | 3 | 4 | 5] = slots;
    return out;
  }
  return out;
}

function spellSelectionCount(classLabel: string, level: number, castingMod: number): number {
  const lvl = Math.max(1, Math.min(20, level));
  if (classLabel === "Chierico" || classLabel === "Druido") return Math.max(1, lvl + castingMod);
  if (classLabel === "Paladino") return Math.max(1, Math.floor(lvl / 2) + castingMod);
  if (classLabel === "Artefice") return Math.max(1, Math.floor(lvl / 2) + castingMod);
  if (classLabel === "Mago") return Math.max(1, lvl + castingMod);

  const knownByClass: Partial<Record<string, number[]>> = {
    Bardo: [4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 15, 16, 18, 19, 19, 20, 22, 22, 22],
    Stregone: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 12, 13, 13, 14, 14, 15, 15, 15, 15],
    Warlock: [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15],
    Ranger: [0, 0, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11],
  };
  const table = knownByClass[classLabel];
  if (!table) return Math.max(1, 3 + Math.floor((lvl - 1) * 0.8));
  return table[lvl - 1] ?? table[table.length - 1] ?? 0;
}

export type ResolvedRules = {
  raceTraitsMd: string;
  subraceTraitsMd: string | null;
  classFeaturesMd: string;
  subclassFeaturesMd: string | null;
  backgroundMd: string | null;
  spellcastingAbility: AbilityKey | null;
  spellSlots: Record<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9, number>;
  cantripsKnown: number;
  spellsPrepared: number;
  spells: GeneratedSpell[];
  warnings: string[];
};

export async function resolveGeneratorRules(
  input: {
    raceSlug: string;
    subraceSlug: string | null;
    classLabel: string;
    classSubclass: string | null;
    backgroundSlug: string;
    level: number;
  },
  abilityModByKey: Record<AbilityKey, number>,
  proficiencyBonus: number,
  requestOrigin?: string | null
): Promise<ResolvedRules> {
  const warnings: string[] = [];
  const raceDef = raceBySlug(input.raceSlug);
  const classDef = classByLabel(input.classLabel);
  const bgDef = backgroundBySlug(input.backgroundSlug);

  let raceTraitsMd = "";
  let subraceTraitsMd: string | null = null;
  if (raceDef) {
    const source = raceDef.supplementRulesSource?.markdownFile ?? PHB_MD_FILE;
    await preloadManualMarkdownFile(source, requestOrigin);
    const md = getManualMarkdownByFileName(source);
    raceTraitsMd = raceDef.traitsContentAnchor
      ? extractSectionByContentAnchorMarkdown(md, raceDef.traitsContentAnchor)
      : extractSectionByHeadingsMarkdown(md, [raceDef.traitsSectionHeading]);
    if (raceDef.subraces?.length && input.subraceSlug) {
      const sr = raceDef.subraces.find((s) => s.slug === input.subraceSlug);
      if (sr) subraceTraitsMd = extractSectionByHeadingsMarkdown(md, [sr.sectionHeading]) || null;
    }
    if (!raceTraitsMd.trim()) {
      raceTraitsMd = extractSectionByHeadingsMarkdown(md, [raceDef.label.toUpperCase()]);
    }
  }
  if (!raceTraitsMd.trim()) warnings.push("Tratti razziali non trovati nel manuale sorgente.");

  let classFeaturesMd = "";
  if (classDef) {
    const mdFile = classDef.privilegesMarkdownFile ?? PHB_MD_FILE;
    await preloadManualMarkdownFile(mdFile, requestOrigin);
    const md = getManualMarkdownByFileName(mdFile);
    const anchors =
      classDef.privilegesAnchors && classDef.privilegesAnchors.length > 0
        ? classDef.privilegesAnchors
        : [classDef.privilegesAnchor];
    if (classDef.privilegesExcerptStopPattern?.trim()) {
      classFeaturesMd = extractClassPrivilegesMarkdown(
        anchors,
        classDef.privilegesExcerptStopPattern,
        md,
        classDef.privilegesMdStrips
      );
    } else {
      classFeaturesMd = extractSectionByHeadingsMarkdown(md, anchors);
    }
  }
  if (!classFeaturesMd.trim() && classDef) {
    const mdFile = classDef.privilegesMarkdownFile ?? PHB_MD_FILE;
    const md = getManualMarkdownByFileName(mdFile);
    const classChapter = extractSectionByHeadingsMarkdown(md, [classDef.label.toUpperCase()]);
    if (classChapter.trim()) {
      const anchors =
        classDef.privilegesAnchors && classDef.privilegesAnchors.length > 0
          ? classDef.privilegesAnchors
          : [classDef.privilegesAnchor];
      classFeaturesMd = extractClassPrivilegesMarkdown(
        anchors,
        classDef.privilegesExcerptStopPattern,
        classChapter,
        classDef.privilegesMdStrips
      );
    }
  }
  if (!classFeaturesMd.trim()) warnings.push("Privilegi di classe non trovati nel manuale sorgente.");

  let subclassFeaturesMd: string | null = null;
  if (input.classSubclass?.trim()) {
    const subclassStops = siblingSubclassStopHeadings(input.classLabel, input.classSubclass);
    const matched = matchSupplementSubclass(input.classLabel, input.classSubclass);
    if (matched) {
      await preloadManualMarkdownFile(matched.supplementRulesSource.markdownFile, requestOrigin);
      const md = getManualMarkdownByFileName(matched.supplementRulesSource.markdownFile);
      subclassFeaturesMd =
        extractSubclassSectionMarkdown(md, matched.sectionHeadings, subclassStops, input.classLabel) ||
        extractSectionByHeadingsMarkdown(md, matched.sectionHeadings) ||
        null;
      if (!subclassFeaturesMd?.trim() && matched.contentIlikeFallback) {
        subclassFeaturesMd = extractSectionByContentAnchorMarkdown(
          md,
          matched.contentIlikeFallback.replace(/%/g, "")
        ) || null;
      }
    } else {
      await preloadPhbMarkdown(requestOrigin);
      const md = getManualMarkdownByFileName(PHB_MD_FILE);
      subclassFeaturesMd =
        extractSubclassSectionMarkdown(md, [input.classSubclass.trim().toUpperCase()], subclassStops, input.classLabel) ||
        extractSectionByHeadingsMarkdown(md, [input.classSubclass.toUpperCase()]) ||
        null;
    }
  }

  let backgroundMd: string | null = null;
  if (bgDef) {
    await preloadManualMarkdownFile(PHB_MD_FILE, requestOrigin);
    backgroundMd = extractSectionByHeadingsMarkdown(getManualMarkdownByFileName(PHB_MD_FILE), [bgDef.phbH1]) || null;
  }

  const spellcastingAbility = SPELLCASTING_ABILITY_BY_CLASS[input.classLabel] ?? null;
  const spellSlots = slotsForClassLevel(classDef, input.level);
  const cantripsKnown = cantripsKnownForClass(input.classLabel, input.level);
  const castingMod = spellcastingAbility ? abilityModByKey[spellcastingAbility] : 0;
  const spellsPrepared = spellcastingAbility
    ? spellSelectionCount(input.classLabel, input.level, castingMod)
    : 0;

  const spells: GeneratedSpell[] = [];
  if (classDef?.spellList && spellsPrepared > 0) {
    const mdFile = classDef.supplementRulesSource?.markdownFile ?? PHB_MD_FILE;
    await preloadManualMarkdownFile(mdFile, requestOrigin);
    const md = getManualMarkdownByFileName(mdFile);
    const listRaw =
      classDef.spellList.style === "h1"
        ? extractSectionByHeadingsMarkdown(md, [classDef.spellList.chapter])
        : extractSectionByHeadingsMarkdown(md, [classDef.spellList.sectionHeading]);
    const listByLevel = extractSpellListByMaxLevel(listRaw, maxSpellLevelOnSheet(classDef, input.level));
    const entries = parseSpellsWithLevelFromList(listByLevel);
    const cantripEntries = pickRandomUnique(entries.filter((e) => e.level === 0), cantripsKnown);
    const maxOnSheet = maxSpellLevelOnSheet(classDef, input.level);
    const leveledEntries = pickLeveledSpellsBalanced(entries, spellsPrepared, maxOnSheet);
    const picked = [...cantripEntries, ...leveledEntries];
    await preloadPhbMarkdown(requestOrigin);
    for (const pickedSpell of picked) {
      const mdSpell = extractPhbSpellMarkdown(pickedSpell.name);
      const summary = mdSpell ? compactSpellSummary(mdSpell) : "";
      const flags = extractSpellFlags(mdSpell ?? "");
      spells.push({
        level: pickedSpell.level,
        name: pickedSpell.name,
        summary,
        ritual: flags.ritual,
        concentration: flags.concentration,
        verbal: flags.verbal,
        somatic: flags.somatic,
        material: flags.material,
      });
    }
  }

  return {
    raceTraitsMd: normalizeMarkdownTables(cleanRulesExcerpt(stripOptionalHumanTraits(raceTraitsMd))),
    subraceTraitsMd: subraceTraitsMd ? normalizeMarkdownTables(cleanRulesExcerpt(subraceTraitsMd)) : null,
    classFeaturesMd: normalizeMarkdownTables(filterClassFeaturesByLevel(classFeaturesMd, input.level)),
    subclassFeaturesMd: subclassFeaturesMd
      ? normalizeMarkdownTables(cleanRulesExcerpt(filterClassFeaturesByLevel(subclassFeaturesMd, input.level)))
      : null,
    backgroundMd: backgroundMd ? normalizeMarkdownTables(cleanRulesExcerpt(backgroundMd)) : null,
    spellcastingAbility,
    spellSlots,
    cantripsKnown,
    spellsPrepared,
    spells,
    warnings,
  };
}

function inferSpellLevelFromList(listMd: string, spellName: string): number {
  const lines = listMd.replace(/\r/g, "").split("\n");
  let level = 0;
  for (const raw of lines) {
    const line = raw.trim();
    const h = line.match(/^#{1,6}\s+(\d+)°\s*LIVELLO/i);
    if (h) {
      level = Number.parseInt(h[1], 10) || level;
      continue;
    }
    if (/^#{1,6}\s+TRUCCHETTI/i.test(line)) {
      level = 0;
      continue;
    }
    const core = line
      .replace(/^(?:[-*]|\d+[.)])\s+/, "")
      .replace(/\s*\([^)]*\)\s*$/g, "")
      .replace(/[;,:.]+$/g, "")
      .trim();
    if (core.toLocaleLowerCase("it") === spellName.toLocaleLowerCase("it")) return level;
  }
  return 0;
}
