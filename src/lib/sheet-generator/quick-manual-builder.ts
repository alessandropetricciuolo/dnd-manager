import type { GeneratedCharacterSheet, GeneratedSpell } from "@/lib/sheet-generator/types";
import { extractPhbSpellMarkdown } from "@/lib/server/phb-spell-excerpt";
import { raceTraitsForQuickManual } from "@/lib/sheet-generator/sheet-mapper";
import { kiPointsClassFeatureLine } from "@/lib/sheet-generator/monk-meta";
import { sorceryPointsClassFeatureLine } from "@/lib/sheet-generator/sorcerer-meta";
import { buildDruidWildShapeManualBody } from "@/lib/sheet-generator/druid-wild-shape";
import { buildMonkKiManualBody } from "@/lib/sheet-generator/monk-ki-phb";
import {
  buildWarlockInvocationsOnlyManualBody,
  buildWarlockPactManualBody,
  stripWarlockPactAndInvocationsFromClassMd,
} from "@/lib/sheet-generator/warlock-invocation-phb";

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

  const raceBody = raceTraitsForQuickManual(sheet.raceTraitsMd, sheet.subraceTraitsMd ?? "");
  if (raceBody.trim()) {
    sections.push({
      title: sheet.subraceLabel
        ? `Tratti razziali — ${sheet.raceLabel} (${sheet.subraceLabel})`
        : `Tratti razziali — ${sheet.raceLabel}`,
      body: trimSection(raceBody, MAX_SECTION_CHARS),
    });
  }

  if (sheet.classFeaturesMd.trim()) {
    const classMdHasKiLine = /punti ki disponibili/i.test(sheet.classFeaturesMd);
    const resourceLine =
      sheet.classLabel === "Stregone"
        ? sorceryPointsClassFeatureLine(sheet.level)
        : sheet.classLabel === "Monaco" && !classMdHasKiLine
          ? kiPointsClassFeatureLine(sheet.level)
          : null;
    const classMdForManual =
      sheet.classLabel === "Warlock"
        ? stripWarlockPactAndInvocationsFromClassMd(sheet.classFeaturesMd)
        : sheet.classFeaturesMd;
    const classBody = [
      resourceLine,
      mdToPlainSections(classMdForManual),
    ]
      .filter(Boolean)
      .join("\n\n");
    sections.push({
      title: `Privilegi di classe — ${sheet.classLabel} (livello ${sheet.level})`,
      body: trimSection(classBody, MAX_SECTION_CHARS),
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
    const pactManual = buildWarlockPactManualBody(sheet.classFeaturesMd);
    if (pactManual) {
      sections.push({
        title: "Dono del patto",
        body: trimSection(mdToPlainSections(pactManual), MAX_SECTION_CHARS),
      });
    }
    const invManual = buildWarlockInvocationsOnlyManualBody(sheet.classFeaturesMd);
    if (invManual) {
      sections.push({
        title: "Suppliche occulte",
        body: trimSection(mdToPlainSections(invManual), MAX_SECTION_CHARS),
      });
    }
  }

  if (sheet.classLabel === "Monaco" && sheet.level >= 2) {
    const kiManual = buildMonkKiManualBody(sheet.level);
    if (kiManual) {
      sections.push({
        title: "Privilegi del Ki",
        body: trimSection(mdToPlainSections(kiManual), MAX_SECTION_CHARS),
      });
    }
  }

  if (sheet.classLabel === "Druido" && sheet.level >= 2) {
    const wildShapeManual = await buildDruidWildShapeManualBody(
      sheet.level,
      sheet.classSubclass
    );
    if (wildShapeManual) {
      sections.push({
        title: "Forme bestiali — Forma selvatica",
        body: trimSection(wildShapeManual, MAX_SECTION_CHARS),
      });
    }
  }

  return sections;
}

/** Sezione testo background PHB per il PDF (opzione «background e storia»). */
export function buildBackgroundPdfSections(sheet: GeneratedCharacterSheet): QuickManualSection[] {
  const md = sheet.backgroundMd?.trim();
  if (!md) return [];
  return [
    {
      title: `Background — ${sheet.backgroundLabel}`,
      body: trimSection(mdToPlainSections(md), MAX_SECTION_CHARS),
    },
  ];
}
