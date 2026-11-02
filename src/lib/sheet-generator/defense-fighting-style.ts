import type { GeneratedCharacterSheet } from "./types";

/**
 * Verifica se il personaggio indossa un'armatura fisica (esclusi gli scudi).
 * D&D 5e PHB p. 72: Stile Difesa richiede di "indossare un'armatura".
 */
export function characterHasPhysicalArmor(sheet: GeneratedCharacterSheet): boolean {
  if (sheet.armorItem !== undefined) {
    return sheet.armorItem !== null;
  }
  return sheet.inventory.some((item) => {
    const lower = item.toLowerCase();
    if (lower.startsWith("scudo")) return false;
    return (
      lower.includes("armatura") ||
      lower.includes("cotta") ||
      lower.includes("cuoio") ||
      lower.includes("scaglie") ||
      lower.includes("pelli") ||
      lower.includes("corazza") ||
      lower.includes("maglia")
    );
  });
}

/**
 * Sincronizza autorevolmente il bonus di +1 della CA concesso dallo Stile di Combattimento Difesa.
 * Se Difesa è richiesta, il personaggio ha il livello sufficiente e indossa un'armatura fisica,
 * il bonus viene applicato esattamente una sola volta e tracciato con `defenseStyleApplied`.
 * Se Difesa viene rimossa o mancano i requisiti, il bonus precedentemente applicato viene stornato.
 */
export function syncDefenseFightingStyle(
  sheet: GeneratedCharacterSheet,
  wantsDefense: boolean,
  minLevel = 2
): void {
  const hasArmor = characterHasPhysicalArmor(sheet);
  const eligible = wantsDefense && sheet.level >= minLevel && hasArmor;

  if (eligible && !sheet.defenseStyleApplied) {
    sheet.armorClass += 1;
    sheet.defenseStyleApplied = true;
  } else if (!eligible && sheet.defenseStyleApplied) {
    sheet.armorClass -= 1;
    sheet.defenseStyleApplied = false;
  }
}
