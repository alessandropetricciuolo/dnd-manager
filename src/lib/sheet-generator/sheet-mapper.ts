import type { GeneratedCharacterSheet, SkillKey } from "@/lib/sheet-generator/types";

function fmt(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
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

function normalizeHeading(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
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

function summarizeClassFeaturesForPdf(classMd: string, subclassMd: string | null | undefined, level: number, maxLen: number): string {
  const source = [classMd ?? "", subclassMd ?? ""].filter(Boolean).join("\n\n").trim();
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
  for (const b of prioritized) {
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
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const boldTraits: Array<{ heading: string; body: string }> = [];
  const boldRe = /\*\*([^*]+?)\.\*\*\s*([\s\S]*?)(?=\n\s*\*\*[^*]+?\.\*\*|$)/g;
  let bm: RegExpExecArray | null;
  while ((bm = boldRe.exec(txt)) !== null) {
    const heading = bm[1].trim();
    const body = bm[2].trim();
    if (!heading || !body) continue;
    boldTraits.push({ heading, body });
  }
  if (boldTraits.length) {
    const bullets = boldTraits
      .map((t) => {
        const summary = summarizeFeatureBlock(pickMechanicSentence(t.body), 130);
        if (!summary) return "";
        return `• ${t.heading}: ${summary}`;
      })
      .filter(Boolean);
    if (bullets.length) return compactPdfText(bullets.join("\n"), maxLen);
  }

  const lines = txt.split("\n");
  const sections: Array<{ heading: string; body: string }> = [];
  let heading: string | null = null;
  let bodyLines: string[] = [];
  const flush = () => {
    if (!heading) return;
    const body = bodyLines.join("\n").trim();
    sections.push({ heading, body });
    heading = null;
    bodyLines = [];
  };
  for (const line of lines) {
    const h = line.match(/^#{1,6}\s+(.+?)\s*$/);
    if (h) {
      flush();
      heading = h[1].trim();
      continue;
    }
    if (heading) bodyLines.push(line);
  }
  flush();
  if (!sections.length) return compactPdfText(toPlainSentence(txt), maxLen);

  const skipHeadings = new Set(["TRATTI DEI MEZZORCHI", "TRATTI RAZZIALI", "TRATTI"]);
  const bullets: string[] = [];
  for (const s of sections) {
    const hn = normalizeHeading(s.heading);
    if (skipHeadings.has(hn)) continue;
    const summary = summarizeFeatureBlock(pickMechanicSentence(s.body), 130);
    if (!summary) continue;
    bullets.push(`• ${s.heading.replace(/[.:]+$/g, "")}: ${summary}`);
  }
  if (!bullets.length) return compactPdfText(toPlainSentence(txt), maxLen);
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
    Inventory: sheet.inventory.join("\n"),
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
