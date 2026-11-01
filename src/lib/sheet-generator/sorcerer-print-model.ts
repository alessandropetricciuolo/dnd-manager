import type { GeneratedCharacterSheet } from './types';
import {
  sorcererOriginFromLabel,
  type SorcererChoices,
} from './sorcerer-origins';
import type { SorcererEvidence, SorcererResources } from '@/lib/server/sorcerer-source';
import type { PrintFeature } from './manual-feature-text';
import type { SubclassCatalogEntry } from '@/lib/character-subclass-catalog';

export type SorcererPrintModel = {
  sheet: GeneratedCharacterSheet;
  features: PrintFeature[];
  origin: SubclassCatalogEntry | null;
  resources: SorcererResources;
  slots: Record<number, number>;
};

export function buildSorcererPrintModel(
  original: GeneratedCharacterSheet,
  evidence: SorcererEvidence,
  choices: SorcererChoices = {}
): SorcererPrintModel {
  if (original.classLabel !== 'Stregone') throw new Error('Classe Stregone richiesta.');
  const sheet = structuredClone(original);
  const origin = sorcererOriginFromLabel(sheet.classSubclass);
  if (sheet.classSubclass && !origin) throw new Error('Origine Stregonesca non catalogata nei manuali.');

  const features: PrintFeature[] = [...evidence.classFeatures, ...evidence.originFeatures]
    .filter((f) => f.level <= sheet.level)
    .map((f) => ({ ...f }));

  // Resilienza Draconica (Draconic Resilience)
  if (origin?.slug === 'phb-stregone-draconico') {
    // +1 PF per livello da stregone
    sheet.hpMax += sheet.level;

    // Quando non indossa armatura, la CA è 13 + DES
    const hasArmor = sheet.inventory.some((i) => /^Armatura:/i.test(i));
    if (!hasArmor) {
      sheet.armorClass = Math.max(sheet.armorClass, 13 + sheet.abilityMods.dex);
    }
  }

  // Full-caster spell slots 1-9
  sheet.spellSlots = {
    1: evidence.slots[1] ?? 0,
    2: evidence.slots[2] ?? 0,
    3: evidence.slots[3] ?? 0,
    4: evidence.slots[4] ?? 0,
    5: evidence.slots[5] ?? 0,
    6: evidence.slots[6] ?? 0,
    7: evidence.slots[7] ?? 0,
    8: evidence.slots[8] ?? 0,
    9: evidence.slots[9] ?? 0,
  };

  sheet.spellSaveDc = evidence.resources.spellSaveDc;
  sheet.spellAttackBonus = evidence.resources.spellAttackBonus;

  return {
    sheet,
    features,
    origin,
    resources: evidence.resources,
    slots: evidence.slots,
  };
}
