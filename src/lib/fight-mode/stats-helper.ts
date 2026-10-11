import type { SavingThrowsMap, CombatReaction, WeaponAttack } from "./types";
import { parseDenseStatblock } from "@/lib/manuals/dense-statblock-parser";

export const DEFAULT_OPPORTUNITY_ATTACK: CombatReaction = {
  name: "Attacco di Opportunità",
  description:
    "Puoi effettuare un attacco di opportunità in mischia quando una creatura ostile esce dalla tua portata.",
};

/**
 * Verifica se un testo markdown contiene uno statblock 5e completo (caratteristiche FOR/DES o tratti/azioni).
 */
export function isCompleteMonsterStatblock(text: string | null | undefined): boolean {
  if (!text) return false;
  const s = text.trim();
  if (s.length < 40) return false;
  const hasAbilities =
    /\|\s*(?:FOR|STR)\s*\|/i.test(s) ||
    /\b(?:FOR|STR)\b\s*[:\s]?\s*\d+/i.test(s) ||
    /\b(?:FOR|STR)\b[\s\S]{0,120}\b(?:DES|DEX)\b/i.test(s);
  const hasActionsOrTraits =
    /(?:###?\s*(?:Azioni|Actions|Reazioni|Reactions|Tratti|Traits)|Multiattacco|Multiattack|\*\*\*.*?\*\*\*)/i.test(s);
  return Boolean(hasAbilities || hasActionsOrTraits);
}

const CLASS_SAVING_THROWS: Record<string, Array<keyof SavingThrowsMap>> = {
  barbaro: ["for", "cos"],
  bardo: ["des", "car"],
  chierico: ["sag", "car"],
  druido: ["int", "sag"],
  guerriero: ["for", "cos"],
  ladro: ["des", "int"],
  mago: ["int", "sag"],
  monaco: ["for", "des"],
  paladino: ["sag", "car"],
  ranger: ["for", "des"],
  stregone: ["cos", "car"],
  warlock: ["sag", "car"],
  artefice: ["cos", "int"],
};

export function proficiencyBonusByLevel(level: number): number {
  const lvl = Math.max(1, Math.min(20, Math.trunc(level || 1)));
  return Math.floor((lvl - 1) / 4) + 2;
}

/**
 * Calcola i tiri salvezza per un personaggio in base alla classe, livello e caratteristiche stimate.
 */
export function estimatePcSaves(
  characterClass: string | null | undefined,
  level: number = 1
): SavingThrowsMap {
  const normClass = (characterClass ?? "").toLowerCase().trim();
  const profs = CLASS_SAVING_THROWS[normClass] ?? ["for", "cos"];
  const pb = proficiencyBonusByLevel(level);

  // Stima base bilanciata per PG standard (+2 sulle primarie, 0 sulle secondarie)
  const baseMap: SavingThrowsMap = {
    for: 1,
    des: 2,
    cos: 2,
    int: 0,
    sag: 1,
    car: 0,
  };

  // Assegna il bonus di competenza ai 2 tiri salvezza di classe
  for (const stat of profs) {
    baseMap[stat] = (baseMap[stat] ?? 0) + pb;
  }

  return baseMap;
}

/**
 * Estrae tiri salvezza e reazioni da uno statblock markdown o testo di un mostro.
 */
export function parseMonsterStatsFromMarkdown(markdown: string): {
  savingThrows?: SavingThrowsMap;
  reactions: CombatReaction[];
  actions: Array<{ name: string; body: string }>;
  traits: Array<{ name: string; body: string }>;
  passivePerception?: number;
  speed?: string;
  senses?: string;
  spellSaveDc?: number;
  spellAttackBonus?: string;
} {
  const reactions: CombatReaction[] = [{ ...DEFAULT_OPPORTUNITY_ATTACK }];
  if (!markdown?.trim()) {
    return { reactions, actions: [], traits: [] };
  }

  const dense = parseDenseStatblock(markdown);

  // 1. Estrai reazioni specifiche
  if (dense.reactions && dense.reactions.length > 0) {
    for (const r of dense.reactions) {
      if (!reactions.some((existing) => existing.name.toLowerCase() === r.name.toLowerCase())) {
        reactions.push({
          name: r.name,
          description: r.body,
        });
      }
    }
  }

  // 2. Estrai tiri salvezza dalle caratteristiche dense
  const savingThrows: SavingThrowsMap = {
    for: 0,
    des: 0,
    cos: 0,
    int: 0,
    sag: 0,
    car: 0,
  };

  const ab = dense.abilities;
  if (ab) {
    const parseMod = (modStr?: string): number => {
      if (!modStr) return 0;
      const clean = modStr.replace(/[^\d+-]/g, "");
      const num = parseInt(clean, 10);
      return Number.isNaN(num) ? 0 : num;
    };

    if (ab.FOR) savingThrows.for = parseMod(ab.FOR.save || ab.FOR.mod);
    if (ab.DES) savingThrows.des = parseMod(ab.DES.save || ab.DES.mod);
    if (ab.COS) savingThrows.cos = parseMod(ab.COS.save || ab.COS.mod);
    if (ab.INT) savingThrows.int = parseMod(ab.INT.save || ab.INT.mod);
    if (ab.SAG) savingThrows.sag = parseMod(ab.SAG.save || ab.SAG.mod);
    if (ab.CAR) savingThrows.car = parseMod(ab.CAR.save || ab.CAR.mod);
  }

  // Se c'è la linea savesLine esplicita (es. "Des +5, Sag +3")
  if (dense.savesLine) {
    const parts = dense.savesLine.split(/[,;]/);
    for (const part of parts) {
      const match = part.trim().match(/^(FOR|DES|COS|INT|SAG|CAR|STR|DEX|CON|WIS|CHA)\s*([+-]\d+)/i);
      if (match) {
        const key = match[1].toUpperCase();
        const val = parseInt(match[2], 10);
        if (!Number.isNaN(val)) {
          if (key === "FOR" || key === "STR") savingThrows.for = val;
          if (key === "DES" || key === "DEX") savingThrows.des = val;
          if (key === "COS" || key === "CON") savingThrows.cos = val;
          if (key === "INT") savingThrows.int = val;
          if (key === "SAG" || key === "WIS") savingThrows.sag = val;
          if (key === "CAR" || key === "CHA") savingThrows.car = val;
        }
      }
    }
  }

  // Estrai percezione passiva
  let passivePerception: number | undefined;
  if (dense.senses) {
    const m = dense.senses.match(/percezione passiva\s*(\d+)/i);
    if (m) passivePerception = parseInt(m[1], 10);
  }

  // Estrai CD Incantesimi e Bonus Attacco con incantesimi
  let spellSaveDc: number | undefined;
  let spellAttackBonus: string | undefined;

  const dcMatch = markdown.match(/(?:CD|DC)\s*(?:del\s*tiro\s*salvezza\s*sugli?\s*incantesimi|degli?\s*incantesimi|tiro\s*salvezza)?[:\s]*(\d{1,2})/i);
  if (dcMatch) {
    const dc = parseInt(dcMatch[1], 10);
    if (!Number.isNaN(dc)) spellSaveDc = dc;
  }

  const txcMatch = markdown.match(/(?:tiro\s*per\s*colpire\s*con\s*incantesimi|bonus\s*di\s*attacco\s*con\s*incantesimi|attacco\s*con\s*incantesimi)[:\s]*([+-]\d+)/i);
  if (txcMatch) {
    spellAttackBonus = txcMatch[1].startsWith("+") ? txcMatch[1] : `+${txcMatch[1]}`;
  }

  return {
    savingThrows,
    reactions,
    actions: dense.actions || [],
    traits: dense.traits || [],
    passivePerception,
    speed: dense.speed ?? undefined,
    senses: dense.senses ?? undefined,
    spellSaveDc,
    spellAttackBonus,
  };
}

/**
 * Estrae o stima CD Incantesimi e Bonus Attacco Magico sia per Mostri che per PG.
 */
export function extractSpellStats(
  entry: {
    type: "pc" | "monster" | "custom";
    characterClass?: string | null;
    savingThrows?: SavingThrowsMap;
    contentBody?: string;
  },
  rawMarkdown?: string
): { cd: number | null; txc: string | null } {
  const md = rawMarkdown || entry.contentBody || "";
  if (md) {
    const dcMatch = md.match(/(?:CD|DC)\s*(?:del\s*tiro\s*salvezza\s*sugli?\s*incantesimi|degli?\s*incantesimi|tiro\s*salvezza)?[:\s]*(\d{1,2})/i);
    const txcMatch = md.match(/(?:tiro\s*per\s*colpire\s*con\s*incantesimi|bonus\s*di\s*attacco\s*con\s*incantesimi|attacco\s*con\s*incantesimi)[:\s]*([+-]\d+)/i);
    if (dcMatch) {
      const dc = parseInt(dcMatch[1], 10);
      const txc = txcMatch ? (txcMatch[1].startsWith("+") ? txcMatch[1] : `+${txcMatch[1]}`) : null;
      return { cd: dc, txc };
    }
  }

  if (entry.type === "pc" && entry.characterClass) {
    const c = entry.characterClass.toLowerCase();
    const pb = 2; // base PB at level 1-4
    if (c.includes("mago") || c.includes("artefice")) {
      const mod = Math.max(0, (entry.savingThrows?.int ?? 0) - (entry.savingThrows?.int ? pb : 0));
      const cd = 8 + pb + (mod || 3);
      return { cd, txc: `+${pb + (mod || 3)}` };
    }
    if (c.includes("chierico") || c.includes("druido") || c.includes("ranger")) {
      const mod = Math.max(0, (entry.savingThrows?.sag ?? 0) - (entry.savingThrows?.sag ? pb : 0));
      const cd = 8 + pb + (mod || 3);
      return { cd, txc: `+${pb + (mod || 3)}` };
    }
    if (c.includes("bardo") || c.includes("stregone") || c.includes("warlock") || c.includes("paladino")) {
      const mod = Math.max(0, (entry.savingThrows?.car ?? 0) - (entry.savingThrows?.car ? pb : 0));
      const cd = 8 + pb + (mod || 3);
      return { cd, txc: `+${pb + (mod || 3)}` };
    }
  }

  return { cd: null, txc: null };
}

/**
 * Fornisce un set di armi base per una classe di PG in italiano.
 */
export function getDefaultPcWeapons(characterClass?: string | null, level: number = 1): WeaponAttack[] {
  const norm = (characterClass ?? "").toLowerCase().trim();
  const pb = proficiencyBonusByLevel(level);

  switch (norm) {
    case "barbaro":
    case "guerriero":
    case "paladino":
      return [
        { name: "Spada Lunga / Ascia", toHit: `+${3 + pb}`, damage: `1d8+3 / 1d10+3`, type: "Tagliente" },
        { name: "Giavellotto", toHit: `+${3 + pb}`, damage: `1d6+3`, type: "Perforante (distanza)" },
      ];
    case "ladro":
    case "ranger":
      return [
        { name: "Stocco / Spada Corta", toHit: `+${3 + pb}`, damage: `1d8+3`, type: "Perforante" },
        { name: "Arco Corto", toHit: `+${3 + pb}`, damage: `1d6+3`, type: "Perforante (24/96m)" },
      ];
    case "chierico":
    case "druido":
      return [
        { name: "Mazza / Bastone", toHit: `+${2 + pb}`, damage: `1d6+2`, type: "Contundente" },
        { name: "Balestra Leggera", toHit: `+${1 + pb}`, damage: `1d8+1`, type: "Perforante" },
      ];
    case "monaco":
      return [
        { name: "Colpo Senz'Armi", toHit: `+${3 + pb}`, damage: `1d4+3`, type: "Contundente" },
        { name: "Lancia Corta", toHit: `+${3 + pb}`, damage: `1d6+3`, type: "Perforante" },
      ];
    case "mago":
    case "stregone":
    case "warlock":
    case "bardo":
    default:
      return [
        { name: "Pugnale", toHit: `+${2 + pb}`, damage: `1d4+2`, type: "Perforante" },
        { name: "Dardo Incantato / Trucchetto", toHit: `+${3 + pb}`, damage: `1d10 o 1d8`, type: "Magico" },
      ];
  }
}
