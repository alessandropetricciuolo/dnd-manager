import type { GeneratedCharacterSheet, SkillKey } from "@/lib/sheet-generator/types";
import { kiPointsClassFeatureLine } from "@/lib/sheet-generator/monk-meta";
import { sneakAttackClassFeatureLine } from "@/lib/sheet-generator/rogue-meta";
import { summarizeRangerPrescelteFromBody } from "@/lib/sheet-generator/ranger-meta";
import { sorceryPointsClassFeatureLine } from "@/lib/sheet-generator/sorcerer-meta";

function fmt(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

/** Inventario PDF: spazio ridotto — elenco sintetico con limite caratteri. */
function formatInventoryForPdf(lines: string[], maxChars = 420): string {
  const cleaned = lines.map((s) => s.replace(/\s+/g, " ").trim()).filter(Boolean);
  if (!cleaned.length) return "";
  let text = cleaned.map((s) => `• ${s}`).join("\n");
  if (text.length <= maxChars) return text;
  text = cleaned.join("; ");
  if (text.length <= maxChars) return text;
  const cut = text.slice(0, maxChars - 1).trimEnd();
  const lastSemi = cut.lastIndexOf("; ");
  const base = lastSemi > maxChars * 0.55 ? cut.slice(0, lastSemi) : cut;
  return `${base}…`;
}

function compactPdfText(md: string, maxLen: number): string {
  const cleaned = md
    .replace(/\r/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (cleaned.length <= maxLen) return cleaned;
  const cut = cleaned.slice(0, maxLen);
  const lastBreak = Math.max(cut.lastIndexOf("\n"), cut.lastIndexOf(". "), cut.lastIndexOf("; "), cut.lastIndexOf(", "));
  const out = (lastBreak > Math.floor(maxLen * 0.65) ? cut.slice(0, lastBreak + 1) : cut).trim();
  return `${out.replace(/[;,:.\s]+$/g, "")}…`;
}

function extractUnlockLevel(text: string): number | null {
  const t = text.replace(/\r/g, "");
  const patterns = [
    /\ba partire dal\s+(\d+)[°º]?\s+livello\b/i,
    /\bal\s+(\d+)[°º]?\s+livello\b/i,
    /\bquando arriva al\s+(\d+)[°º]?\s+livello\b/i,
    /\barriva al\s+(\d+)[°º]?\s+livello\b/i,
    /\b(\d+)[°º]?\s+livello\b/i,
  ];
  for (const p of patterns) {
    const m = t.match(p);
    if (!m) continue;
    const n = Number.parseInt(m[1], 10);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function toPlainSentence(text: string): string {
  return text
    .replace(/\r/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function summarizeFeatureBlock(body: string, maxLen = 150): string {
  const plain = toPlainSentence(body);
  if (!plain) return "";
  const first = plain.split(/(?<=[.!?])\s+/)[0] ?? plain;
  if (first.length <= maxLen) return first;
  const cut = first.slice(0, maxLen);
  const lastBreak = Math.max(cut.lastIndexOf(" "), cut.lastIndexOf(","), cut.lastIndexOf(";"));
  const out = (lastBreak > Math.floor(maxLen * 0.7) ? cut.slice(0, lastBreak) : cut).trim();
  return `${out}…`;
}

function summarizeWarlockSelection(heading: string, body: string): string {
  const headingNorm = normalizeHeading(heading);
  const txt = body.replace(/\r/g, "");
  if (headingNorm === "DONO DEL PATTO") {
    const pick = txt.match(/Scelta:\s*\*\*([^*]+)\*\*/i)?.[1]?.trim();
    if (pick) return `Scelto: ${pick}.`;
  }
  if (headingNorm === "SUPPLICHE OCCULTE") {
    const picks = Array.from(txt.matchAll(/-\s+\*\*([^*]+)\*\*:/g)).map((m) => (m[1] ?? "").trim()).filter(Boolean);
    if (picks.length > 0) return `Scelte: ${picks.join(", ")}.`;
  }
  return summarizeFeatureBlock(body);
}

function normalizeHeading(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

/** Tratti razziali descrittivi (non meccanici) da escludere dal PDF. */
const RACIAL_FLAVOR_ONLY_HEADINGS = new Set([
  "ETA",
  "ALLINEAMENTO",
  "NOMI",
  "NOMI GNOMESCHI",
  "SOTTORAZZE",
]);

function isPdfTemplateGarbage(heading: string, body: string): boolean {
  const h = normalizeHeading(heading);
  const b = toPlainSentence(body);
  if (!h && !b) return true;
  if (/TM\s*&\s*©|WIZARDS OF THE COAST/i.test(b)) return true;
  if (/\[_{2,}\]|\[ \]/.test(body)) return true;
  if (/^\d+\s*TRUCCHETTI$/i.test(h)) return true;
  if (
    /^(TESORO|ALLEATI|ORGANIZZAZIONI|PRIVILEGI|TRATTI|ATTACCHI|INCANTESIMI|ALTRE COMPETENZE|APPENDICE|ZOMBI|NON MORTO)$/i.test(
      h
    )
  ) {
    return true;
  }
  if (/PREPARATEVI|AFFRONTA LA PROSSIMA|LETTERA\s+[A-Z]\s+MINIATA|ISPIRAZIONE PER TUTTE/i.test(h)) return true;
  if (/PUNTI FERITA ATTUALI|TS CONTRO MORTE|BONUS ATT\./i.test(b)) return true;
  return false;
}

function parseBoldRaceTraits(md: string): Array<{ heading: string; body: string }> {
  const txt = md.replace(/\r/g, "");
  const traits: Array<{ heading: string; body: string }> = [];
  const re = /\*{2,3}([^*]+?)\.\*{2,3}\s*([\s\S]*?)(?=\n\s*\*{2,3}[^*]+?\.\*{2,3}|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(txt)) !== null) {
    const heading = (m[1] ?? "").trim();
    const body = (m[2] ?? "").trim();
    if (!heading || !body) continue;
    traits.push({ heading, body });
  }
  return traits;
}

function isMechanicalRaceTrait(heading: string, body: string): boolean {
  const h = normalizeHeading(heading);
  if (RACIAL_FLAVOR_ONLY_HEADINGS.has(h)) return false;
  if (/INCREMENTO.*PUNTEGGI|INCREMENTO DEI PUNTEGGI/i.test(h)) return true;
  if (
    /^(TAGLIA|VELOCITA|SCUROVISIONE|ASTUZIA|LINGUAGGI|RESISTENZA|COMPETENZA|ARMA NATURALE|ARMA FISSA|SUBRACE|TRATTI DEL)/i.test(
      h
    ) ||
    /\b(TAGLIA|VELOCITA|SCUROVISIONE|ASTUZIA GNOMESCA|LINGUAGGI)\b/i.test(h)
  ) {
    return true;
  }
  const b = toPlainSentence(body);
  return /\b(aumenta di|incremento|vantaggio|svantaggio|resistenza|immunit|metri|taglia\s+(piccola|media|grande)|velocita|competenza|tiro salvezza|punteggio di)\b/i.test(
    b
  );
}

function pickMechanicSentence(text: string): string {
  const plain = toPlainSentence(text)
    .replace(/[“”"]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!plain) return "";
  const sentences = plain.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  const keyword = /\b(puo|ottiene|incremento|aumenta|vantaggio|svantaggio|resistenza|immunit|competenza|velocita|scurovisione|taglia|linguaggi|pf|punti ferita|tiro salvezza|attacco|danni)\b/i;
  const best = sentences.find((s) => keyword.test(s) && s.length > 24 && s.length < 220);
  if (best) return best;
  return sentences[0] ?? plain;
}

function isSpellLikeFeatureBlock(heading: string, body: string): boolean {
  const h = normalizeHeading(heading);
  const b = toPlainSentence(body);
  if (!b) return false;
  if (/^\d+\s*LIVELLO$/.test(h)) return true;
  if (h === "LIVELLO INC MO") return true;
  if (
    /\btempo di lancio\b/i.test(b) ||
    /\bgittata\b/i.test(b) ||
    /\bcomponenti\b/i.test(b) ||
    /\bdurata\b/i.test(b)
  ) {
    return true;
  }
  if (
    /\btrucchetto\b/i.test(b) ||
    /\bdi [1-9]° livello\b/i.test(b) ||
    /\bslot totali\b/i.test(b) ||
    /\bslot spesi\b/i.test(b)
  ) {
    return true;
  }
  if (h === "SUPPLICHE OCCULTE" && /\bprerequisit/i.test(b) && !/suppliche selezionate/i.test(b)) return true;
  return false;
}

/** Opzioni stile di combattimento PHB: non sono privilegi separati in Features_Main. */
const PHB_FIGHTING_STYLE_OPTION_HEADINGS = new Set([
  "COMBATTERE CON ARMI POSSENTI",
  "COMBATTERE CON DUE ARMI",
  "DIFESA",
  "DUELLARE",
  "PROTEZIONE",
  "TIRO",
]);

const WARLOCK_OMIT_CLASS_HEADINGS = new Set([
  "PATRONO ULTRATERRENO",
  "MAGIA DEL PATTO",
  "IL VINCOLO DEL PATTO",
]);

const WARLOCK_PATRON_INTRO_HEADINGS = new Set([
  "IL GRANDE ANTICO",
  "GRANDE ANTICO",
  "IL SIGNORE FATATO",
  "SIGNORE FATATO",
  "L IMMONDO",
  "IMMOND",
]);

function isWarlockGeneratedSelectionBlock(headingNorm: string): boolean {
  return headingNorm === "DONO DEL PATTO" || headingNorm === "SUPPLICHE OCCULTE";
}

function isWarlockPatronPrivilegeBlock(heading: string, body: string): boolean {
  const h = normalizeHeading(heading);
  if (WARLOCK_PATRON_INTRO_HEADINGS.has(h)) return false;
  if (/^LISTA AMPLIATA|^INCANTESIMI AMPLIATI/.test(h)) return false;
  if (h === "SUPPLICHE OCCULTE") return false;
  return /\b(a partire dal|al\s+\d+[°º]?\s+livello|quando raggiunge il)\b/i.test(body);
}

function isWarlockInvocationCatalogEntry(heading: string, body: string): boolean {
  const h = normalizeHeading(heading);
  if (isWarlockGeneratedSelectionBlock(h)) return false;
  if (isWarlockPatronPrivilegeBlock(heading, body)) return false;
  const b = body.replace(/\r/g, "").trim();
  if (!b) return true;
  if (/\*prerequisit/i.test(b) && !/\bsuppliche selezionate\b/i.test(b)) return true;
  if (/^Il warlock pu[oò]\s+lanciare/i.test(b) && !/\ba partire dal\b/i.test(b)) return true;
  return false;
}

function summarizeWarlockClassFeaturesForPdf(
  classMd: string,
  subclassMd: string | null | undefined,
  level: number,
  maxLen: number
): string {
  const source = [classMd, subclassMd ?? ""].filter(Boolean).join("\n\n").trim();
  if (!source) return "";
  const lines = source.split("\n");
  const blocks: Array<{ heading: string; body: string; unlock: number | null; order: number }> = [];
  let currentHeading: string | null = null;
  let currentBody: string[] = [];
  let idx = 0;
  const flush = () => {
    if (!currentHeading) return;
    const body = currentBody.join("\n").trim();
    if (!body) {
      currentHeading = null;
      currentBody = [];
      return;
    }
    const unlock = extractUnlockLevel(`${currentHeading}\n${body}`);
    if (unlock && unlock > level) {
      currentHeading = null;
      currentBody = [];
      return;
    }
    blocks.push({ heading: currentHeading, body, unlock, order: idx++ });
    currentHeading = null;
    currentBody = [];
  };
  for (const line of lines) {
    const h = line.match(/^#{1,3}\s+(.+?)\s*$/);
    if (h) {
      flush();
      currentHeading = h[1].trim();
      continue;
    }
    if (currentHeading) currentBody.push(line);
  }
  flush();

  const out: string[] = [];
  for (const b of blocks) {
    const headingNorm = normalizeHeading(b.heading);
    if (WARLOCK_OMIT_CLASS_HEADINGS.has(headingNorm)) continue;
    if (WARLOCK_PATRON_INTRO_HEADINGS.has(headingNorm)) continue;
    if (/^LISTA AMPLIATA|^INCANTESIMI AMPLIATI/.test(headingNorm)) continue;
    if (isSpellLikeFeatureBlock(b.heading, b.body)) continue;
    if (isPdfTemplateGarbage(b.heading, b.body)) continue;
    if (isWarlockInvocationCatalogEntry(b.heading, b.body)) continue;

    if (isWarlockGeneratedSelectionBlock(headingNorm)) {
      const summary = summarizeWarlockSelection(b.heading, b.body);
      if (!summary) continue;
      out.push(`• ${b.unlock ? `[Lv ${b.unlock}] ` : ""}${b.heading}: ${summary}`);
      continue;
    }

    if (!isWarlockPatronPrivilegeBlock(b.heading, b.body)) continue;
    const summary = summarizeFeatureBlock(b.body, 180);
    if (!summary) continue;
    out.push(`• ${b.unlock ? `[Lv ${b.unlock}] ` : ""}${b.heading}: ${summary}`);
  }

  return compactPdfText(out.join("\n"), maxLen);
}

export function raceTraitsForQuickManual(raceMd: string, subraceMd: string, maxLen = 4_000): string {
  return summarizeRaceTraitsForPdf(raceMd, subraceMd, maxLen);
}

function summarizeClassFeaturesForPdf(classMd: string, subclassMd: string | null | undefined, level: number, maxLen: number): string {
  const classOnly = (classMd ?? "").trim();
  const isWarlockSheet =
    /###\s+Dono del Patto/i.test(classOnly) && /###\s+Suppliche Occulte/i.test(classOnly);
  if (isWarlockSheet) {
    return summarizeWarlockClassFeaturesForPdf(classOnly, subclassMd, level, maxLen);
  }
  const source = [classOnly, subclassMd ?? ""].filter(Boolean).join("\n\n").trim();
  if (!source) return "";
  const lines = source.split("\n");
  const blocks: Array<{ heading: string; body: string; unlock: number | null; order: number }> = [];
  let currentHeading: string | null = null;
  let currentBody: string[] = [];
  let idx = 0;
  const flush = () => {
    if (!currentHeading) return;
    const body = currentBody.join("\n").trim();
    if (!body) {
      currentHeading = null;
      currentBody = [];
      return;
    }
    const unlock = extractUnlockLevel(`${currentHeading}\n${body}`);
    if (unlock && unlock > level) {
      currentHeading = null;
      currentBody = [];
      return;
    }
    blocks.push({ heading: currentHeading, body, unlock, order: idx++ });
    currentHeading = null;
    currentBody = [];
  };
  for (const line of lines) {
    const h = line.match(/^#{1,3}\s+(.+?)\s*$/);
    if (h) {
      flush();
      currentHeading = h[1].trim();
      continue;
    }
    if (currentHeading) currentBody.push(line);
  }
  flush();
  if (!blocks.length) return compactPdfText(source, maxLen);

  const prioritized = [...blocks].sort((a, b) => {
    const aScore = a.unlock ?? -1;
    const bScore = b.unlock ?? -1;
    if (aScore !== bScore) return bScore - aScore;
    return b.order - a.order;
  });

  const out: string[] = [];
  const spLine = sorceryPointsClassFeatureLine(level);
  if (spLine && /stregone/i.test(classOnly)) out.push(spLine);
  const kiLine = kiPointsClassFeatureLine(level);
  if (kiLine && /monaco/i.test(classOnly)) out.push(kiLine);
  const saLine = sneakAttackClassFeatureLine(level);
  if (saLine && /ladro/i.test(classOnly)) out.push(saLine);
  for (const b of prioritized) {
    const headingNorm = normalizeHeading(b.heading);
    if (PHB_FIGHTING_STYLE_OPTION_HEADINGS.has(headingNorm)) continue;
    if (isSpellLikeFeatureBlock(b.heading, b.body)) continue;
    if (isPdfTemplateGarbage(b.heading, b.body)) continue;
    const rangerChoice = summarizeRangerPrescelteFromBody(b.body);
    if (
      (headingNorm === "NEMICO PRESCELTO" || headingNorm === "ESPLORATORE NATO") &&
      rangerChoice
    ) {
      out.push(`• ${b.unlock ? `[Lv ${b.unlock}] ` : ""}${b.heading}: ${rangerChoice}`);
      continue;
    }
    const summary = summarizeFeatureBlock(b.body);
    if (!summary) continue;
    out.push(`• ${b.unlock ? `[Lv ${b.unlock}] ` : ""}${b.heading}: ${summary}`);
  }
  return compactPdfText(out.join("\n"), maxLen);
}

function summarizeRaceTraitsForPdf(raceMd: string, subraceMd: string, maxLen: number): string {
  const merged = mergeRaceTraits(raceMd, subraceMd).trim();
  if (!merged) return "";
  const txt = merged
    .replace(/\r/g, "")
    .replace(/^\s*>\s*.*$/gm, "")
    .replace(/^Un personaggio\s+\w+\s+possiede[\s\S]*?(?=\n\s*\*{2,3}|\n\s*#{1,6})/im, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const skipSectionHeadings = new Set([
    "TRATTI DEI MEZZORCHI",
    "TRATTI DEGLI GNOMI",
    "TRATTI RAZZIALI",
    "TRATTI",
    "TRATTI DEL GENASI DELL ACQUA",
  ]);

  const bullets: string[] = [];
  const seen = new Set<string>();

  const addTrait = (heading: string, body: string) => {
    if (!isMechanicalRaceTrait(heading, body)) return;
    const summary = summarizeFeatureBlock(pickMechanicSentence(body), 140);
    if (!summary) return;
    const hn = normalizeHeading(heading);
    if (seen.has(hn)) return;
    seen.add(hn);
    bullets.push(`• ${heading.replace(/[.:]+$/g, "")}: ${summary}`);
  };

  for (const t of parseBoldRaceTraits(txt)) {
    addTrait(t.heading, t.body);
  }

  const lines = txt.split("\n");
  let sectionHeading: string | null = null;
  let sectionBody: string[] = [];
  const flushSection = () => {
    if (!sectionHeading) return;
    const hn = normalizeHeading(sectionHeading);
    if (!skipSectionHeadings.has(hn)) {
      addTrait(sectionHeading, sectionBody.join("\n"));
    }
    sectionHeading = null;
    sectionBody = [];
  };
  for (const line of lines) {
    const h = line.match(/^#{1,6}\s+(.+?)\s*$/);
    if (h) {
      flushSection();
      sectionHeading = h[1].trim();
      continue;
    }
    if (sectionHeading) sectionBody.push(line);
  }
  flushSection();

  if (!bullets.length) return "";
  return compactPdfText(bullets.join("\n"), maxLen);
}

function mergeRaceTraits(raceMd: string, subraceMd: string): string {
  const race = raceMd.trim();
  const subrace = subraceMd.trim();
  if (!race) return subrace;
  if (!subrace) return race;
  const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
  const raceParas = race.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const seen = new Set(raceParas.map((p) => norm(p)));
  const uniqueSubrace = subrace
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && !seen.has(norm(p)));
  return [race, ...uniqueSubrace].join("\n\n");
}

const SKILL_TO_FIELD: Record<SkillKey, string> = {
  acrobatics: "ACRO",
  animal_handling: "ANIM",
  arcana: "ARC",
  athletics: "ATH",
  deception: "DEC",
  history: "HIST",
  insight: "INS",
  intimidation: "INTI",
  investigation: "INV",
  medicine: "MED",
  nature: "NAT",
  perception: "PERC",
  performance: "PERF",
  persuasion: "PERS",
  religion: "REL",
  sleight_of_hand: "SLE",
  stealth: "STLTH",
  survival: "SURV",
};

export function mapGeneratedSheetToPdfFields(sheet: GeneratedCharacterSheet): Record<string, unknown> {
  const fields: Record<string, unknown> = {
    ClassFilename: "Base",
    CharacterName: sheet.characterName,
    Race: sheet.subraceLabel ? `${sheet.raceLabel} (${sheet.subraceLabel})` : sheet.raceLabel,
    ClassLevel: `${sheet.classLabel} ${sheet.level}`.trim(),
    Subclass: sheet.classSubclass ?? "",
    Background: sheet.backgroundLabel,
    Alignment: sheet.alignment ?? "",
    Age: sheet.age ?? "",
    Height: sheet.height ?? "",
    Weight: sheet.weight ?? "",
    Sex: sheet.sex ?? "",
    STR: String(sheet.abilities.str),
    STRmod: fmt(sheet.abilityMods.str),
    DEX: String(sheet.abilities.dex),
    DEXmod: fmt(sheet.abilityMods.dex),
    CON: String(sheet.abilities.con),
    CONmod: fmt(sheet.abilityMods.con),
    INT: String(sheet.abilities.int),
    INTmod: fmt(sheet.abilityMods.int),
    WIS: String(sheet.abilities.wis),
    WISmod: fmt(sheet.abilityMods.wis),
    CHA: String(sheet.abilities.cha),
    CHAmod: fmt(sheet.abilityMods.cha),
    ProfBonus: fmt(sheet.proficiencyBonus),
    Passive: String(sheet.passivePerception),
    AC: String(sheet.armorClass),
    Initiative: fmt(sheet.initiative),
    Speed: sheet.speed,
    HPMax: String(sheet.hpMax),
    HD_Value: sheet.hitDie,
    HD_Total: String(sheet.hitDiceTotal),
    ST_STR: fmt(sheet.savingThrows.str.value),
    ST_STR_Prof: sheet.savingThrows.str.proficient ? "x" : "",
    ST_DEX: fmt(sheet.savingThrows.dex.value),
    ST_DEX_Prof: sheet.savingThrows.dex.proficient ? "x" : "",
    ST_CON: fmt(sheet.savingThrows.con.value),
    ST_CON_Prof: sheet.savingThrows.con.proficient ? "x" : "",
    ST_INT: fmt(sheet.savingThrows.int.value),
    ST_INT_Prof: sheet.savingThrows.int.proficient ? "x" : "",
    ST_WIS: fmt(sheet.savingThrows.wis.value),
    ST_WIS_Prof: sheet.savingThrows.wis.proficient ? "x" : "",
    ST_CHA: fmt(sheet.savingThrows.cha.value),
    ST_CHA_Prof: sheet.savingThrows.cha.proficient ? "x" : "",
    Features_Main: summarizeClassFeaturesForPdf(sheet.classFeaturesMd, sheet.subclassFeaturesMd, sheet.level, 1400),
    Feat_Racial: summarizeRaceTraitsForPdf(sheet.raceTraitsMd, sheet.subraceTraitsMd ?? "", 900),
    Inventory: formatInventoryForPdf(sheet.inventory),
    Languages: sheet.languages.join(", "),
    SpellcastingClass: sheet.spellcastingClass ?? "",
    SpellcastingAbility: sheet.spellcastingAbility?.toUpperCase() ?? "",
    SpellSaveDC: sheet.spellSaveDc != null ? String(sheet.spellSaveDc) : "",
    SpellAtkBonus: sheet.spellAttackBonus != null ? fmt(sheet.spellAttackBonus) : "",
  };

  for (const [skill, prefix] of Object.entries(SKILL_TO_FIELD) as Array<[SkillKey, string]>) {
    fields[prefix] = fmt(sheet.skills[skill].value);
    fields[`${prefix}_Prof`] = sheet.skills[skill].proficient ? "x" : "";
  }
  for (let i = 0; i < 4; i += 1) {
    const w = sheet.weaponRows[i];
    fields[`Wpn${i + 1}_Name`] = w?.name ?? "";
    fields[`Wpn${i + 1}_Atk`] = w?.toHit ?? "";
    fields[`Wpn${i + 1}_Dmg`] = w?.damage ?? "";
    fields[`Wpn${i + 1}_Type`] = w?.type ?? "";
  }
  for (let lvl = 1; lvl <= 9; lvl += 1) {
    const slots = sheet.spellSlots[lvl as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9];
    for (let i = 1; i <= 4; i += 1) {
      fields[`Slot_L${lvl}_${i}`] = i <= slots ? "x" : "";
    }
  }
  for (let i = 0; i < 4; i += 1) {
    const cantrip = sheet.spells.find((s) => s.level === 0 && i === sheet.spells.filter((x) => x.level === 0).indexOf(s));
    fields[`Cantrip_${i + 1}`] = cantrip?.name ?? "";
    fields[`Cantrip_${i + 1}_Desc`] = cantrip?.summary ?? "";
  }
  const rowSpells = sheet.spells.filter((s) => s.level >= 1).slice(0, 20);
  for (let i = 0; i < 20; i += 1) {
    const s = rowSpells[i];
    const row = i + 1;
    fields[`Row_${row}_Name`] = s?.name ?? "";
    fields[`Row_${row}_Desc`] = s?.summary ?? "";
    fields[`Row_${row}_Lvl`] = s ? String(s.level) : "";
    fields[`Row_${row}_V`] = s?.verbal ? "x" : "";
    fields[`Row_${row}_S`] = s?.somatic ? "x" : "";
    fields[`Row_${row}_M`] = s?.material ? "x" : "";
    fields[`Row_${row}_Rit`] = s?.ritual ? "x" : "";
    fields[`Row_${row}_Conc`] = s?.concentration ? "x" : "";
  }
  fields.SpellList = sheet.spells.map((s) => ({
    level: s.level,
    name: s.name,
    desc: s.summary,
    v: s.verbal ? "x" : "",
    s: s.somatic ? "x" : "",
    m: s.material ? "x" : "",
    conc: s.concentration ? "x" : "",
    rit: s.ritual ? "x" : "",
  }));

  return fields;
}
