import type { GeneratedCharacterSheet } from './types';
import {
  warlockPatronFromLabel,
  type WarlockChoices,
} from './warlock-patrons';
import type { WarlockEvidence, WarlockResources } from '@/lib/server/warlock-source';
import { normalizeFeatureTitle, type PrintFeature } from './manual-feature-text';
import type { SubclassCatalogEntry } from '@/lib/character-subclass-catalog';

export type WarlockPrintModel = {
  sheet: GeneratedCharacterSheet;
  features: PrintFeature[];
  patron: SubclassCatalogEntry | null;
  resources: WarlockResources;
  slots: Record<number, number>;
};

export function buildWarlockPrintModel(
  original: GeneratedCharacterSheet,
  evidence: WarlockEvidence,
  choices: WarlockChoices = {}
): WarlockPrintModel {
  if (original.classLabel !== 'Warlock') throw new Error('Classe Warlock richiesta.');
  const sheet = structuredClone(original);
  const patron = warlockPatronFromLabel(sheet.classSubclass);
  if (sheet.classSubclass && !patron) throw new Error('Patrono Ultraterreno non catalogato nei manuali.');

  const features: PrintFeature[] = [...evidence.classFeatures, ...evidence.patronFeatures]
    .filter((f) => f.level <= sheet.level)
    .map((f) => {
      const normTitle = normalizeFeatureTitle(f.title);
      if (normTitle === 'DONO DEL PATTO' && evidence.resources.pactBoon) {
        return {
          ...f,
          title: `DONO DEL PATTO: ${evidence.resources.pactBoon.name.toUpperCase()}`,
          body: evidence.resources.pactBoon.desc,
        };
      }
      if (normTitle === 'SUPPLICHE OCCULTE' && evidence.resources.invocations.length > 0) {
        return {
          ...f,
          body: evidence.resources.invocations.map((inv) => `${inv.name}: ${inv.desc}`).join('\n'),
        };
      }
      if (normTitle === 'ARCANUM MISTICO' && evidence.resources.mysticArcanum.length > 0) {
        return {
          ...f,
          body:
            '1 utilizzo senza slot per riposo lungo per ciascun Arcanum sbloccato: ' +
            evidence.resources.mysticArcanum.map((a) => `${a.level}° liv. ${a.spellName}`).join('; ') +
            '.',
        };
      }
      return { ...f };
    });

  // Hexblade Warrior (Combattente del Sortilegio)
  if (patron?.slug === 'xge-warlock-lama-sortilegio') {
    // Add medium armor, shields, and martial weapons proficiencies
    const armorProfs = new Set(sheet.armorProficiencies);
    armorProfs.add('Armature medie');
    armorProfs.add('Scudi');
    sheet.armorProficiencies = Array.from(armorProfs);

    const weaponProfs = new Set(sheet.weaponProficiencies);
    weaponProfs.add('Armi da guerra');
    sheet.weaponProficiencies = Array.from(weaponProfs);

    // If weapon attacks exist, apply Charisma if higher than Strength/Dexterity
    const chaMod = sheet.abilityMods?.cha ?? Math.floor(((sheet.abilities?.cha ?? 10) - 10) / 2);
    const pb = sheet.proficiencyBonus ?? 2;

    sheet.weaponRows = sheet.weaponRows.map((att) => {
      // Don't modify unarmed strikes or spells unless specified
      const isSpell = /deflagrazione|raggio|tocco|spruzzo|dardo/i.test(att.name);
      if (isSpell) return att;

      // Hexblade weapon allows using Charisma for attack and damage
      const baseDmgMatch = att.damage.match(/^(\d+d\d+)(?:\s*([+-]\s*\d+))?/);
      if (baseDmgMatch) {
        const dice = baseDmgMatch[1];
        const newDmg = chaMod >= 0 ? `${dice} + ${chaMod}` : `${dice} - ${Math.abs(chaMod)}`;
        const newBonus = pb + chaMod;
        const newBonusStr = newBonus >= 0 ? `+${newBonus}` : `${newBonus}`;
        return {
          ...att,
          toHit: newBonusStr,
          damage: newDmg,
        };
      }
      return att;
    });
  }

  // Warlock Pact Magic slots
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

  sheet.spellSaveDc = evidence.resources.spellSaveDc;
  sheet.spellAttackBonus = evidence.resources.spellAttackBonus;

  return {
    sheet,
    features,
    patron,
    resources: evidence.resources,
    slots: evidence.slots,
  };
}
