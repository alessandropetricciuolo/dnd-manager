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
import { sanitizeRaceTraitsMarkdown } from "@/lib/race-traits-sanitizer";
import { extractClassPrivilegesMarkdown } from "@/lib/server/phb-class-privileges-excerpt";
import {
  extractPhbSpellMarkdown,
  getManualMarkdownByFileName,
  preloadManualMarkdownFile,
  preloadPhbMarkdown,
} from "@/lib/server/phb-spell-excerpt";
import { collapseRandomDiceTablesInBackgroundMarkdown } from "@/lib/sheet-generator/background-dice-table-roll";
import {
  pickCantripsForSheet,
  pickLeveledSpellsSlotAware,
} from "@/lib/sheet-generator/spell-slot-picker";
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
} from "@/lib/sheet-generator/wizard-arcane-school";
import { enforceSpellLevelCaps, type SpellPickOptions } from "@/lib/sheet-generator/spell-slot-picker";

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
function collapsePhbFightingStyleOptions(md: string, seed: string): string {
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

  const pick = stableHashNonNegative(`${seed}|phb-stile-combattimento`) % styleIndices.length;
  const chosenIdx = styleIndices[pick];
  const chosen = sections[chosenIdx];

  const mergedIntro =
    `${sections[stileIdx].body}\n\n### ${chosen.headingRaw}\n\n${chosen.body}`.trim();

  const nextSections = sections.filter((_, idx) => idx !== chosenIdx && !styleIndices.includes(idx));
  const mergedStileIdx = nextSections.findIndex((s) => s.headingNorm === STILE_DI_COMBATTIMENTO_HEADING_NORM);
  if (mergedStileIdx >= 0) nextSections[mergedStileIdx] = { ...nextSections[mergedStileIdx], body: mergedIntro };

  return joinMarkdownH3Sections(nextSections);
}

function fightingStyleSheetSeed(input: {
  characterName?: string | null;
  classLabel: string;
  raceSlug: string;
  subraceSlug: string | null;
  backgroundSlug: string;
  classSubclass: string | null;
  level: number;
}): string {
  return [
    input.classLabel,
    input.characterName?.trim() ?? "",
    input.raceSlug,
    input.subraceSlug ?? "",
    input.backgroundSlug,
    input.classSubclass ?? "",
    String(input.level),
  ].join("|");
}

function warlockBuildSeed(input: {
  characterName?: string | null;
  raceSlug: string;
  subraceSlug: string | null;
  backgroundSlug: string;
  classSubclass: string | null;
  level: number;
}): string {
  return [
    "Warlock",
    input.characterName?.trim() ?? "",
    input.raceSlug,
    input.subraceSlug ?? "",
    input.backgroundSlug,
    input.classSubclass ?? "",
    String(input.level),
  ].join("|");
}

type WarlockPactOption = {
  name: string;
  summary: string;
};

type WarlockInvocationOption = {
  name: string;
  summary: string;
  minLevel?: number;
  requiresPact?: "Patto della Catena" | "Patto della Lama" | "Patto del Tomo";
};

const WARLOCK_PACT_OPTIONS: WarlockPactOption[] = [
  {
    name: "Patto della Catena",
    summary: "Ottieni l'incantesimo Trova Famiglio e puoi evocare un famiglio speciale più potente.",
  },
  {
    name: "Patto della Lama",
    summary: "Puoi evocare un'arma del patto magica e usarla come focus per i tuoi poteri da warlock.",
  },
  {
    name: "Patto del Tomo",
    summary: "Ricevi il Libro delle Ombre con trucchetti aggiuntivi scelti da qualsiasi lista di classe.",
  },
];

const WARLOCK_INVOCATION_OPTIONS: WarlockInvocationOption[] = [
  {
    name: "Deflagrazione Agonizzante",
    summary: "Aggiungi il modificatore di Carisma ai danni di Deflagrazione Occulta.",
  },
  {
    name: "Armatura delle Ombre",
    summary: "Puoi lanciare Armatura Magica su te stesso a volontà, senza spendere slot.",
  },
  {
    name: "Vista del Diavolo",
    summary: "Vedi normalmente nel buio, inclusa l'oscurità magica, entro 36 metri.",
  },
  {
    name: "Deflagrazione Respingente",
    summary: "Quando colpisci con Deflagrazione Occulta, puoi spingere il bersaglio di 3 metri.",
  },
  {
    name: "Lancia della Letargia",
    summary: "Una volta per turno riduci la velocità di un bersaglio colpito da Deflagrazione Occulta.",
  },
  {
    name: "Maschera dei Molti Volti",
    summary: "Puoi lanciare Camuffare Se Stesso a volontà, senza spendere slot.",
  },
  {
    name: "Sussurri dalla Tomba",
    summary: "Puoi lanciare Parlare con i Morti a volontà, senza spendere slot.",
  },
  {
    name: "Vista dell'Occulto",
    summary: "Puoi lanciare Individuazione del Magico a volontà, senza spendere slot.",
  },
  {
    name: "Libro degli Antichi Segreti",
    summary: "Aggiungi rituali al tuo Libro delle Ombre e li lanci come rituali.",
    requiresPact: "Patto del Tomo",
  },
  {
    name: "Voce del Signore delle Catene",
    summary: "Percepisci attraverso i sensi del famiglio e puoi parlarne tramite lui.",
    requiresPact: "Patto della Catena",
  },
  {
    name: "Lama Assetata",
    summary: "Attacchi due volte quando usi l'azione Attacco con l'arma del patto.",
    minLevel: 5,
    requiresPact: "Patto della Lama",
  },
  {
    name: "Catene di Carceri",
    summary: "Puoi lanciare Blocca Mostri su celestiali, immondi ed elementali.",
    minLevel: 15,
    requiresPact: "Patto della Catena",
  },
  {
    name: "Maestro di Mille Forme",
    summary: "Puoi lanciare Alterare Se Stesso a volontà, senza spendere slot.",
    minLevel: 15,
  },
  {
    name: "Sguardo delle Due Menti",
    summary: "Puoi percepire il mondo attraverso i sensi di una creatura consenziente.",
  },
];

function warlockInvocationsKnown(level: number): number {
  const lvl = Math.max(1, Math.min(20, level));
  if (lvl < 2) return 0;
  if (lvl < 5) return 2;
  if (lvl < 7) return 3;
  if (lvl < 9) return 4;
  if (lvl < 12) return 5;
  if (lvl < 15) return 6;
  if (lvl < 18) return 7;
  return 8;
}

function pickDeterministic<T>(items: T[], seed: string): T | null {
  if (!items.length) return null;
  const idx = stableHashNonNegative(seed) % items.length;
  return items[idx] ?? null;
}

function pickDeterministicMany<T>(items: T[], count: number, seed: string): T[] {
  if (count <= 0 || !items.length) return [];
  const out: T[] = [];
  const start = stableHashNonNegative(seed) % items.length;
  for (let i = 0; i < items.length && out.length < count; i += 1) {
    const idx = (start + i) % items.length;
    out.push(items[idx]);
  }
  return out;
}

function buildWarlockPactAndInvocationsMarkdown(input: {
  level: number;
  seed: string;
}): string {
  const sections: string[] = [];
  const pact = pickDeterministic(WARLOCK_PACT_OPTIONS, `${input.seed}|pact`);
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
    const available = WARLOCK_INVOCATION_OPTIONS.filter((opt) => {
      if ((opt.minLevel ?? 1) > effectiveLevel) return false;
      if (opt.requiresPact && opt.requiresPact !== pact?.name) return false;
      return true;
    });
    const picked = pickDeterministicMany(available, targetCount, `${input.seed}|invocations`);
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

const CLASSES_WITH_PHB_FIGHTING_STYLE_COLLAPSE = new Set(["Guerriero", "Paladino"]);

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
    /** Usato per variare in modo stabile lo stile di combattimento del Guerriero in scheda. */
    characterName?: string | null;
    /** Incantesimi scelti con priorità tier combat invece che casuali/bilanciati. */
    powerPlayer?: boolean;
    /** Solo incantesimi utili in combattimento (torneo). */
    torneoMode?: boolean;
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
    const wizardSchoolKey =
      input.classLabel === "Mago" ? parseWizardArcaneSchoolKey(input.classSubclass) : null;
    const schoolLookup = wizardSchoolKey ? createSpellSchoolLookup() : null;
    const pickOptions: SpellPickOptions | undefined =
      wizardSchoolKey && schoolLookup
        ? { wizardSchoolKey, getSpellSchool: schoolLookup.getSpellSchool }
        : undefined;

    const cantripEntries = pickCantripsForSheet(
      entries,
      cantripsKnown,
      !!input.torneoMode,
      combatPriority,
      pickOptions
    );
    let leveledEntries = pickLeveledSpellsSlotAware(
      spellPool,
      spellsPrepared,
      maxOnSheet,
      spellSlots,
      input.classLabel,
      combatPriority,
      pickOptions
    );
    if (leveledEntries.length < spellsPrepared) {
      const fillPool = input.torneoMode ? filterTorneoCombatSpells(entries) : entries;
      if (fillPool.length > leveledEntries.length) {
        leveledEntries = pickLeveledSpellsSlotAware(
          fillPool,
          spellsPrepared,
          maxOnSheet,
          spellSlots,
          input.classLabel,
          combatPriority,
          pickOptions
        );
      }
    }
    leveledEntries = enforceSpellLevelCaps(
      leveledEntries,
      spellSlots,
      input.classLabel,
      spellsPrepared
    );
    if (wizardSchoolKey && schoolLookup) {
      leveledEntries = balanceWizardArcaneSchoolSpells(
        leveledEntries,
        entries,
        wizardSchoolKey,
        spellsPrepared,
        schoolLookup.getSpellSchool,
        combatPriority,
        spellSlots,
        input.classLabel
      );
      leveledEntries = enforceSpellLevelCaps(
        leveledEntries,
        spellSlots,
        input.classLabel,
        spellsPrepared
      );
    }
    if (input.classLabel === "Paladino") {
      leveledEntries = ensurePaladinPunishmentSpell(leveledEntries, entries, maxOnSheet);
      leveledEntries = enforceSpellLevelCaps(
        leveledEntries,
        spellSlots,
        input.classLabel,
        spellsPrepared
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
  if (CLASSES_WITH_PHB_FIGHTING_STYLE_COLLAPSE.has(input.classLabel)) {
    filteredClassMd = collapsePhbFightingStyleOptions(filteredClassMd, fightingStyleSheetSeed(input));
  }
  if (input.classLabel === "Warlock") {
    const warlockExtras = buildWarlockPactAndInvocationsMarkdown({
      level: input.level,
      seed: warlockBuildSeed(input),
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
