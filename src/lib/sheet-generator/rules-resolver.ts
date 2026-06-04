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
import {
  sanitizeRaceTraitsMarkdown,
  stripSubraceSectionsFromRaceTraits,
} from "@/lib/race-traits-sanitizer";
import { kiPointsClassFeatureLine } from "@/lib/sheet-generator/monk-meta";
import { sneakAttackClassFeatureLine } from "@/lib/sheet-generator/rogue-meta";
import { extractClassPrivilegesMarkdown } from "@/lib/server/phb-class-privileges-excerpt";
import {
  extractPhbSpellMarkdown,
  getManualMarkdownByFileName,
  preloadManualMarkdownFile,
  preloadPhbMarkdown,
} from "@/lib/server/phb-spell-excerpt";
import { collapseRandomDiceTablesInBackgroundMarkdown } from "@/lib/sheet-generator/background-dice-table-roll";
import type { CharacterBuildOverrides } from "@/lib/sheet-generator/build-choices-types";
import {
  fightingStyleSheetSeed,
  pickDeterministic,
  pickDeterministicMany,
  warlockBuildSeed,
} from "@/lib/sheet-generator/build-choice-defaults";
import {
  filterWarlockInvocationsForLevel,
  warlockInvocationsKnown,
  WARLOCK_PACT_OPTIONS,
  type WarlockInvocationDef,
} from "@/lib/sheet-generator/class-choice-catalog";
import {
  pickCantripsForSheet,
  pickLeveledSpellsSlotAware,
} from "@/lib/sheet-generator/spell-slot-picker";
import { injectRangerPrescelteChoices } from "@/lib/sheet-generator/ranger-meta";
import { sorceryPointsClassFeatureLine } from "@/lib/sheet-generator/sorcerer-meta";
import type { AbilityKey, GeneratedSpell } from "@/lib/sheet-generator/types";
import {
  detectThirdCasterSubclass,
  detectWildMagicBarbarianPath,
  getThirdCasterWizardSpellcasting,
  spellSlotsRecordFromThirdCasterTiers,
} from "@/lib/sheet-generator/third-caster-subclass";
import { getSpellCombatTierScore } from "@/lib/sheet-generator/spell-combat-tier";
import {
  ensureClericCureWoundsSpell,
  ensurePaladinPunishmentSpell,
  filterTorneoCombatSpells,
} from "@/lib/sheet-generator/spell-torneo-combat";
import {
  cantripsKnownForClass,
  slotsForClassLevel,
  SPELLCASTING_ABILITY_BY_CLASS,
} from "@/lib/sheet-generator/spell-slots";
import {
  balanceWizardArcaneSchoolSpells,
  createSpellSchoolLookup,
  parseWizardArcaneSchoolKey,
  stripOtherWizardArcaneSchoolSections,
  wizardArcaneSchoolSectionHeadingNorm,
} from "@/lib/sheet-generator/wizard-arcane-school";
import {
  ensureSorcererMinLevel1Spells,
  enforceSpellLevelCaps,
  type SpellPickOptions,
} from "@/lib/sheet-generator/spell-slot-picker";

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

function findParentClassChapterLineRange(
  lines: string[],
  parentClassLabel: string | null | undefined
): { start: number; end: number } {
  if (!parentClassLabel?.trim()) return { start: 0, end: lines.length };
  const labelNorm = normalizeHeadingForMatch(parentClassLabel);
  const classH1s = new Set(CLASS_OPTIONS.map((c) => normalizeHeadingForMatch(c.label)));
  let start = 0;
  let end = lines.length;
  let inChapter = false;
  for (let i = 0; i < lines.length; i += 1) {
    const ht = headingTextRaw(lines[i]);
    const lv = headingLevel(lines[i]);
    if (lv !== 1 || !ht) continue;
    const n = normalizeHeadingForMatch(ht);
    if (!inChapter) {
      if (n === labelNorm) {
        start = i;
        inChapter = true;
      }
      continue;
    }
    if (classH1s.has(n) && n !== labelNorm) {
      end = i;
      break;
    }
  }
  return { start, end };
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
  const chapter = findParentClassChapterLineRange(lines, parentClassLabel);
  let startIdx = -1;
  for (let i = chapter.start; i < chapter.end; i += 1) {
    const ht = headingTextRaw(lines[i]);
    const lv = headingLevel(lines[i]);
    if (!ht || !lv || lv > 2) continue;
    if (!targets.includes(normalizeHeadingForMatch(ht))) continue;
    if (startIdx < 0 || i < startIdx) startIdx = i;
  }
  if (startIdx < 0) return "";

  const wizardKeepSchoolNorm =
    parentClassLabel?.trim() === "Mago" && targets.length === 1 ? targets[0]! : null;

  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    const ht = headingTextRaw(lines[i]);
    const lv = headingLevel(lines[i]);
    if (!lv || !ht) continue;
    const n = normalizeHeadingForMatch(ht);
    if (wizardKeepSchoolNorm && lv <= 2 && /^SCUOLA\s+DI\s+/i.test(ht) && n !== wizardKeepSchoolNorm) {
      endIdx = i;
      break;
    }
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
  const stops = supplementSubclassesForClass(parentClassLabel)
    .filter((e) => {
      const lab = e.label
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      return lab !== cur;
    })
    .flatMap((e) => e.sectionHeadings);
  if (parentClassLabel.trim() === "Warlock") {
    stops.push("SUPPLICHE OCCULTE");
  }
  return stops;
}

/** Rimuove liste incantesimi e catalogo suppliche dal blocco patrono warlock. */
function trimWarlockPatronSubclassMarkdown(md: string): string {
  let t = md.replace(/\r/g, "").trim();
  if (!t) return "";
  const catalogStop = t.search(/^#{1,2}\s+SUPPLICHE OCCULTE\b/im);
  if (catalogStop >= 0) t = t.slice(0, catalogStop).trim();
  t = t.replace(
    /^#{1,3}\s+LISTA AMPLIATA[\s\S]*?(?=^#{1,3}\s+(?:MENTE|BENEDIZIONE|FORTUNA|RESILIENZA|SCAGLIARE|INTERDIZIONE|SCUDO|CREARE|PROTEZIONE|PASSO|SIGNATURA|RAGGI|RISVEGLI))/im,
    ""
  );
  t = t.replace(/^#{1,3}\s+INCANTESIMI AMPLIATI[\s\S]*?(?=^#{1,3}\s+)/im, "");
  return t.trim();
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
  /** Solo il primo paragrafo: evita falsi positivi da testo «al 6° livello» su scelte successive. */
  const t = (text.replace(/\r/g, "").split(/\n\n+/)[0] ?? text).trim();
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

/** Opzioni «### …» tipiche nello Stile di combattimento PHB italiano (Guerriero = elenco completo; Paladino = sottoinsieme nel testo). */
const PHB_FIGHTING_STYLE_OPTION_HEADINGS_NORM = new Set(
  [
    "COMBATTERE CON ARMI POSSENTI",
    "COMBATTERE CON DUE ARMI",
    "DIFESA",
    "DUELLARE",
    "PROTEZIONE",
    "TIRO",
  ].map(normalizeTitleForMatch)
);

const STILE_DI_COMBATTIMENTO_HEADING_NORM = normalizeTitleForMatch("STILE DI COMBATTIMENTO");

function stableHashNonNegative(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

type MarkdownH3Section = { headingRaw: string; headingNorm: string; body: string };

function splitMarkdownH3Sections(md: string): MarkdownH3Section[] {
  const lines = md.replace(/\r/g, "").split("\n");
  const sections: MarkdownH3Section[] = [];
  let currentHeading: string | null = null;
  let currentBody: string[] = [];

  function flush() {
    if (!currentHeading) return;
    sections.push({
      headingRaw: currentHeading,
      headingNorm: normalizeTitleForMatch(currentHeading),
      body: currentBody.join("\n").trim(),
    });
    currentHeading = null;
    currentBody = [];
  }

  for (const line of lines) {
    const m = line.match(/^### (.+)$/);
    if (m) {
      flush();
      currentHeading = m[1].trim();
      continue;
    }
    if (currentHeading) currentBody.push(line);
  }
  flush();
  return sections;
}

function joinMarkdownH3Sections(sections: MarkdownH3Section[]): string {
  return sections.map((s) => `### ${s.headingRaw}\n\n${s.body}`).join("\n\n").trim();
}

/**
 * Guerriero e Paladino scelgono un solo stile tra quelli offerti dal PHB: in scheda restano l’introduzione e una sola opzione «### …»,
 * scelta in modo deterministico dal seed (classe + nome pg + build).
 */
function collapsePhbFightingStyleOptions(
  md: string,
  seed: string,
  forcedStyleHeading?: string | null
): string {
  const trimmed = md.trim();
  if (!trimmed) return trimmed;

  const sections = splitMarkdownH3Sections(trimmed);
  if (!sections.length) return trimmed;

  const stileIdx = sections.findIndex((s) => s.headingNorm === STILE_DI_COMBATTIMENTO_HEADING_NORM);
  if (stileIdx < 0) return trimmed;

  const styleIndices: number[] = [];
  for (let j = stileIdx + 1; j < sections.length; j++) {
    const sn = sections[j].headingNorm;
    if (PHB_FIGHTING_STYLE_OPTION_HEADINGS_NORM.has(sn)) styleIndices.push(j);
    else break;
  }
  if (styleIndices.length === 0) return trimmed;

  let chosenIdx: number;
  if (forcedStyleHeading?.trim()) {
    const forcedNorm = normalizeTitleForMatch(forcedStyleHeading);
    const found = styleIndices.find((j) => sections[j]!.headingNorm === forcedNorm);
    chosenIdx = found ?? styleIndices[0]!;
  } else {
    const pick = stableHashNonNegative(`${seed}|phb-stile-combattimento`) % styleIndices.length;
    chosenIdx = styleIndices[pick]!;
  }
  const chosen = sections[chosenIdx];

  const mergedIntro =
    `${sections[stileIdx].body}\n\n### ${chosen.headingRaw}\n\n${chosen.body}`.trim();

  const nextSections = sections.filter((_, idx) => idx !== chosenIdx && !styleIndices.includes(idx));
  const mergedStileIdx = nextSections.findIndex((s) => s.headingNorm === STILE_DI_COMBATTIMENTO_HEADING_NORM);
  if (mergedStileIdx >= 0) nextSections[mergedStileIdx] = { ...nextSections[mergedStileIdx], body: mergedIntro };

  return joinMarkdownH3Sections(nextSections);
}

function buildWarlockPactAndInvocationsMarkdown(input: {
  level: number;
  seed: string;
  pactName?: string | null;
  invocationNames?: string[] | null;
}): string {
  const sections: string[] = [];
  const autoPact = pickDeterministic([...WARLOCK_PACT_OPTIONS], `${input.seed}|pact`);
  const pactName = input.pactName?.trim() || autoPact?.name || null;
  const pact =
    WARLOCK_PACT_OPTIONS.find((p) => p.name === pactName) ?? autoPact ?? null;

  if (pact) {
    const intro =
      input.level >= 3
        ? "A partire dal 3° livello il warlock stringe un patto più profondo con il suo patrono."
        : "Il warlock ha gia un cammino di patto pianificato per i prossimi livelli.";
    const unlockNote =
      input.level >= 3 ? "Privilegio disponibile al livello attuale." : "Privilegio pianificato.";
    sections.push(
      [
        "### Dono del Patto",
        "",
        intro,
        `Scelta: **${pact.name}**.`,
        pact.summary,
        unlockNote,
      ].join("\n")
    );
  }

  const known = warlockInvocationsKnown(input.level);
  const targetCount = Math.max(2, known);
  if (targetCount > 0) {
    const effectiveLevel = Math.max(2, input.level);
    const available = filterWarlockInvocationsForLevel(effectiveLevel, pact?.name);
    let picked: WarlockInvocationDef[] = [];
    if (input.invocationNames?.length) {
      picked = input.invocationNames
        .map((name) => available.find((o) => o.name === name))
        .filter((o): o is WarlockInvocationDef => !!o)
        .slice(0, targetCount);
    }
    if (picked.length < targetCount) {
      const auto = pickDeterministicMany(available, targetCount, `${input.seed}|invocations`);
      for (const opt of auto) {
        if (picked.length >= targetCount) break;
        if (!picked.some((p) => p.name === opt.name)) picked.push(opt);
      }
    }
    if (picked.length > 0) {
      const intro =
        input.level >= 2
          ? "A partire dal 2° livello il warlock ottiene suppliche occulte."
          : "Il warlock ha gia una selezione di suppliche occulte pianificata.";
      const unlockNote =
        input.level >= 2 ? `Suppliche attive: ${known}.` : "Suppliche pianificate.";
      sections.push(
        [
          "### Suppliche Occulte",
          "",
          intro,
          "Suppliche selezionate:",
          ...picked.map((opt) => `- **${opt.name}**`),
          unlockNote,
        ].join("\n")
      );
    }
  }

  return sections.join("\n\n").trim();
}

const CLASSES_WITH_PHB_FIGHTING_STYLE_COLLAPSE = new Set(["Guerriero", "Paladino", "Ranger"]);

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
    "ORIGINE STREGONESCA",
    "ORIGINI STREGONESCHE",
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

export function normalizeMarkdownTables(md: string): string {
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
    const line = lines[i];
    const lv = headingLevel(line);
    if (!lv) continue;
    if (lv === 1 && /^#\s+CAPITOLO\s+\d/i.test(line)) {
      endIdx = i;
      break;
    }
    if (lv === 2 && startLevel >= 3) {
      endIdx = i;
      break;
    }
    if (lv === 2 && startLevel === 1) {
      endIdx = i;
      break;
    }
    if (lv === 1 && startLevel >= 3) {
      continue;
    }
    if (lv <= startLevel) {
      endIdx = i;
      break;
    }
  }
  return lines.slice(startIdx, endIdx).join("\n").trim();
}

export function extractSpellListByMaxLevel(raw: string, maxSpellLevel: number): string {
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

export function parseSpellsWithLevelFromList(md: string): Array<{ name: string; level: number }> {
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

export function resolveSpellEntriesByNames(
  pool: Array<{ name: string; level: number }>,
  names: string[],
  minLevel: number
): Array<{ name: string; level: number }> {
  const out: Array<{ name: string; level: number }> = [];
  const seen = new Set<string>();
  for (const name of names) {
    const key = name.toLocaleLowerCase("it");
    if (seen.has(key)) continue;
    const match = pool.find((e) => e.name.toLocaleLowerCase("it") === key);
    if (!match || match.level < minLevel) continue;
    seen.add(key);
    out.push(match);
  }
  return out;
}

export async function loadClassSpellPool(
  input: {
    classLabel: string;
    classSubclass: string | null;
    level: number;
    torneoMode?: boolean;
    tcWizard: boolean;
  },
  maxOnSheet: number,
  requestOrigin?: string | null
): Promise<{ entries: Array<{ name: string; level: number }>; torneoPool: Array<{ name: string; level: number }> }> {
  const classDef = classByLabel(input.classLabel);
  let listRaw = "";
  if (input.tcWizard) {
    await preloadPhbMarkdown(requestOrigin);
    const mdPhb = getManualMarkdownByFileName(PHB_MD_FILE);
    listRaw = extractSectionByHeadingsMarkdown(mdPhb, ["INCANTESIMI DA MAGO"]) ?? "";
  } else if (classDef?.spellList) {
    const mdFile = classDef.supplementRulesSource?.markdownFile ?? PHB_MD_FILE;
    await preloadManualMarkdownFile(mdFile, requestOrigin);
    const md = getManualMarkdownByFileName(mdFile);
    listRaw =
      classDef.spellList.style === "h1"
        ? extractSectionByHeadingsMarkdown(md, [classDef.spellList.chapter]) ?? ""
        : extractSectionByHeadingsMarkdown(md, [classDef.spellList.sectionHeading]) ?? "";
  }
  const listByLevel = extractSpellListByMaxLevel(listRaw, maxOnSheet);
  const entries = parseSpellsWithLevelFromList(listByLevel);
  const torneoPool = input.torneoMode ? filterTorneoCombatSpells(entries) : entries;
  return { entries, torneoPool };
}

export function pickDefaultCantrips(
  entries: Array<{ name: string; level: number }>,
  cantripsKnown: number,
  torneoMode: boolean,
  combatPriority: boolean,
  classLabel: string,
  classSubclass: string | null
): Array<{ name: string; level: number }> {
  const wizardSchoolKey = classLabel === "Mago" ? parseWizardArcaneSchoolKey(classSubclass) : null;
  const schoolLookup = wizardSchoolKey ? createSpellSchoolLookup() : null;
  const pickOptions =
    wizardSchoolKey && schoolLookup
      ? { wizardSchoolKey, getSpellSchool: schoolLookup.getSpellSchool }
      : undefined;
  return pickCantripsForSheet(
    entries,
    cantripsKnown,
    torneoMode,
    combatPriority,
    pickOptions
  );
}

export function pickDefaultLeveledSpells(
  spellPool: Array<{ name: string; level: number }>,
  fullEntries: Array<{ name: string; level: number }>,
  spellsPrepared: number,
  maxOnSheet: number,
  spellSlots: Record<number, number>,
  classLabel: string,
  combatPriority: boolean,
  torneoMode: boolean | undefined,
  classSubclass: string | null
): Array<{ name: string; level: number }> {
  const wizardSchoolKey = classLabel === "Mago" ? parseWizardArcaneSchoolKey(classSubclass) : null;
  const schoolLookup = wizardSchoolKey ? createSpellSchoolLookup() : null;
  const pickOptions =
    wizardSchoolKey && schoolLookup
      ? { wizardSchoolKey, getSpellSchool: schoolLookup.getSpellSchool }
      : undefined;

  let leveledEntries = pickLeveledSpellsSlotAware(
    spellPool,
    spellsPrepared,
    maxOnSheet,
    spellSlots,
    classLabel,
    combatPriority,
    pickOptions
  );
  if (leveledEntries.length < spellsPrepared) {
    const fillPool = torneoMode ? filterTorneoCombatSpells(fullEntries) : fullEntries;
    if (fillPool.length > leveledEntries.length) {
      leveledEntries = pickLeveledSpellsSlotAware(
        fillPool,
        spellsPrepared,
        maxOnSheet,
        spellSlots,
        classLabel,
        combatPriority,
        pickOptions
      );
    }
  }
  leveledEntries = enforceSpellLevelCaps(leveledEntries, spellSlots, classLabel, spellsPrepared);
  if (wizardSchoolKey && schoolLookup) {
    leveledEntries = balanceWizardArcaneSchoolSpells(
      leveledEntries,
      fullEntries,
      wizardSchoolKey,
      spellsPrepared,
      schoolLookup.getSpellSchool,
      combatPriority,
      spellSlots,
      classLabel
    );
    leveledEntries = enforceSpellLevelCaps(leveledEntries, spellSlots, classLabel, spellsPrepared);
  }
  if (classLabel === "Chierico") {
    leveledEntries = ensureClericCureWoundsSpell(leveledEntries, fullEntries, maxOnSheet);
    leveledEntries = enforceSpellLevelCaps(leveledEntries, spellSlots, classLabel, spellsPrepared);
  }
  if (classLabel === "Paladino") {
    leveledEntries = ensurePaladinPunishmentSpell(leveledEntries, fullEntries, maxOnSheet);
    leveledEntries = enforceSpellLevelCaps(leveledEntries, spellSlots, classLabel, spellsPrepared);
  }
  if (classLabel === "Stregone") {
    leveledEntries = ensureSorcererMinLevel1Spells(
      leveledEntries,
      fullEntries,
      maxOnSheet,
      spellSlots,
      spellsPrepared,
      combatPriority,
      pickOptions
    );
    leveledEntries = enforceSpellLevelCaps(leveledEntries, spellSlots, classLabel, spellsPrepared);
  }
  return leveledEntries;
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

function pickCantripsPowerTier(
  entries: Array<{ name: string; level: number }>,
  count: number
): Array<{ name: string; level: number }> {
  if (count <= 0) return [];
  const pool = entries.filter((e) => e.level === 0);
  if (!pool.length) return [];
  const sorted = [...pool].sort((a, b) => {
    const ta = getSpellCombatTierScore(a.name);
    const tb = getSpellCombatTierScore(b.name);
    if (tb !== ta) return tb - ta;
    return a.name.localeCompare(b.name, "it");
  });
  const picked: Array<{ name: string; level: number }> = [];
  const seen = new Set<string>();
  for (const e of sorted) {
    if (picked.length >= count) break;
    const key = e.name.toLocaleLowerCase("it");
    if (seen.has(key)) continue;
    seen.add(key);
    picked.push(e);
  }
  return picked;
}

function pickLeveledSpellsPowerTier(
  entries: Array<{ name: string; level: number }>,
  count: number,
  maxLevel: number
): Array<{ name: string; level: number }> {
  if (count <= 0) return [];
  const pool = entries.filter((e) => e.level >= 1 && e.level <= maxLevel);
  if (!pool.length) return [];
  const sorted = [...pool].sort((a, b) => {
    const sa = getSpellCombatTierScore(a.name) * 100 + a.level;
    const sb = getSpellCombatTierScore(b.name) * 100 + b.level;
    if (sb !== sa) return sb - sa;
    if (b.level !== a.level) return b.level - a.level;
    return a.name.localeCompare(b.name, "it");
  });
  const picked: Array<{ name: string; level: number }> = [];
  const seen = new Set<string>();
  for (const e of sorted) {
    if (picked.length >= count) break;
    const key = `${e.level}:${e.name.toLocaleLowerCase("it")}`;
    if (seen.has(key)) continue;
    seen.add(key);
    picked.push(e);
  }
  return picked;
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

export function spellSelectionCount(classLabel: string, level: number, castingMod: number): number {
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
    /** Usato per variare in modo stabile lo stile di combattimento del Guerriero in scheda. */
    characterName?: string | null;
    /** Incantesimi scelti con priorità tier combat invece che casuali/bilanciati. */
    powerPlayer?: boolean;
    /** Solo incantesimi utili in combattimento (torneo). */
    torneoMode?: boolean;
    /** Scelte manuali del giocatore. */
    buildOverrides?: CharacterBuildOverrides;
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
      raceTraitsMd = stripSubraceSectionsFromRaceTraits(
        raceTraitsMd,
        raceDef.subraces.map((s) => s.sectionHeading)
      );
    }
    if (!raceTraitsMd.trim()) {
      raceTraitsMd = extractSectionByHeadingsMarkdown(md, [raceDef.label.toUpperCase()]);
    }
    raceTraitsMd = sanitizeRaceTraitsMarkdown(input.raceSlug, raceTraitsMd);
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
  if (!classFeaturesMd.trim() && input.classLabel === "Stregone") {
    const md = getManualMarkdownByFileName(PHB_MD_FILE).replace(/\r/g, "");
    const startMatch =
      /(?:^|\n)##\s+PRIVILEGI DI CLASSE\s*\n\s*Uno stregone ottiene i seguenti privilegi di classe\.\s*/i.exec(md) ??
      /(?:^|\n)##\s+PRIVILEGI DI CLASSE\s*\n\s*Un[o]?\s+stregone ottiene i seguenti privilegi di classe\.\s*/i.exec(md);
    if (startMatch?.index != null) {
      const fromStart = md.slice(startMatch.index);
      const stopMatch = /(?:^|\n)##\s+ORIGINE STREGONESCA\s*$/im.exec(fromStart);
      if (stopMatch?.index != null && stopMatch.index > 0) {
        classFeaturesMd = fromStart.slice(0, stopMatch.index).trim();
      }
    }
  }
  if (!classFeaturesMd.trim()) warnings.push("Privilegi di classe non trovati nel manuale sorgente.");
  if (input.classLabel === "Mago" && classFeaturesMd.trim()) {
    classFeaturesMd = stripOtherWizardArcaneSchoolSections(classFeaturesMd, input.classSubclass);
  }

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
  if (input.classLabel === "Mago" && subclassFeaturesMd?.trim()) {
    subclassFeaturesMd = stripOtherWizardArcaneSchoolSections(
      subclassFeaturesMd,
      input.classSubclass
    );
    if (!subclassFeaturesMd.trim()) {
      const schoolNorm = wizardArcaneSchoolSectionHeadingNorm(input.classSubclass);
      if (schoolNorm) warnings.push(`Privilegi scuola arcana non trovati per «${input.classSubclass}».`);
    }
  }

  let backgroundMd: string | null = null;
  if (bgDef) {
    const mdFile = bgDef.rulesSource?.markdownFile ?? PHB_MD_FILE;
    await preloadManualMarkdownFile(mdFile, requestOrigin);
    backgroundMd = extractSectionByHeadingsMarkdown(getManualMarkdownByFileName(mdFile), [bgDef.phbH1]) || null;
  }

  const tcWizard = getThirdCasterWizardSpellcasting(
    detectThirdCasterSubclass(input.classLabel, input.classSubclass),
    input.level
  );
  const wmBarbActive =
    detectWildMagicBarbarianPath(input.classLabel, input.classSubclass) && input.level >= 3;

  let spellcastingAbility: AbilityKey | null = SPELLCASTING_ABILITY_BY_CLASS[input.classLabel] ?? null;
  let spellSlots = slotsForClassLevel(classDef, input.level);
  let cantripsKnown = cantripsKnownForClass(input.classLabel, input.level);

  if (tcWizard) {
    spellcastingAbility = "int";
    spellSlots = spellSlotsRecordFromThirdCasterTiers(tcWizard.slotsTiers);
    cantripsKnown = tcWizard.cantripsKnown;
  }
  if (!tcWizard && spellcastingAbility === null && wmBarbActive) {
    spellcastingAbility = "con";
  }

  const castingMod = spellcastingAbility ? abilityModByKey[spellcastingAbility] : 0;

  let spellsPrepared = 0;
  if (tcWizard) {
    spellsPrepared = tcWizard.spellsKnown;
  } else if (spellcastingAbility && !wmBarbActive) {
    spellsPrepared = spellSelectionCount(input.classLabel, input.level, castingMod);
  }

  const spells: GeneratedSpell[] = [];
  const shouldLoadSpells =
    (cantripsKnown > 0 || spellsPrepared > 0) && (!!tcWizard || !!classDef?.spellList);

  if (shouldLoadSpells) {
    let listRaw = "";
    if (tcWizard) {
      await preloadPhbMarkdown(requestOrigin);
      const mdPhb = getManualMarkdownByFileName(PHB_MD_FILE);
      listRaw = extractSectionByHeadingsMarkdown(mdPhb, ["INCANTESIMI DA MAGO"]) ?? "";
    } else if (classDef?.spellList) {
      const mdFile = classDef.supplementRulesSource?.markdownFile ?? PHB_MD_FILE;
      await preloadManualMarkdownFile(mdFile, requestOrigin);
      const md = getManualMarkdownByFileName(mdFile);
      listRaw =
        classDef.spellList.style === "h1"
          ? extractSectionByHeadingsMarkdown(md, [classDef.spellList.chapter]) ?? ""
          : extractSectionByHeadingsMarkdown(md, [classDef.spellList.sectionHeading]) ?? "";
    }

    const maxOnSheet = tcWizard ? tcWizard.maxSpellLevelOnList : maxSpellLevelOnSheet(classDef, input.level);
    const listByLevel = extractSpellListByMaxLevel(listRaw, maxOnSheet);
    const entries = parseSpellsWithLevelFromList(listByLevel);
    const torneoCombatPool = input.torneoMode ? filterTorneoCombatSpells(entries) : entries;
    const spellPool = torneoCombatPool.length ? torneoCombatPool : entries;
    const combatPriority = !!input.powerPlayer || !!input.torneoMode;
    const overrides = input.buildOverrides;

    let cantripEntries: Array<{ name: string; level: number }>;
    let leveledEntries: Array<{ name: string; level: number }>;

    if (overrides?.cantrips?.length || overrides?.spells?.length) {
      cantripEntries = overrides.cantrips?.length
        ? resolveSpellEntriesByNames(entries, overrides.cantrips, 0).slice(0, cantripsKnown)
        : pickDefaultCantrips(
            entries,
            cantripsKnown,
            !!input.torneoMode,
            combatPriority,
            input.classLabel,
            input.classSubclass
          );
      leveledEntries = overrides.spells?.length
        ? resolveSpellEntriesByNames(entries, overrides.spells, 1).slice(0, spellsPrepared)
        : pickDefaultLeveledSpells(
            spellPool,
            entries,
            spellsPrepared,
            maxOnSheet,
            spellSlots,
            input.classLabel,
            combatPriority,
            input.torneoMode,
            input.classSubclass
          );
      leveledEntries = enforceSpellLevelCaps(
        leveledEntries,
        spellSlots,
        input.classLabel,
        spellsPrepared
      );
    } else {
      cantripEntries = pickDefaultCantrips(
        entries,
        cantripsKnown,
        !!input.torneoMode,
        combatPriority,
        input.classLabel,
        input.classSubclass
      );
      leveledEntries = pickDefaultLeveledSpells(
        spellPool,
        entries,
        spellsPrepared,
        maxOnSheet,
        spellSlots,
        input.classLabel,
        combatPriority,
        input.torneoMode,
        input.classSubclass
      );
    }

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
        fullTextMd: mdSpell ? cleanRulesExcerpt(mdSpell) : null,
      });
    }
  }

  let filteredClassMd = filterClassFeaturesByLevel(classFeaturesMd, input.level);
  if (input.classLabel === "Stregone") {
    const spLine = sorceryPointsClassFeatureLine(input.level);
    if (spLine) filteredClassMd = [spLine, filteredClassMd].filter(Boolean).join("\n\n");
  }
  if (input.classLabel === "Monaco") {
    const kiLine = kiPointsClassFeatureLine(input.level);
    if (kiLine) filteredClassMd = [kiLine, filteredClassMd].filter(Boolean).join("\n\n");
  }
  if (input.classLabel === "Ladro") {
    const saLine = sneakAttackClassFeatureLine(input.level);
    if (saLine) filteredClassMd = [saLine, filteredClassMd].filter(Boolean).join("\n\n");
  }
  if (input.classLabel === "Ranger") {
    filteredClassMd = injectRangerPrescelteChoices(
      filteredClassMd,
      fightingStyleSheetSeed(input),
      input.level,
      {
        favoredEnemies: input.buildOverrides?.favoredEnemies,
        favoredTerrains: input.buildOverrides?.favoredTerrains,
      }
    );
  }
  if (CLASSES_WITH_PHB_FIGHTING_STYLE_COLLAPSE.has(input.classLabel)) {
    filteredClassMd = collapsePhbFightingStyleOptions(
      filteredClassMd,
      fightingStyleSheetSeed(input),
      input.buildOverrides?.fightingStyle
    );
  }
  if (input.classLabel === "Warlock") {
    const warlockExtras = buildWarlockPactAndInvocationsMarkdown({
      level: input.level,
      seed: warlockBuildSeed(input),
      pactName: input.buildOverrides?.warlockPact,
      invocationNames: input.buildOverrides?.warlockInvocations,
    });
    if (warlockExtras) {
      filteredClassMd = [filteredClassMd, warlockExtras].filter(Boolean).join("\n\n");
    }
  }

  return {
    raceTraitsMd: normalizeMarkdownTables(cleanRulesExcerpt(stripOptionalHumanTraits(raceTraitsMd))),
    subraceTraitsMd: subraceTraitsMd ? normalizeMarkdownTables(cleanRulesExcerpt(subraceTraitsMd)) : null,
    classFeaturesMd: normalizeMarkdownTables(filteredClassMd),
    subclassFeaturesMd: subclassFeaturesMd
      ? normalizeMarkdownTables(
          cleanRulesExcerpt(
            filterClassFeaturesByLevel(
              input.classLabel === "Warlock"
                ? trimWarlockPatronSubclassMarkdown(subclassFeaturesMd)
                : subclassFeaturesMd,
              input.level
            )
          )
        )
      : null,
    backgroundMd: backgroundMd
      ? collapseRandomDiceTablesInBackgroundMarkdown(
          normalizeMarkdownTables(cleanRulesExcerpt(backgroundMd))
        )
      : null,
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
