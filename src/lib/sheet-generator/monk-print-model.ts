import type { GeneratedCharacterSheet } from './types';
import {
  monkTraditionFromLabel,
  monkUnarmoredMovementMeters,
  type MonkChoices,
  KENSEI_MELEE_WEAPONS,
  KENSEI_RANGED_WEAPONS,
} from './monk-traditions';
import type { MonkEvidence, MonkResources } from '@/lib/server/monk-source';
import type { PrintFeature } from './manual-feature-text';

export type MonkPrintModel = {
  sheet: GeneratedCharacterSheet;
  features: PrintFeature[];
  resources: MonkResources;
};

export function buildMonkPrintModel(
  original: GeneratedCharacterSheet,
  evidence: MonkEvidence,
  choices: MonkChoices = {}
): MonkPrintModel {
  if (original.classLabel !== 'Monaco') throw new Error('Classe Monaco richiesta.');
  const sheet = structuredClone(original);
  const tradition = monkTraditionFromLabel(sheet.classSubclass);
  if (sheet.classSubclass && !tradition) throw new Error('Tradizione Monastica non catalogata nei manuali.');

  if (sheet.level < 3) {
    sheet.classSubclass = null;
    sheet.subclassFeaturesMd = null;
  }

  const features: PrintFeature[] = [...evidence.classFeatures, ...evidence.traditionFeatures]
    .filter((f) => f.level <= sheet.level)
    .map((f) => ({ ...f }));

  if (!features.some((f) => f.title === 'ARTI MARZIALI')) {
    throw new Error('Regola Arti Marziali non risolta dal manuale.');
  }

  // Difesa Senza Armatura: CA = 10 + DES + SAG
  const unarmoredAc = 10 + sheet.abilityMods.dex + sheet.abilityMods.wis;
  if (sheet.armorClass < unarmoredAc) {
    sheet.armorClass = unarmoredAc;
  }

  // Movimento Senza Armatura
  const bonusMeters = monkUnarmoredMovementMeters(sheet.level);
  if (bonusMeters > 0) {
    const baseMatch = sheet.speed.match(/^(\d+(?:[.,]\d+)?)\s*m/);
    const base = baseMatch ? parseFloat(baseMatch[1].replace(',', '.')) : 9;
    const total = base + bonusMeters;
    sheet.speed = `${total.toString().replace('.', ',')} m (+${bonusMeters.toString().replace('.', ',')} m senza armatura)`;
  }

  // Anima Adamantina (Livello 14+): competenza in TUTTI i tiri salvezza
  if (sheet.level >= 14) {
    for (const k of ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const) {
      if (!sheet.savingThrows[k].proficient) {
        sheet.savingThrows[k].proficient = true;
        sheet.savingThrows[k].value += sheet.proficiencyBonus;
      }
    }
  }

  // Subclass: Via del Maestro Ubriaco (Livello 3+)
  if (tradition?.slug === 'xge-monaco-maestro-ubriaco' && sheet.level >= 3) {
    if (!sheet.skills.performance.proficient) {
      sheet.skills.performance.proficient = true;
      sheet.skills.performance.value = sheet.abilityMods.cha + sheet.proficiencyBonus;
    }
    if (!sheet.toolProficiencies.includes('Strumenti da spillatore')) {
      sheet.toolProficiencies.push('Strumenti da spillatore');
    }
  }

  // Subclass: Via della Misericordia (Livello 3+)
  if (tradition?.slug === 'tce-monaco-misericordia' && sheet.level >= 3) {
    if (!sheet.skills.insight.proficient) {
      sheet.skills.insight.proficient = true;
      sheet.skills.insight.value = sheet.abilityMods.wis + sheet.proficiencyBonus;
    }
    if (!sheet.skills.medicine.proficient) {
      sheet.skills.medicine.proficient = true;
      sheet.skills.medicine.value = sheet.abilityMods.wis + sheet.proficiencyBonus;
    }
    if (!sheet.toolProficiencies.includes('Borsa da erborista')) {
      sheet.toolProficiencies.push('Borsa da erborista');
    }
  }

  // Subclass: Via del Kensei (Livello 3+)
  if (tradition?.slug === 'xge-monaco-kensei' && sheet.level >= 3) {
    const melee =
      choices.kenseiMeleeWeapon && KENSEI_MELEE_WEAPONS.includes(choices.kenseiMeleeWeapon as typeof KENSEI_MELEE_WEAPONS[number])
        ? choices.kenseiMeleeWeapon
        : 'Spada lunga';
    const ranged =
      choices.kenseiRangedWeapon && KENSEI_RANGED_WEAPONS.includes(choices.kenseiRangedWeapon as typeof KENSEI_RANGED_WEAPONS[number])
        ? choices.kenseiRangedWeapon
        : 'Arco lungo';

    if (!sheet.weaponProficiencies.includes(melee)) {
      sheet.weaponProficiencies.push(melee);
    }
    if (!sheet.weaponProficiencies.includes(ranged)) {
      sheet.weaponProficiencies.push(ranged);
    }
    if (!sheet.toolProficiencies.includes('Strumenti da calligrafo')) {
      sheet.toolProficiencies.push('Strumenti da calligrafo');
    }
  }

  // Arti Marziali: Colpo senz'armi e armi da monaco usano il migliore tra FOR e DES e scalano col dado Arti Marziali
  const maDieFaces = Number(evidence.resources.martialArtsDie.replace(/^1d/i, '')) || 4;
  const bestMartialMod = Math.max(sheet.abilityMods.str, sheet.abilityMods.dex);
  const bestToHit = sheet.proficiencyBonus + bestMartialMod;
  const toHitStr = bestToHit >= 0 ? `+${bestToHit}` : `${bestToHit}`;
  const modSuffix =
    bestMartialMod > 0 ? `+${bestMartialMod}` : bestMartialMod < 0 ? `${bestMartialMod}` : '';

  const kenseiChosen =
    tradition?.slug === 'xge-monaco-kensei' && sheet.level >= 3
      ? [
          (choices.kenseiMeleeWeapon ?? 'Spada lunga').toLowerCase(),
          (choices.kenseiRangedWeapon ?? 'Arco lungo').toLowerCase(),
        ]
      : [];

  const isMonkWeaponName = (name: string) => {
    const n = name.toLowerCase();
    if (/colpo senz['’]armi/i.test(n)) return true;
    if (kenseiChosen.some((kw) => n.includes(kw))) return true;
    return /spada corta|bastone ferrato|pugnale|clava|ascia|falcetto|giavellotto|lancia|martello leggero|mazza/i.test(n);
  };

  sheet.weaponRows = sheet.weaponRows.map((row) => {
    if (!isMonkWeaponName(row.name)) return row;
    const isUnarmed = /colpo senz['’]armi/i.test(row.name);
    const dmgMatch = row.damage.match(/^(\d+)d(\d+)/i);
    const currentCount = dmgMatch ? Number(dmgMatch[1]) : 1;
    const currentFaces = dmgMatch ? Number(dmgMatch[2]) : 4;
    const effectiveDie =
      isUnarmed || (currentCount === 1 && currentFaces < maDieFaces)
        ? `1d${maDieFaces}`
        : dmgMatch
          ? `${currentCount}d${currentFaces}`
          : evidence.resources.martialArtsDie;
    return {
      ...row,
      toHit: toHitStr,
      damage: `${effectiveDie}${modSuffix}`,
    };
  });

  // Granted spells
  const isMonkOrigin = (o?: string) => !o || o === 'class' || o === 'subclass';
  for (const spell of evidence.grantedSpells) {
    if (!sheet.spells.some((s) => isMonkOrigin(s.origin) && s.name.toLowerCase() === spell.name.toLowerCase())) {
      sheet.spells.push(spell);
    }
  }

  return {
    sheet,
    features,
    resources: evidence.resources,
  };
}
