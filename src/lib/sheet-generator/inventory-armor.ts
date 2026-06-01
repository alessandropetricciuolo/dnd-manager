import type { ArmorClassResult } from "@/lib/sheet-generator/armor-class";

/** Righe inventario per armatura e scudo (in cima all'equipaggiamento). */
export function armorInventoryLines(armor: ArmorClassResult): string[] {
  const lines: string[] = [];
  if (armor.armorItem?.trim()) {
    lines.push(`Armatura: ${armor.armorItem.trim()}`);
  }
  if (armor.shieldItem?.trim()) {
    lines.push(`Scudo: ${armor.shieldItem.trim()}`);
  }
  return lines;
}
