import type { AbilityKey } from "@/lib/sheet-generator/types";

export type ArmorClassResult = {
  ac: number;
  /** Nota tecnica CA (campo breakdown legacy). */
  breakdown: string;
  /** Voce inventario, es. «cotta di maglia». */
  armorItem: string | null;
  /** Voce inventario scudo, se presente. */
  shieldItem: string | null;
};

type ArmorLoadout = {
  ac: number;
  breakdown: string;
  armorItem: string | null;
  shieldItem: string | null;
};

/** Incantesimi/effetti reattivi o a durata breve: non entrano nella CA stampata sulla scheda. */
const TEMPORARY_AC_SPELL_NAMES = [
  "scudo",
  "shield",
  "scudo della fede",
  "shield of faith",
  "barkskin",
  "scorza",
  "velocità",
  "haste",
  "protezione",
  "protection from evil",
];

function loadout(
  ac: number,
  armorItem: string | null,
  shieldItem: string | null,
  breakdown: string
): ArmorLoadout {
  return { ac, armorItem, shieldItem, breakdown };
}

function normSpellName(name: string): string {
  return name.trim().toLocaleLowerCase("it");
}

function isTemporaryAcSpell(name: string): boolean {
  const n = normSpellName(name);
  return TEMPORARY_AC_SPELL_NAMES.some((t) => n.includes(t));
}

function hasPersistentMageArmor(spells: string[], invocations: string[]): boolean {
  for (const raw of [...spells, ...invocations]) {
    const n = normSpellName(raw);
    if (n.includes("armatura magica") || n.includes("mage armor")) return true;
    if (n.includes("armatura delle ombre")) return true;
  }
  return false;
}

export type ArmorClassContext = {
  classLabel: string;
  abilityMods: Record<AbilityKey, number>;
  fightingStyle?: string | null;
  spells?: string[];
  cantrips?: string[];
  warlockInvocations?: string[];
};

/**
 * CA da equipaggiamento tipico di 1° livello + difese senza armatura (PHB).
 * Armatura magica / Armatura delle Ombre sostituiscono la CA senz'armatura (non si sommano).
 * Stile Difesa +1 solo con armatura fisica. Nessun bonus da Scudo, Barkskin, ecc.
 */
export function computeArmorClass(ctx: ArmorClassContext): ArmorClassResult {
  const { classLabel, abilityMods, fightingStyle } = ctx;
  const spells = [...(ctx.spells ?? []), ...(ctx.cantrips ?? [])].filter((s) => !isTemporaryAcSpell(s));
  const invocations = (ctx.warlockInvocations ?? []).filter((s) => !isTemporaryAcSpell(s));

  const physical = computePhysicalArmorClass(classLabel, abilityMods);
  let ac = physical.ac;
  let breakdown = physical.breakdown;
  let armorItem = physical.armorItem;
  let shieldItem = physical.shieldItem;

  const mageArmor = hasPersistentMageArmor(spells, invocations);
  if (mageArmor) {
    const mageAc = 13 + abilityMods.dex;
    if (!armorItem || mageAc > ac) {
      ac = mageAc;
      breakdown = "Armatura magica (13 + DES)";
      armorItem = null;
      shieldItem = null;
    }
  }

  if (fightingStyle?.includes("Difesa") && physical.armorItem) {
    ac += 1;
    breakdown = `${breakdown} + Difesa (+1)`;
  }

  return { ac, breakdown, armorItem, shieldItem };
}

/** @deprecated Usare computeArmorClass con contesto completo. */
export function computeRealisticArmorClass(
  classLabel: string,
  abilityMods: Record<AbilityKey, number>
): ArmorClassResult {
  return computeArmorClass({ classLabel, abilityMods });
}

function computePhysicalArmorClass(
  classLabel: string,
  abilityMods: Record<AbilityKey, number>
): ArmorClassResult {
  const dex = abilityMods.dex;
  const con = abilityMods.con;
  const wis = abilityMods.wis;

  switch (classLabel) {
    case "Barbaro":
      return loadout(
        10 + dex + con,
        null,
        null,
        `Senza armatura (Forza del Barb.): 10 + DES + COS`
      );
    case "Monaco":
      return loadout(10 + dex + wis, null, null, `Difesa senz'armatura: 10 + DES + SAG`);
    case "Mago":
    case "Stregone":
      return loadout(10 + dex, null, null, "Nessuna armatura (10 + DES)");
    case "Warlock":
      return loadout(11 + dex, "armatura di cuoio", null, "Armatura di cuoio (11 + DES)");
    case "Ladro":
    case "Bardo":
      return loadout(11 + dex, "armatura di cuoio", null, "Armatura di cuoio (11 + DES)");
    case "Ranger":
      return loadout(
        14 + Math.min(dex, 2),
        "armatura di scaglie",
        null,
        "Armatura di scaglie (14 + DES, max +2)"
      );
    case "Druido":
      return loadout(
        12 + Math.min(dex, 2),
        "armatura di pelli",
        null,
        "Armatura di pelli (12 + DES, max +2, non metallica)"
      );
    case "Chierico":
    case "Paladino":
    case "Guerriero":
      return loadout(18, "cotta di maglia", "scudo", "Cotta di maglia (16) + scudo (+2)");
    case "Artefice":
      return loadout(
        16 + Math.min(dex, 2),
        "armatura di scaglie",
        "scudo",
        "Armatura di scaglie (14) + scudo (+2) + DES (max +2)"
      );
    default:
      return loadout(10 + dex, null, null, "10 + DES");
  }
}
