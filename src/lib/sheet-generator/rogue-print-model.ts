import type { GeneratedCharacterSheet, SkillKey } from './types';
import {
  rogueArchetypeFromLabel,
  type RogueChoices,
} from './rogue-archetypes';
import type { RogueEvidence } from '@/lib/server/rogue-source';
import type { PrintFeature } from './manual-feature-text';

export function buildRoguePrintModel(
  original: GeneratedCharacterSheet,
  evidence: RogueEvidence,
  choices: RogueChoices = {}
) {
  if (original.classLabel !== 'Ladro') throw new Error('Classe Ladro richiesta.');
  const sheet = structuredClone(original);
  const archetype = rogueArchetypeFromLabel(sheet.classSubclass);
  if (sheet.classSubclass && !archetype) throw new Error('Archetipo Ladresco non catalogato nei manuali.');

  if (sheet.level < 3) {
    sheet.classSubclass = null;
    sheet.subclassFeaturesMd = null;
  }

  const features: PrintFeature[] = [...evidence.classFeatures, ...evidence.archetypeFeatures]
    .filter((f) => f.level <= sheet.level)
    .map((f) => ({ ...f }));

  if (!features.some((f) => f.title === 'ATTACCO FURTIVO')) {
    throw new Error('Regola Attacco Furtivo non risolta dal manuale.');
  }

  // Base Ladro: Mente Sfuggente (Liv. 15+)
  if (sheet.level >= 15) {
    if (!sheet.savingThrows.wis.proficient) {
      sheet.savingThrows.wis.proficient = true;
      sheet.savingThrows.wis.value += sheet.proficiencyBonus;
    }
  }

  // Subclass: Esploratore - Survivalista (Liv. 3+)
  if (archetype?.slug === 'xge-ladro-esploratore' && sheet.level >= 3) {
    for (const key of ['nature', 'survival'] as const) {
      const skill = sheet.skills[key];
      const prevProf = skill.proficient;
      const prevExp = skill.expertise;
      skill.proficient = true;
      skill.expertise = true;
      if (!prevProf) {
        skill.value += 2 * sheet.proficiencyBonus;
      } else if (!prevExp) {
        skill.value += sheet.proficiencyBonus;
      }
    }
  }

  // Subclass: Esploratore - Mobilità Superiore (Liv. 9+)
  if (archetype?.slug === 'xge-ladro-esploratore' && sheet.level >= 9) {
    const m = sheet.speed.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
    if (m) {
      const num = Number(m[1]) + 3;
      sheet.speed = `${num} ${m[2] || 'm'}`.trim();
    }
  }

  // Subclass: Spadaccino - Audacia del Fanfarone (Liv. 3+)
  if (archetype?.slug === 'xge-ladro-spadaccino' && sheet.level >= 3) {
    sheet.initiative += sheet.abilityMods.cha;
  }

  // Subclass: Assassino - Competenze Bonus (Liv. 3+)
  if (archetype?.slug === 'phb-ladro-assassino' && sheet.level >= 3) {
    for (const tool of ['Trucchi per il camuffamento', 'Sostanze da avvelenatore']) {
      if (!sheet.toolProficiencies.includes(tool)) {
        sheet.toolProficiencies.push(tool);
      }
    }
  }

  // Subclass: Pianificatore - Maestro di Intrighi (Liv. 3+)
  if (archetype?.slug === 'xge-ladro-pianificatore' && sheet.level >= 3) {
    for (const tool of ['Trucchi per il camuffamento', 'Arnesi da falsario']) {
      if (!sheet.toolProficiencies.includes(tool)) {
        sheet.toolProficiencies.push(tool);
      }
    }
    const game = choices.mastermindGamingSet ?? 'Set di dadi';
    if (!sheet.toolProficiencies.includes(game)) {
      sheet.toolProficiencies.push(game);
    }
    const langs = choices.mastermindLanguages ?? ['Nanico', 'Elfico'];
    for (const lang of langs) {
      if (!sheet.languages.includes(lang)) {
        sheet.languages.push(lang);
      }
    }
  }

  // Subclass: Fantasma - Sussurri dei Morti (Liv. 3+)
  if (archetype?.slug === 'tce-ladro-fantasma' && sheet.level >= 3 && choices.phantomWhispersSkill) {
    const skill = sheet.skills[choices.phantomWhispersSkill];
    if (skill && !skill.proficient) {
      skill.proficient = true;
      skill.value += sheet.proficiencyBonus;
    }
  }

  // Subclass: Lama Spirituale - Lame Psichiche (Liv. 3+)
  if (archetype?.slug === 'tce-ladro-lama-spirituale' && sheet.level >= 3) {
    if (!sheet.weaponRows.some((w) => w.name.toLowerCase().includes('lama psichica'))) {
      const atkMod = Math.max(sheet.abilityMods.str, sheet.abilityMods.dex);
      const toHit = `+${sheet.proficiencyBonus + atkMod}`;
      const abToken = sheet.abilityMods.dex >= sheet.abilityMods.str ? 'DES' : 'FOR';
      sheet.weaponRows.unshift(
        {
          name: 'Lama psichica',
          toHit,
          damage: `1d6+${abToken}`,
          type: 'psichici (lancio 18 m)',
        },
        {
          name: 'Lama psichica secondaria',
          toHit,
          damage: `1d4+${abToken}`,
          type: 'psichici (az. bonus, mano libera)',
        }
      );
    }
  }

  return {
    sheet,
    archetype,
    features,
    resources: evidence.resources,
  };
}
