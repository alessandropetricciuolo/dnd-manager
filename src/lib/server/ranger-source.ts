import { getManualMarkdownByFileName, preloadManualMarkdownFile } from './phb-spell-excerpt';
import {
  RANGER_CLASS_LEVELS,
  RANGER_ARCHETYPE_FEATURES,
  RANGER_SLOTS_TABLE,
  RANGER_KNOWN_SPELLS_TABLE,
  RANGER_ARCHETYPE_SPELLS,
  rangerArchetypeFromLabel,
  type RangerChoices,
  type RangerFightingStyle,
} from '@/lib/sheet-generator/ranger-archetypes';
import {
  favoredEnemyCountForLevel,
  favoredTerrainCountForLevel,
  pickRangerFavoredEnemies,
  pickRangerFavoredTerrains,
} from '@/lib/sheet-generator/ranger-meta';
import { extractLeveledFeatures, type PrintFeature } from '@/lib/sheet-generator/manual-feature-text';
import { extractManualSubclassFeatures } from '@/lib/sheet-generator/manual-subclass-features';
import { manualSpellFromSources } from './manual-spell-source';
import type { GeneratedCharacterSheet, GeneratedSpell } from '@/lib/sheet-generator/types';

export type RangerCompanion = {
  name: string;
  species: string;
  hp: number;
  ac: number;
  speed: string;
  attackBonus: number;
  damage: string;
  notes: string;
};

export type RangerResources = {
  spellSaveDc: number;
  spellAttackBonus: number;
  spellsKnown: number;
  fightingStyle: RangerFightingStyle;
  favoredEnemies: string[];
  favoredTerrains: string[];
  dreadAmbusherInitiative?: number;
  huntersSenseUses?: number;
  slayersPreyDamage?: string;
  planarWarriorDamage?: string;
  gatheredSwarmDamage?: string;
  writhingTideUses?: number;
  dreadfulStrikesDamage?: string;
  otherworldlyGlamourBonus?: number;
  beastCompanion?: RangerCompanion;
};

export type RangerEvidence = {
  classFeatures: PrintFeature[];
  archetypeFeatures: PrintFeature[];
  resources: RangerResources;
  slots: Record<number, number>;
  grantedSpells: GeneratedSpell[];
};

export async function loadRangerEvidence(
  sheet: GeneratedCharacterSheet,
  origin?: string,
  choices: RangerChoices = {}
): Promise<RangerEvidence> {
  await preloadManualMarkdownFile('manuale_giocatore.md', origin);
  const raw = getManualMarkdownByFileName('manuale_giocatore.md');
  const start = raw.search(/^# RANGER\s*$/m);
  const end = raw.indexOf('\n## ARCHETIPI RANGER', start);
  if (start < 0 || end < 0) throw new Error('Capitolo Ranger non trovato nel manuale.');
  const chapter = raw.slice(start, end);

  const classFeatures = extractLeveledFeatures(
    chapter,
    RANGER_CLASS_LEVELS,
    sheet.level,
    'Manuale del Giocatore / Ranger / manuale_giocatore.md'
  );

  for (const [title, unlock] of Object.entries(RANGER_CLASS_LEVELS)) {
    if (unlock <= sheet.level && !classFeatures.some((f) => f.title === title)) {
      throw new Error(`Privilegio ${title} non trovato nel manuale.`);
    }
  }

  const archetype = rangerArchetypeFromLabel(sheet.classSubclass);
  if (sheet.level >= 3 && sheet.classSubclass && !archetype) {
    throw new Error('Archetipo Ranger non catalogato nei manuali.');
  }

  let archetypeFeatures: PrintFeature[] = [];
  const grantedSpells: GeneratedSpell[] = [];

  if (sheet.level >= 3 && archetype) {
    const file = archetype.supplementRulesSource.markdownFile;
    await preloadManualMarkdownFile(file, origin);
    archetypeFeatures = extractManualSubclassFeatures(
      getManualMarkdownByFileName(file),
      archetype,
      sheet.level,
      RANGER_ARCHETYPE_FEATURES[archetype.slug] ?? []
    );

    // Load granted archetype spells
    const archetypeSpellTiers = RANGER_ARCHETYPE_SPELLS[archetype.slug] ?? [];
    for (const tier of archetypeSpellTiers) {
      if (tier.rangerLevel <= sheet.level) {
        for (const spellName of tier.spells) {
          const spell = manualSpellFromSources(spellName, tier.spellLevel);
          if (spell) {
            grantedSpells.push(spell);
          }
        }
      }
    }
  }

  const fightingStyle: RangerFightingStyle = choices.fightingStyle ?? 'Tiro';
  const wisMod = sheet.abilityMods.wis;
  const slots = RANGER_SLOTS_TABLE[sheet.level] ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const spellsKnown = RANGER_KNOWN_SPELLS_TABLE[sheet.level] ?? 0;

  const enemyCount = favoredEnemyCountForLevel(sheet.level);
  const terrainCount = favoredTerrainCountForLevel(sheet.level);
  const defaultSeed = `${sheet.characterName || 'Ranger'}|${sheet.classSubclass || ''}|${sheet.level}`;
  const defaultEnemies = pickRangerFavoredEnemies(defaultSeed, sheet.level);
  const defaultTerrains = pickRangerFavoredTerrains(defaultSeed, sheet.level);

  const favoredEnemies =
    choices.favoredEnemies && choices.favoredEnemies.length === enemyCount
      ? choices.favoredEnemies
      : defaultEnemies;
  const favoredTerrains =
    choices.favoredTerrains && choices.favoredTerrains.length === terrainCount
      ? choices.favoredTerrains
      : defaultTerrains;

  const resources: RangerResources = {
    spellSaveDc: 8 + sheet.proficiencyBonus + wisMod,
    spellAttackBonus: sheet.proficiencyBonus + wisMod,
    spellsKnown,
    fightingStyle,
    favoredEnemies,
    favoredTerrains,
  };

  if (archetype?.slug === 'xge-ranger-tenebre' && sheet.level >= 3) {
    resources.dreadAmbusherInitiative = wisMod;
  }

  if (archetype?.slug === 'xge-ranger-uccisore-mostri' && sheet.level >= 3) {
    resources.huntersSenseUses = Math.max(1, wisMod);
    resources.slayersPreyDamage = '1d6';
  }

  if (archetype?.slug === 'xge-ranger-viandante-orizzonte' && sheet.level >= 3) {
    resources.planarWarriorDamage = sheet.level >= 11 ? '2d8 forza' : '1d8 forza';
  }

  if (archetype?.slug === 'tce-ranger-custode-sciami' && sheet.level >= 3) {
    resources.gatheredSwarmDamage = sheet.level >= 11 ? '1d8 perforante' : '1d6 perforante';
    resources.writhingTideUses = sheet.proficiencyBonus;
  }

  if (archetype?.slug === 'tce-ranger-viandante-fatato' && sheet.level >= 3) {
    resources.dreadfulStrikesDamage = sheet.level >= 11 ? '1d6 psichico' : '1d4 psichico';
    resources.otherworldlyGlamourBonus = Math.max(1, wisMod);
  }

  if (archetype?.slug === 'phb-ranger-signore-bestie' && sheet.level >= 3) {
    const pb = sheet.proficiencyBonus;
    resources.beastCompanion = {
      name: 'Lupo',
      species: 'Lupo (Bestia Media)',
      hp: Math.max(11, 4 * sheet.level),
      ac: 13 + pb,
      speed: '12 m',
      attackBonus: 4 + pb,
      damage: `2d4 + ${2 + pb} perforante`,
      notes: 'Olfatto e Udito Acuti (vantaggio Percezione); Tattica di Branco (vantaggio attacco con alleati adiacenti). Se colpisce, TS FOR CD 11 o prono.',
    };
  }

  return {
    classFeatures,
    archetypeFeatures,
    resources,
    slots,
    grantedSpells,
  };
}

export function addRangerGrantedSpells(
  sheet: GeneratedCharacterSheet,
  evidence: RangerEvidence
): GeneratedCharacterSheet {
  const clone = structuredClone(sheet);
  for (const spell of evidence.grantedSpells) {
    if (!clone.spells.some((s) => s.name.toLowerCase() === spell.name.toLowerCase())) {
      clone.spells.push(spell);
    }
  }
  return clone;
}
