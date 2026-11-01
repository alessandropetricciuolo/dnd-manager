import type { GeneratedCharacterSheet, SkillKey } from './types';
import {
  fighterArchetypeFromLabel,
  type FighterChoices,
  ARCANE_ARCHER_SKILLS,
  CAVALIER_SKILLS,
  SAMURAI_SKILLS,
} from './fighter-archetypes';
import type { FighterEvidence } from '@/lib/server/fighter-source';
import type { PrintFeature } from './manual-feature-text';

export function buildFighterPrintModel(
  original: GeneratedCharacterSheet,
  evidence: FighterEvidence,
  choices: FighterChoices = {}
) {
  if (original.classLabel !== 'Guerriero') throw new Error('Classe Guerriero richiesta.');
  const sheet = structuredClone(original);
  const archetype = fighterArchetypeFromLabel(sheet.classSubclass);
  if (sheet.classSubclass && !archetype) throw new Error('Archetipo Marziale non catalogato nei manuali.');

  if (sheet.level < 3) {
    sheet.classSubclass = null;
    sheet.subclassFeaturesMd = null;
  }

  const features: PrintFeature[] = [...evidence.classFeatures, ...evidence.archetypeFeatures]
    .filter((f) => f.level <= sheet.level)
    .map((f) => ({ ...f }));

  if (!features.some((f) => f.title === 'RECUPERARE ENERGIE')) {
    throw new Error('Regola Recuperare Energie non risolta dal manuale.');
  }

  // Subclass: Campione - Atleta Straordinario (Liv 7+)
  if (archetype?.slug === 'phb-guerriero-campione' && sheet.level >= 7) {
    const halfProf = Math.ceil(sheet.proficiencyBonus / 2);
    // Add half proficiency rounded up to non-proficient STR and DEX skills
    const strDexSkills: SkillKey[] = ['athletics', 'acrobatics', 'stealth', 'sleight_of_hand'];
    for (const key of strDexSkills) {
      if (!sheet.skills[key].proficient) {
        sheet.skills[key].value += halfProf;
      }
    }
    // Initiative is a Dexterity check
    sheet.initiative += halfProf;
  }

  // Subclass: Samurai - Cortigiano Elegante (Liv 7+)
  if (archetype?.slug === 'xge-guerriero-samurai' && sheet.level >= 7) {
    if (sheet.abilityMods.wis > 0) {
      sheet.skills.persuasion.value += sheet.abilityMods.wis;
    }
    if (!sheet.savingThrows.wis.proficient) {
      sheet.savingThrows.wis.proficient = true;
      sheet.savingThrows.wis.value += sheet.proficiencyBonus;
    } else {
      const saveChoice = choices.samuraiSave ?? (!sheet.savingThrows.int.proficient ? 'int' : 'cha');
      if (!sheet.savingThrows[saveChoice].proficient) {
        sheet.savingThrows[saveChoice].proficient = true;
        sheet.savingThrows[saveChoice].value += sheet.proficiencyBonus;
      }
    }
  }

  // Subclass: Samurai - Competenza Bonus (Liv 3+)
  if (archetype?.slug === 'xge-guerriero-samurai' && sheet.level >= 3) {
    if (choices.samuraiLanguage) {
      if (!sheet.languages.includes(choices.samuraiLanguage)) {
        sheet.languages.push(choices.samuraiLanguage);
      }
    } else {
      const chosenSkill = choices.samuraiSkill ?? SAMURAI_SKILLS.find((k) => !sheet.skills[k].proficient) ?? 'history';
      if (!sheet.skills[chosenSkill].proficient) {
        sheet.skills[chosenSkill].proficient = true;
        sheet.skills[chosenSkill].value += sheet.proficiencyBonus;
      }
    }
  }

  // Subclass: Cavaliere Errante - Competenza Bonus (Liv 3+)
  if (archetype?.slug === 'xge-guerriero-cavaliere-errante' && sheet.level >= 3) {
    if (choices.cavalierLanguage) {
      if (!sheet.languages.includes(choices.cavalierLanguage)) {
        sheet.languages.push(choices.cavalierLanguage);
      }
    } else {
      const chosenSkill =
        choices.cavalierSkill ?? CAVALIER_SKILLS.find((k) => !sheet.skills[k].proficient) ?? 'animal_handling';
      if (!sheet.skills[chosenSkill].proficient) {
        sheet.skills[chosenSkill].proficient = true;
        sheet.skills[chosenSkill].value += sheet.proficiencyBonus;
      }
    }
  }

  // Subclass: Arciere Arcano - Conoscenze dell'Arciere Arcano (Liv 3+)
  if (archetype?.slug === 'xge-guerriero-arciere-arcano' && sheet.level >= 3) {
    const chosenSkill =
      choices.arcaneArcherSkill ?? (sheet.skills.arcana.proficient ? 'nature' : 'arcana');
    if (!sheet.skills[chosenSkill].proficient) {
      sheet.skills[chosenSkill].proficient = true;
      sheet.skills[chosenSkill].value += sheet.proficiencyBonus;
    }
  }

  // Subclass: Cavaliere Runico - Competenze Bonus (Liv 3+)
  if (archetype?.slug === 'tce-guerriero-runico' && sheet.level >= 3) {
    if (!sheet.toolProficiencies.includes('Strumenti da fabbro')) {
      sheet.toolProficiencies.push('Strumenti da fabbro');
    }
    if (!sheet.languages.includes('Gigante')) {
      sheet.languages.push('Gigante');
    }
  }

  // Subclass: Maestro di Battaglia - Studioso di Guerra (Liv 3+)
  if (archetype?.slug === 'phb-guerriero-maestro-battaglia' && sheet.level >= 3) {
    const tool = choices.battleMasterTool ?? 'Strumenti da fabbro';
    if (!sheet.toolProficiencies.includes(tool)) {
      sheet.toolProficiencies.push(tool);
    }
  }

  // Recalculate passive perception in case perception skill was updated
  sheet.passivePerception = 10 + sheet.skills.perception.value;

  return {
    sheet,
    features,
    archetype,
    resources: evidence.resources,
  };
}
