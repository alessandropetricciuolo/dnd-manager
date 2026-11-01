import { getManualMarkdownByFileName, preloadManualMarkdownFile } from './phb-spell-excerpt';
import {
  SORCERER_CLASS_LEVELS,
  SORCERER_ORIGIN_FEATURES,
  SORCERER_METAMAGIC_OPTIONS,
  SORCERER_SLOTS_TABLE,
  SORCERER_KNOWN_SPELLS_TABLE,
  SORCERER_CANTRIPS_KNOWN_TABLE,
  SORCERER_ORIGIN_SPELLS,
  DRACONIC_ANCESTRIES,
  DIVINE_AFFINITY_SPELLS,
  sorcererOriginFromLabel,
  defaultMetamagicForLevel,
  type SorcererChoices,
} from '@/lib/sheet-generator/sorcerer-origins';
import { sorceryPointsForLevel } from '@/lib/sheet-generator/sorcerer-meta';
import { extractLeveledFeatures, type PrintFeature } from '@/lib/sheet-generator/manual-feature-text';
import { extractManualSubclassFeatures } from '@/lib/sheet-generator/manual-subclass-features';
import { manualSpellFromSources } from './manual-spell-source';
import type { GeneratedCharacterSheet, GeneratedSpell } from '@/lib/sheet-generator/types';

export type SorcererResources = {
  sorceryPoints: number;
  spellSaveDc: number;
  spellAttackBonus: number;
  spellsKnown: number;
  cantripsKnown: number;
  metamagic: Array<{ name: string; cost: string; desc: string }>;
  draconicAncestry?: { name: string; damageType: string };
  draconicResilience?: boolean;
  tidesOfChaos?: boolean;
  favoredByTheGods?: boolean;
  divineAffinity?: string;
  eyesOfDarkness?: boolean;
  strengthOfTheGrave?: boolean;
  houndOfIllOmen?: boolean;
  windSpeaker?: boolean;
  tempestuousMagic?: boolean;
  heartOfTheStorm?: boolean;
  restoreBalanceUses?: number;
  telepathicSpeech?: boolean;
};

export type SorcererEvidence = {
  classFeatures: PrintFeature[];
  originFeatures: PrintFeature[];
  resources: SorcererResources;
  slots: Record<number, number>;
  grantedSpells: GeneratedSpell[];
};

export async function loadSorcererEvidence(
  sheet: GeneratedCharacterSheet,
  origin?: string,
  choices: SorcererChoices = {}
): Promise<SorcererEvidence> {
  await preloadManualMarkdownFile('manuale_giocatore.md', origin);
  const raw = getManualMarkdownByFileName('manuale_giocatore.md');
  const start = raw.search(/^# STREGONE\s*$/m);
  const end = raw.indexOf('\n## ORIGINI STREGONESCHE', start);
  if (start < 0 || end < 0) throw new Error('Capitolo Stregone non trovato nel manuale.');
  const chapter = raw.slice(start, end);

  const classFeatures = extractLeveledFeatures(
    chapter,
    SORCERER_CLASS_LEVELS,
    sheet.level,
    'Manuale del Giocatore / Stregone / manuale_giocatore.md'
  );

  for (const [title, unlock] of Object.entries(SORCERER_CLASS_LEVELS)) {
    if (unlock <= sheet.level && !classFeatures.some((f) => f.title === title)) {
      throw new Error(`Privilegio ${title} non trovato nel manuale.`);
    }
  }

  const sorcererOrigin = sorcererOriginFromLabel(sheet.classSubclass);
  if (sheet.level >= 1 && sheet.classSubclass && !sorcererOrigin) {
    throw new Error('Origine Stregonesca non catalogata nei manuali.');
  }

  let originFeatures: PrintFeature[] = [];
  const grantedSpells: GeneratedSpell[] = [];

  if (sheet.level >= 1 && sorcererOrigin) {
    const file = sorcererOrigin.supplementRulesSource.markdownFile;
    await preloadManualMarkdownFile(file, origin);
    originFeatures = extractManualSubclassFeatures(
      getManualMarkdownByFileName(file),
      sorcererOrigin,
      sheet.level,
      SORCERER_ORIGIN_FEATURES[sorcererOrigin.slug] ?? []
    );

    // Granted subclass spells
    const originSpellTiers = SORCERER_ORIGIN_SPELLS[sorcererOrigin.slug] ?? [];
    for (const tier of originSpellTiers) {
      if (tier.sorcererLevel <= sheet.level) {
        for (const spellName of tier.spells) {
          const spell = manualSpellFromSources(spellName, tier.spellLevel);
          if (spell) grantedSpells.push(spell);
        }
      }
    }

    // Divine Soul affinity spell
    if (sorcererOrigin.slug === 'xge-stregone-anima-divina' && sheet.level >= 1) {
      const affinity = choices.divineAffinity ?? 'Bene';
      const affinitySpellName = DIVINE_AFFINITY_SPELLS[affinity] ?? 'Cura Ferite';
      const spell = manualSpellFromSources(affinitySpellName, 1);
      if (spell) grantedSpells.push(spell);
    }
  }

  const chaMod = sheet.abilityMods.cha;
  const slots = SORCERER_SLOTS_TABLE[sheet.level] ?? { 1: 2, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
  const spellsKnown = SORCERER_KNOWN_SPELLS_TABLE[sheet.level] ?? 2;
  const cantripsKnown = SORCERER_CANTRIPS_KNOWN_TABLE[sheet.level] ?? 4;
  const sorceryPoints = sorceryPointsForLevel(sheet.level);

  // Metamagic choices
  const metamagicNames = choices.metamagic?.length ? choices.metamagic : defaultMetamagicForLevel(sheet.level);
  const metamagic = metamagicNames.map((name) => {
    const found = SORCERER_METAMAGIC_OPTIONS.find((m) => m.name.toLowerCase() === name.toLowerCase());
    return found ? { ...found } : { name, cost: '1 pt', desc: '' };
  });

  const resources: SorcererResources = {
    sorceryPoints,
    spellSaveDc: 8 + sheet.proficiencyBonus + chaMod,
    spellAttackBonus: sheet.proficiencyBonus + chaMod,
    spellsKnown,
    cantripsKnown,
    metamagic,
  };

  if (sorcererOrigin?.slug === 'phb-stregone-draconico') {
    const ancestryChoice = choices.draconicAncestry ?? 'Rosso';
    const info = DRACONIC_ANCESTRIES[ancestryChoice] ?? { damageType: 'Fuoco', color: ancestryChoice };
    resources.draconicAncestry = { name: ancestryChoice, damageType: info.damageType };
    resources.draconicResilience = true;
  }

  if (sorcererOrigin?.slug === 'phb-stregone-magia-selvaggia') {
    resources.tidesOfChaos = true;
  }

  if (sorcererOrigin?.slug === 'xge-stregone-anima-divina') {
    resources.favoredByTheGods = true;
    resources.divineAffinity = choices.divineAffinity ?? 'Bene';
  }

  if (sorcererOrigin?.slug === 'xge-stregone-magia-ombre') {
    resources.eyesOfDarkness = true;
    resources.strengthOfTheGrave = true;
    if (sheet.level >= 6) resources.houndOfIllOmen = true;
  }

  if (sorcererOrigin?.slug === 'xge-stregone-tempesta') {
    resources.windSpeaker = true;
    resources.tempestuousMagic = true;
    if (sheet.level >= 6) resources.heartOfTheStorm = true;
  }

  if (sorcererOrigin?.slug === 'tce-stregone-anima-meccanica') {
    resources.restoreBalanceUses = sheet.proficiencyBonus;
  }

  if (sorcererOrigin?.slug === 'tce-stregone-mente-aberrante') {
    resources.telepathicSpeech = true;
  }

  return {
    classFeatures,
    originFeatures,
    resources,
    slots,
    grantedSpells,
  };
}

export function addSorcererGrantedSpells(
  sheet: GeneratedCharacterSheet,
  evidence: SorcererEvidence
): GeneratedCharacterSheet {
  const clone = structuredClone(sheet);
  for (const spell of evidence.grantedSpells) {
    if (!clone.spells.some((s) => s.name.toLowerCase() === spell.name.toLowerCase())) {
      clone.spells.push(spell);
    }
  }
  return clone;
}
