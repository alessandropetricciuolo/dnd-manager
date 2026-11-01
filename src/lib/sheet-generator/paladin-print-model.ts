import type { GeneratedCharacterSheet } from './types';
import {
  paladinOathFromLabel,
  type PaladinChoices,
} from './paladin-oaths';
import type { PaladinEvidence, PaladinResources } from '@/lib/server/paladin-source';
import type { PrintFeature } from './manual-feature-text';

export type PaladinPrintModel = {
  sheet: GeneratedCharacterSheet;
  features: PrintFeature[];
  resources: PaladinResources;
  slots: Record<number, number>;
};

export function buildPaladinPrintModel(
  original: GeneratedCharacterSheet,
  evidence: PaladinEvidence,
  choices: PaladinChoices = {}
): PaladinPrintModel {
  if (original.classLabel !== 'Paladino') throw new Error('Classe Paladino richiesta.');
  const sheet = structuredClone(original);
  const oath = paladinOathFromLabel(sheet.classSubclass);
  if (sheet.classSubclass && !oath) throw new Error('Giuramento Sacro non catalogato nei manuali.');

  if (sheet.level < 3) {
    sheet.classSubclass = null;
    sheet.subclassFeaturesMd = null;
  }

  const features: PrintFeature[] = [...evidence.classFeatures, ...evidence.traditionFeatures]
    .filter((f) => f.level <= sheet.level)
    .map((f) => ({ ...f }));

  // Fighting style: Difesa confers +1 AC when wearing armor
  const fightingStyle = choices.fightingStyle ?? evidence.resources.fightingStyle ?? 'Difesa';
  if (fightingStyle === 'Difesa' && sheet.level >= 2) {
    sheet.armorClass += 1;
  }

  // Aura di Protezione (Livello 6+): aggiunge il modificatore di Carisma (minimo +1) a TUTTI i tiri salvezza
  if (sheet.level >= 6) {
    const auraBonus = Math.max(1, sheet.abilityMods.cha);
    for (const k of ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const) {
      sheet.savingThrows[k].value += auraBonus;
    }
  }

  // Giuramento di Gloria: Aura di Alacrità (Livello 7+) -> +3 metri di velocità base
  if (oath?.slug === 'tce-paladino-gloria' && sheet.level >= 7) {
    const baseMatch = sheet.speed.match(/^(\d+(?:[.,]\d+)?)\s*m/);
    const base = baseMatch ? parseFloat(baseMatch[1].replace(',', '.')) : 9;
    const total = base + 3;
    sheet.speed = `${total.toString().replace('.', ',')} m (+3 m Aura di Alacrità)`;
  }

  // Spell slots for half-caster
  sheet.spellSlots = {
    1: evidence.slots[1] ?? 0,
    2: evidence.slots[2] ?? 0,
    3: evidence.slots[3] ?? 0,
    4: evidence.slots[4] ?? 0,
    5: evidence.slots[5] ?? 0,
    6: 0,
    7: 0,
    8: 0,
    9: 0,
  };

  return {
    sheet,
    features,
    resources: {
      ...evidence.resources,
      fightingStyle,
    },
    slots: evidence.slots,
  };
}
