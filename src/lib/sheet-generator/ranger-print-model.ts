import type { GeneratedCharacterSheet, SkillKey } from './types';
import {
  rangerArchetypeFromLabel,
  type RangerChoices,
} from './ranger-archetypes';
import type { RangerEvidence, RangerResources } from '@/lib/server/ranger-source';
import type { PrintFeature } from './manual-feature-text';

export type RangerPrintModel = {
  sheet: GeneratedCharacterSheet;
  features: PrintFeature[];
  resources: RangerResources;
  slots: Record<number, number>;
};

export function buildRangerPrintModel(
  original: GeneratedCharacterSheet,
  evidence: RangerEvidence,
  choices: RangerChoices = {}
): RangerPrintModel {
  if (original.classLabel !== 'Ranger') throw new Error('Classe Ranger richiesta.');
  const sheet = structuredClone(original);
  const archetype = rangerArchetypeFromLabel(sheet.classSubclass);
  if (sheet.classSubclass && !archetype) throw new Error('Archetipo Ranger non catalogato nei manuali.');

  if (sheet.level < 3) {
    sheet.classSubclass = null;
    sheet.subclassFeaturesMd = null;
  }

  const features: PrintFeature[] = [...evidence.classFeatures, ...evidence.archetypeFeatures]
    .filter((f) => f.level <= sheet.level)
    .map((f) => ({ ...f }));

  // Fighting style: Difesa confers +1 AC when wearing armor
  const fightingStyle = choices.fightingStyle ?? evidence.resources.fightingStyle ?? 'Tiro';
  if (fightingStyle === 'Difesa' && sheet.level >= 2) {
    sheet.armorClass += 1;
  }

  // Cacciatore delle Tenebre (Gloom Stalker)
  if (archetype?.slug === 'xge-ranger-tenebre' && sheet.level >= 3) {
    // Imboscata Terrificante: add Wisdom modifier to Initiative
    sheet.initiative += sheet.abilityMods.wis;

    // Mente di Ferro (Level 7+): proficiency in Wisdom saving throws
    if (sheet.level >= 7) {
      if (!sheet.savingThrows.wis.proficient) {
        sheet.savingThrows.wis.proficient = true;
        sheet.savingThrows.wis.value += sheet.proficiencyBonus;
      } else if (!sheet.savingThrows.int.proficient) {
        sheet.savingThrows.int.proficient = true;
        sheet.savingThrows.int.value += sheet.proficiencyBonus;
      }
    }
  }

  // Viandante Fatato (Fey Wanderer)
  if (archetype?.slug === 'tce-ranger-viandante-fatato' && sheet.level >= 3) {
    // Fascino Ultraterreno: bonus equal to Wisdom modifier (min +1) to all Charisma checks
    const feyBonus = Math.max(1, sheet.abilityMods.wis);
    const chaSkills: SkillKey[] = ['deception', 'intimidation', 'performance', 'persuasion'];
    for (const key of chaSkills) {
      sheet.skills[key].value += feyBonus;
    }

    // Bonus skill proficiency: Inganno, Intrattenere o Persuasione
    const chosenSkill = (choices.feyWandererSkill ?? 'Persuasione').toLowerCase();
    const targetKey: SkillKey =
      chosenSkill.includes('inganno') ? 'deception' :
      chosenSkill.includes('intrattenere') ? 'performance' : 'persuasion';

    if (!sheet.skills[targetKey].proficient) {
      sheet.skills[targetKey].proficient = true;
      sheet.skills[targetKey].value += sheet.proficiencyBonus;
    }
  }

  // Half-caster spell slots
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
    resources: evidence.resources,
    slots: evidence.slots,
  };
}
