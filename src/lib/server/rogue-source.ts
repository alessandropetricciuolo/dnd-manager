import { getManualMarkdownByFileName, preloadManualMarkdownFile } from './phb-spell-excerpt';
import {
  ROGUE_CLASS_LEVELS,
  ROGUE_ARCHETYPE_FEATURES,
  rogueArchetypeFromLabel,
  type RogueChoices,
} from '@/lib/sheet-generator/rogue-archetypes';
import { sneakAttackDiceForLevel } from '@/lib/sheet-generator/rogue-meta';
import { extractLeveledFeatures, type PrintFeature } from '@/lib/sheet-generator/manual-feature-text';
import { extractManualSubclassFeatures } from '@/lib/sheet-generator/manual-subclass-features';
import { manualSpellFromSources } from './manual-spell-source';
import type { GeneratedCharacterSheet } from '@/lib/sheet-generator/types';

export type RogueResources = {
  sneakAttackDice: number;
  sneakAttackDamage: string;
  cantripsKnown?: number;
  spellsKnown?: number;
  spellSaveDc?: number;
  spellAttackBonus?: number;
  psionicDice?: { count: number; die: string };
  wailsFromTheGraveUses?: number;
  wailsDamageDice?: number;
  soulTrinketsMax?: number;
  infallibleEyeUses?: number;
  initiativeChaBonus?: number;
  superiorMobility?: number;
  deathStrikeDc?: number;
};

export type RogueEvidence = {
  classFeatures: PrintFeature[];
  archetypeFeatures: PrintFeature[];
  resources: RogueResources;
};

const THIRD_CASTER_SPELLS_KNOWN: Record<number, number> = {
  1: 0, 2: 0, 3: 3, 4: 4, 5: 4, 6: 4, 7: 5, 8: 6, 9: 6,
  10: 7, 11: 8, 12: 8, 13: 9, 14: 10, 15: 10, 16: 11, 17: 11, 18: 11, 19: 12, 20: 13,
};

export async function loadRogueEvidence(
  sheet: GeneratedCharacterSheet,
  origin?: string,
  _choices: RogueChoices = {}
): Promise<RogueEvidence> {
  await preloadManualMarkdownFile('manuale_giocatore.md', origin);
  const raw = getManualMarkdownByFileName('manuale_giocatore.md');
  const start = raw.search(/^# LADRO\s*$/m);
  const end = raw.indexOf('# ARCHETIPI LADRESCHI', start);
  const chapter = start >= 0 && end > start ? raw.slice(start, end) : '';
  if (!chapter) throw new Error('Capitolo Ladro non trovato nel manuale.');

  const classFeatures = extractLeveledFeatures(
    chapter,
    ROGUE_CLASS_LEVELS,
    sheet.level,
    'Manuale del Giocatore / Ladro / manuale_giocatore.md'
  );

  for (const [title, unlock] of Object.entries(ROGUE_CLASS_LEVELS)) {
    if (unlock <= sheet.level && !classFeatures.some((f) => f.title === title)) {
      throw new Error(`Privilegio ${title} non trovato nel manuale.`);
    }
  }

  const archetype = rogueArchetypeFromLabel(sheet.classSubclass);
  if (sheet.level >= 3 && sheet.classSubclass && !archetype) {
    throw new Error('Archetipo Ladresco non catalogato nei manuali.');
  }

  let archetypeFeatures: PrintFeature[] = [];
  if (sheet.level >= 3 && archetype) {
    const file = archetype.supplementRulesSource.markdownFile;
    await preloadManualMarkdownFile(file, origin);
    archetypeFeatures = extractManualSubclassFeatures(
      getManualMarkdownByFileName(file),
      archetype,
      sheet.level,
      ROGUE_ARCHETYPE_FEATURES[archetype.slug]
    );
  }

  const sneakDice = sneakAttackDiceForLevel(sheet.level);
  const resources: RogueResources = {
    sneakAttackDice: sneakDice,
    sneakAttackDamage: `${sneakDice}d6`,
  };

  if (archetype?.slug === 'phb-ladro-mistificatore-arcano' && sheet.level >= 3) {
    resources.cantripsKnown = sheet.level < 10 ? 3 : 4;
    resources.spellsKnown = THIRD_CASTER_SPELLS_KNOWN[sheet.level] ?? 0;
    resources.spellSaveDc = 8 + sheet.proficiencyBonus + sheet.abilityMods.int;
    resources.spellAttackBonus = sheet.proficiencyBonus + sheet.abilityMods.int;
  }

  if (archetype?.slug === 'tce-ladro-lama-spirituale' && sheet.level >= 3) {
    resources.psionicDice = {
      count: 2 * sheet.proficiencyBonus,
      die: sheet.level >= 17 ? 'd12' : sheet.level >= 11 ? 'd10' : sheet.level >= 5 ? 'd8' : 'd6',
    };
  }

  if (archetype?.slug === 'tce-ladro-fantasma' && sheet.level >= 3) {
    resources.wailsFromTheGraveUses = sheet.proficiencyBonus;
    resources.wailsDamageDice = Math.ceil(sneakDice / 2);
    if (sheet.level >= 9) {
      resources.soulTrinketsMax = sheet.proficiencyBonus;
    }
  }

  if (archetype?.slug === 'xge-ladro-indagatore' && sheet.level >= 3) {
    if (sheet.level >= 13) {
      resources.infallibleEyeUses = Math.max(1, sheet.abilityMods.wis);
    }
  }

  if (archetype?.slug === 'xge-ladro-spadaccino' && sheet.level >= 3) {
    resources.initiativeChaBonus = sheet.abilityMods.cha;
  }

  if (archetype?.slug === 'xge-ladro-esploratore' && sheet.level >= 3) {
    if (sheet.level >= 9) {
      resources.superiorMobility = 3;
    }
  }

  if (archetype?.slug === 'phb-ladro-assassino' && sheet.level >= 17) {
    resources.deathStrikeDc = 8 + sheet.proficiencyBonus + sheet.abilityMods.dex;
  }

  return { classFeatures, archetypeFeatures, resources };
}

export async function addRogueGrantedSpells(
  original: GeneratedCharacterSheet,
  _evidence: RogueEvidence,
  choices: RogueChoices = {},
  _torneo = false
): Promise<GeneratedCharacterSheet> {
  const archetype = rogueArchetypeFromLabel(original.classSubclass);
  if (original.level < 3 || archetype?.slug !== 'phb-ladro-mistificatore-arcano') return original;

  const sheet = structuredClone(original);
  const isRogueOrigin = (o?: string) => !o || o === 'class' || o === 'subclass';

  // Mistificatore Arcano automatically learns Mano Magica (Mage Hand) at level 3
  if (!sheet.spells.some((s) => isRogueOrigin(s.origin) && s.name.toLowerCase() === 'mano magica')) {
    const mageHand = manualSpellFromSources(
      'Mano magica',
      0,
      'Trucchetto concesso dal Mistificatore Arcano (Gioco di Prestigio con Mano Magica).',
      {
        origin: 'subclass',
        sourceLabel: 'Mistificatore Arcano',
        ability: 'int',
        alwaysPrepared: true,
        requiresSlot: false,
      }
    );
    if (mageHand) {
      sheet.spells.unshift(mageHand);
      sheet.cantripsKnown = Math.max(
        sheet.cantripsKnown,
        sheet.spells.filter((s) => isRogueOrigin(s.origin) && s.level === 0).length
      );
    }
  }

  if (choices.arcaneTricksterCantrip) {
    const cantrip = manualSpellFromSources(choices.arcaneTricksterCantrip, 0, '', {
      origin: 'class',
      sourceLabel: 'Mistificatore Arcano',
      ability: 'int',
      alwaysPrepared: false,
      requiresSlot: false,
    });
    if (cantrip && !sheet.spells.some((s) => isRogueOrigin(s.origin) && s.name.toLowerCase() === cantrip.name.toLowerCase())) {
      sheet.spells.push(cantrip);
      sheet.cantripsKnown = Math.max(
        sheet.cantripsKnown,
        sheet.spells.filter((s) => isRogueOrigin(s.origin) && s.level === 0).length
      );
    }
  }

  return sheet;
}
