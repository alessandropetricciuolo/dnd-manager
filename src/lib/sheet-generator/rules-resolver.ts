import {
  backgroundBySlug,
  classByLabel,
  maxSpellLevelOnSheet,
  PHB_MD_FILE,
  raceBySlug,
  type ClassCatalogEntry,
} from "@/lib/character-build-catalog";
import { matchSupplementSubclass } from "@/lib/character-subclass-catalog";
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

function parseSpellNamesFromList(md: string): string[] {
  if (!md.trim()) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const rawLine of md.replace(/\r/g, "").split("\n")) {
    const line = rawLine.trim();
    if (!line || /^#{1,6}\s*/.test(line)) continue;
    if (/^_*\s*(TRUCCHETTI|\d+°\s*LIVELLO)\s*_*\s*$/i.test(line)) continue;
    const core = line
      .replace(/^(?:[-*]|\d+[.)])\s+/, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/\s*\([^)]*\)\s*$/g, "")
      .replace(/[;,:.]+$/g, "")
      .trim();
    if (!core || core.length < 2 || core.length > 60) continue;
    const key = core.toLocaleLowerCase("it");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(core);
  }
  return out;
}

function compactSpellSummary(md: string): string {
  const lines = md
    .replace(/\r/g, "")
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean)
    .filter((x) => !/^#{1,6}\s+/.test(x));
  return lines.slice(0, 3).join(" ").slice(0, 260);
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
  Bardo: [2, 2, 2, 3, 3, 3, 3, 3, 4],
  Chierico: [3, 3, 3, 4, 4],
  Druido: [2, 2, 2, 3, 3, 3, 3, 3, 4],
  Mago: [3, 3, 3, 4, 4],
  Stregone: [4, 4, 4, 5, 5],
  Warlock: [2, 2, 2, 3, 3, 3, 3, 3, 4],
  Artefice: [2, 2, 2, 2, 2, 2, 2, 2, 2],
};

function cantripsKnownForClass(classLabel: string, level: number): number {
  const table = CANTRIPS_BY_CLASS_LEVEL[classLabel];
  if (!table) return 0;
  const idx = Math.min(table.length - 1, Math.max(0, Math.floor((Math.max(1, level) - 1) / 4)));
  return table[idx] ?? table[table.length - 1] ?? 0;
}

function slotsForClassLevel(classDef: ClassCatalogEntry | null, level: number): Record<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9, number> {
  const max = maxSpellLevelOnSheet(classDef, level);
  const out = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
  for (let i = 1 as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9; i <= max; i = (i + 1) as typeof i) {
    if (i <= 2) out[i] = 3;
    else if (i <= 5) out[i] = 2;
    else out[i] = 1;
  }
  return out;
}

function preparedCount(classLabel: string, level: number, castingMod: number): number {
  if (["Chierico", "Druido", "Paladino", "Artefice"].includes(classLabel)) {
    return Math.max(1, level + castingMod);
  }
  const knownBaseline: Record<string, number> = {
    Bardo: 4,
    Ranger: 2,
    Stregone: 2,
    Warlock: 2,
    Mago: 6,
  };
  return Math.max(1, (knownBaseline[classLabel] ?? 3) + Math.floor((level - 1) * 0.8));
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
    const matched = matchSupplementSubclass(input.classLabel, input.classSubclass);
    if (matched) {
      await preloadManualMarkdownFile(matched.supplementRulesSource.markdownFile, requestOrigin);
      const md = getManualMarkdownByFileName(matched.supplementRulesSource.markdownFile);
      subclassFeaturesMd = extractSectionByHeadingsMarkdown(md, matched.sectionHeadings) || null;
      if (!subclassFeaturesMd?.trim() && matched.contentIlikeFallback) {
        subclassFeaturesMd = extractSectionByContentAnchorMarkdown(
          md,
          matched.contentIlikeFallback.replace(/%/g, "")
        ) || null;
      }
    } else {
      await preloadPhbMarkdown(requestOrigin);
      subclassFeaturesMd = extractSectionByHeadingsMarkdown(getManualMarkdownByFileName(PHB_MD_FILE), [
        input.classSubclass.toUpperCase(),
      ]) || null;
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
    ? preparedCount(input.classLabel, input.level, castingMod)
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
    const names = parseSpellNamesFromList(listByLevel);
    const picked = names.slice(0, spellsPrepared);
    await preloadPhbMarkdown(requestOrigin);
    for (const name of picked) {
      const mdSpell = extractPhbSpellMarkdown(name);
      const summary = mdSpell ? compactSpellSummary(mdSpell) : "";
      const body = (mdSpell ?? "").replace(/\r/g, "");
      spells.push({
        level: inferSpellLevelFromList(listByLevel, name),
        name,
        summary,
        ritual: /\brituale\b/i.test(body),
        concentration: /\bconcentrazione\b/i.test(body),
        verbal: /\bverbale\b|\bV\b/i.test(body),
        somatic: /\bsomatica\b|\bS\b/i.test(body),
      });
    }
  }

  return {
    raceTraitsMd,
    subraceTraitsMd,
    classFeaturesMd,
    subclassFeaturesMd,
    backgroundMd,
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
