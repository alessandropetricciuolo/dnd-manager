import type { GeneratedCharacterSheet, GeneratedSpell } from "@/lib/sheet-generator/types";
import { extractPhbSpellMarkdown } from "@/lib/server/phb-spell-excerpt";

export type QuickManualSection = {
  title: string;
  body: string;
};

const MAX_SECTION_CHARS = 28_000;
const MAX_SPELL_SECTION_CHARS = 12_000;

/** Rimuove tabelle markdown/HTML di scaling (slot per livello, progressioni). */
export function stripScalingTablesFromMarkdown(md: string): string {
  let t = md.replace(/\r/g, "");

  // Tabelle markdown pipe
  t = t.replace(/^\|.+\|\s*\n\|[-| :]+\|\s*\n(?:\|.+\|\s*\n?)+/gm, "");

  // Tabelle HTML
  t = t.replace(/<table[\s\S]*?<\/table>/gi, "");

  // Righe tipo tabella slot (| 1° | 2 | ... |)
  t = t.replace(/^\|\s*\d+[°º]?\s*\|.*$/gm, "");

  return t.replace(/\n{3,}/g, "\n\n").trim();
}

function trimSection(body: string, maxLen: number): string {
  const cleaned = stripScalingTablesFromMarkdown(body);
  if (cleaned.length <= maxLen) return cleaned;
  const cut = cleaned.slice(0, maxLen);
  const lastBreak = Math.max(cut.lastIndexOf("\n\n"), cut.lastIndexOf(". "));
  const out = (lastBreak > maxLen * 0.65 ? cut.slice(0, lastBreak) : cut).trim();
  return `${out}\n\n[… testo troncato per lunghezza PDF …]`;
}

function mdToPlainSections(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractWarlockInvocations(classFeaturesMd: string): string | null {
  if (!/suppliche occulte|dono del patto/i.test(classFeaturesMd)) return null;
  const lines = classFeaturesMd.split("\n");
  const blocks: string[] = [];
  let capture = false;
  let buf: string[] = [];

  const flush = () => {
    if (buf.length) blocks.push(buf.join("\n").trim());
    buf = [];
  };

  for (const line of lines) {
    const h = line.match(/^#{1,3}\s+(.+)$/i);
    if (h) {
      flush();
      const title = h[1].trim();
      capture = /suppliche occulte|dono del patto|invocazione/i.test(title);
      if (capture) {
        buf.push(title);
      }
      continue;
    }
    if (capture) buf.push(line);
  }
  flush();

  const merged = blocks.filter(Boolean).join("\n\n");
  return merged.trim() || null;
}

function formatSpellBlock(spell: GeneratedSpell): string {
  const full =
    spell.fullTextMd?.trim() ||
    extractPhbSpellMarkdown(spell.name)?.trim() ||
    spell.summary?.trim() ||
    "";
  const header =
    spell.level === 0
      ? `Trucchetto: ${spell.name}`
      : `Incantesimo ${spell.level}° livello: ${spell.name}`;
  const flags: string[] = [];
  if (spell.ritual) flags.push("Rituale");
  if (spell.concentration) flags.push("Concentrazione");
  if (spell.verbal) flags.push("V");
  if (spell.somatic) flags.push("S");
  if (spell.material) flags.push("M");
  const flagLine = flags.length ? `\nComponenti: ${flags.join(", ")}` : "";
  return `${header}${flagLine}\n\n${mdToPlainSections(full)}`.trim();
}

/**
 * Sezioni del Manuale rapido (modalità torneo): testo ripulito dal manuale, senza riassunti da scheda.
 */
export async function buildQuickManualSections(
  sheet: GeneratedCharacterSheet
): Promise<QuickManualSection[]> {
  const sections: QuickManualSection[] = [];

  const raceParts = [sheet.raceTraitsMd, sheet.subraceTraitsMd].filter(Boolean).join("\n\n");
  if (raceParts.trim()) {
    sections.push({
      title: sheet.subraceLabel
        ? `Tratti razziali — ${sheet.raceLabel} (${sheet.subraceLabel})`
        : `Tratti razziali — ${sheet.raceLabel}`,
      body: trimSection(mdToPlainSections(raceParts), MAX_SECTION_CHARS),
    });
  }

  if (sheet.classFeaturesMd.trim()) {
    sections.push({
      title: `Privilegi di classe — ${sheet.classLabel} (livello ${sheet.level})`,
      body: trimSection(mdToPlainSections(sheet.classFeaturesMd), MAX_SECTION_CHARS),
    });
  }

  if (sheet.subclassFeaturesMd?.trim()) {
    sections.push({
      title: `Sottoclasse — ${sheet.classSubclass ?? "Archetipo"}`,
      body: trimSection(mdToPlainSections(sheet.subclassFeaturesMd), MAX_SECTION_CHARS),
    });
  }

  const cantrips = sheet.spells.filter((s) => s.level === 0);
  const leveled = sheet.spells.filter((s) => s.level >= 1);

  if (cantrips.length) {
    sections.push({
      title: "Trucchetti",
      body: trimSection(
        cantrips.map(formatSpellBlock).join("\n\n—\n\n"),
        MAX_SPELL_SECTION_CHARS
      ),
    });
  }

  if (leveled.length) {
    sections.push({
      title: "Incantesimi",
      body: trimSection(
        leveled.map(formatSpellBlock).join("\n\n—\n\n"),
        MAX_SPELL_SECTION_CHARS
      ),
    });
  }

  if (sheet.classLabel === "Warlock") {
    const inv = extractWarlockInvocations(sheet.classFeaturesMd);
    if (inv) {
      sections.push({
        title: "Suppliche occulte e doni del patto",
        body: trimSection(mdToPlainSections(inv), MAX_SECTION_CHARS),
      });
    }
  }

  return sections;
}
