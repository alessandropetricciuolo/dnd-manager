import type { AbilityKey } from "@/lib/sheet-generator/types";

export type ArmorClassResult = {
  ac: number;
  /** Breve nota per inventario / debug (es. equipaggiamento presunto). */
  breakdown: string;
};

/**
 * CA da equipaggiamento tipico di 1° livello + difese senza armatura (PHB).
 * Non include incantesimi attivi (es. Armatura Magica) salvo dove è l'unica difesa plausibile.
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
      return {
        ac: 10 + dex + con,
        breakdown: "Senza armatura (Forza del Barb.): 10 + DES + COS",
      };
    case "Monaco":
      return {
        ac: 10 + dex + wis,
        breakdown: "Difesa senz'armatura: 10 + DES + SAG",
      };
    case "Mago":
    case "Stregone":
      return {
        ac: 10 + dex,
        breakdown: "Nessuna armatura indossata (10 + DES)",
      };
    case "Warlock":
      return {
        ac: 11 + dex,
        breakdown: "Armatura di cuoio (11 + DES)",
      };
    case "Ladro":
    case "Bardo":
      return {
        ac: 11 + dex,
        breakdown: "Armatura di cuoio (11 + DES)",
      };
    case "Ranger":
      return {
        ac: 14 + Math.min(dex, 2),
        breakdown: "Armatura di scaglie (14 + DES, max +2)",
      };
    case "Druido":
      return {
        ac: 12 + Math.min(dex, 2),
        breakdown: "Armatura di pelli (12 + DES, max +2, non metallica)",
      };
    case "Chierico":
    case "Paladino":
    case "Guerriero":
      return {
        ac: 18,
        breakdown: "Cotta di maglia (16) + scudo (+2)",
      };
    case "Artefice":
      return {
        ac: 16 + Math.min(dex, 2),
        breakdown: "Armatura di scaglie (14) + scudo (+2) + DES (max +2)",
      };
    default:
      return {
        ac: 10 + dex,
        breakdown: "10 + DES",
      };
  }
}
