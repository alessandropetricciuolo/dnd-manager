import type { GeneratedCharacterSheet } from './types';
import {
  wizardTraditionFromLabel,
  type WizardChoices,
  BLADESINGER_WEAPONS,
} from './wizard-traditions';
import type { WizardEvidence, WizardResources } from '@/lib/server/wizard-source';
import type { PrintFeature } from './manual-feature-text';

export type WizardPrintModel = {
  sheet: GeneratedCharacterSheet;
  features: PrintFeature[];
  resources: WizardResources;
};

export function buildWizardPrintModel(
  original: GeneratedCharacterSheet,
  evidence: WizardEvidence,
  choices: WizardChoices = {}
): WizardPrintModel {
  if (original.classLabel !== 'Mago') throw new Error('Classe Mago richiesta.');
  const sheet = structuredClone(original);
  const tradition = wizardTraditionFromLabel(sheet.classSubclass);
  if (sheet.classSubclass && !tradition) throw new Error('Tradizione Arcana non catalogata nei manuali.');

  if (sheet.level < 2) {
    sheet.classSubclass = null;
    sheet.subclassFeaturesMd = null;
  }

  const features: PrintFeature[] = [...evidence.classFeatures, ...evidence.traditionFeatures]
    .filter((f) => f.level <= sheet.level)
    .map((f) => ({ ...f }));

  if (!features.some((f) => f.title === 'RECUPERO ARCANO')) {
    throw new Error('Regola Recupero Arcano non risolta dal manuale.');
  }

  // Subclass: Magia della Guerra - Ingegno Tattico (Liv 2+)
  if (tradition?.slug === 'xge-mago-guerra' && sheet.level >= 2) {
    sheet.initiative += sheet.abilityMods.int;
  }

  // Subclass: Canto della Lama - Arte della Guerra e del Canto (Liv 2+)
  if (tradition?.slug === 'tce-mago-canto-lama' && sheet.level >= 2) {
    if (!sheet.armorProficiencies.includes('Armature leggere')) {
      sheet.armorProficiencies.push('Armature leggere');
    }
    const chosenWeapon =
      choices.bladesingerWeapon && BLADESINGER_WEAPONS.includes(choices.bladesingerWeapon as typeof BLADESINGER_WEAPONS[number])
        ? choices.bladesingerWeapon
        : 'Stocco';
    if (!sheet.weaponProficiencies.includes(chosenWeapon)) {
      sheet.weaponProficiencies.push(chosenWeapon);
    }
    if (!sheet.skills.performance.proficient) {
      sheet.skills.performance.proficient = true;
      sheet.skills.performance.value = sheet.abilityMods.cha + sheet.proficiencyBonus;
    }
  }

  // Ensure granted spells (Animare Morti, Illusione Minore) are present in sheet spells
  for (const spell of evidence.grantedSpells) {
    if (!sheet.spells.some((s) => s.name.toLowerCase() === spell.name.toLowerCase())) {
      sheet.spells.push(spell);
    }
  }

  // Set accurate full caster spell slots from manual
  sheet.spellSlots = { ...evidence.slots };

  return {
    sheet,
    features,
    resources: evidence.resources,
  };
}
