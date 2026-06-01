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

function loadout(
  ac: number,
  armorItem: string | null,
  shieldItem: string | null,
  breakdown: string
): ArmorLoadout {
  return { ac, armorItem, shieldItem, breakdown };
}

/**
 * CA da equipaggiamento tipico di 1° livello + difese senza armatura (PHB).
 */
export function computeRealisticArmorClass(
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
