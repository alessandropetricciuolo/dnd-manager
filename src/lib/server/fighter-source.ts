import { getManualMarkdownByFileName, preloadManualMarkdownFile } from './phb-spell-excerpt';
import {
  FIGHTER_CLASS_LEVELS,
  FIGHTER_ARCHETYPE_FEATURES,
  fighterArchetypeFromLabel,
  type FighterChoices,
} from '@/lib/sheet-generator/fighter-archetypes';
import { extractLeveledFeatures, type PrintFeature } from '@/lib/sheet-generator/manual-feature-text';
import { extractManualSubclassFeatures } from '@/lib/sheet-generator/manual-subclass-features';
import { manualSpellFromSources } from './manual-spell-source';
import type { GeneratedCharacterSheet } from '@/lib/sheet-generator/types';

export type FighterResources = {
  secondWind: string;
  actionSurge: number;
  indomitable: number;
  attacksPerAction: number;
  superiorityDice?: { count: number; die: string };
  maneuversCount?: number;
  maneuverDc?: number;
  arcaneShot?: { uses: number; dc: number; optionsCount: number };
  unwaveringMarkAttacks?: number;
  wardingManeuverUses?: number;
  fightingSpirit?: { uses: number; tempHp: number };
  runes?: { count: number; usesPerRune: number; dc: number };
  giantsMight?: { uses: number; extraDamage: string };
  runicShieldUses?: number;
  psionicDice?: { count: number; die: string; dc: number };
  champion?: { critThreshold: string; remarkableAthlete: number; survivor: number };
  cantripsKnown?: number;
  spellsKnown?: number;
  spellSaveDc?: number;
  spellAttackBonus?: number;
};

export type FighterEvidence = {
  classFeatures: PrintFeature[];
  archetypeFeatures: PrintFeature[];
  resources: FighterResources;
};

const THIRD_CASTER_SPELLS_KNOWN: Record<number, number> = {
  1: 0, 2: 0, 3: 3, 4: 4, 5: 4, 6: 4, 7: 5, 8: 6, 9: 6,
  10: 7, 11: 8, 12: 8, 13: 9, 14: 10, 15: 10, 16: 11, 17: 11, 18: 11, 19: 12, 20: 13,
};

export async function loadFighterEvidence(
  sheet: GeneratedCharacterSheet,
  origin?: string,
  choices: FighterChoices = {}
): Promise<FighterEvidence> {
  await preloadManualMarkdownFile('manuale_giocatore.md', origin);
  const raw = getManualMarkdownByFileName('manuale_giocatore.md');
  const start = raw.search(/^# GUERRIERO\s*$/m);
  const end = raw.indexOf('## ARCHETIPI MARZIALI', start);
  const chapter = start >= 0 && end > start ? raw.slice(start, end) : '';
  if (!chapter) throw new Error('Capitolo Guerriero non trovato nel manuale.');

  const classFeatures = extractLeveledFeatures(
    chapter,
    FIGHTER_CLASS_LEVELS,
    sheet.level,
    'Manuale del Giocatore / Guerriero / manuale_giocatore.md'
  );

  for (const [title, unlock] of Object.entries(FIGHTER_CLASS_LEVELS)) {
    if (unlock <= sheet.level && !classFeatures.some((f) => f.title === title)) {
      throw new Error(`Privilegio ${title} non trovato nel manuale.`);
    }
  }

  // If a fighting style is chosen, collapse or highlight it in the main Stile di Combattimento feature
  const styleFeature = classFeatures.find((f) => f.title === 'STILE DI COMBATTIMENTO');
  if (styleFeature && choices.fightingStyle) {
    const header = styleFeature.body.split(/^###\s+/m)[0].trim();
    const styleH = new RegExp(`^###\\s+${choices.fightingStyle}\\s*\\n([\\s\\S]*?)(?=^###|$)`, 'im');
    const m = styleH.exec(styleFeature.body);
    if (m) {
      styleFeature.body = `${header}\n\n**${choices.fightingStyle}:** ${m[1].trim()}`;
    }
    if (sheet.level >= 10 && choices.secondFightingStyle) {
      const secondM = new RegExp(`^###\\s+${choices.secondFightingStyle}\\s*\\n([\\s\\S]*?)(?=^###|$)`, 'im').exec(
        chapter
      );
      if (secondM) {
        styleFeature.body += `\n\n**Secondo stile (${choices.secondFightingStyle}):** ${secondM[1].trim()}`;
      }
    }
  }

  const archetype = fighterArchetypeFromLabel(sheet.classSubclass);
  if (sheet.level >= 3 && sheet.classSubclass && !archetype) {
    throw new Error('Archetipo Marziale non catalogato nei manuali.');
  }

  let archetypeFeatures: PrintFeature[] = [];
  if (sheet.level >= 3 && archetype) {
    const file = archetype.supplementRulesSource.markdownFile;
    await preloadManualMarkdownFile(file, origin);
    archetypeFeatures = extractManualSubclassFeatures(
      getManualMarkdownByFileName(file),
      archetype,
      sheet.level,
      FIGHTER_ARCHETYPE_FEATURES[archetype.slug]
    );
  }

  const resources: FighterResources = {
    secondWind: `1d10 + ${sheet.level}`,
    actionSurge: sheet.level >= 17 ? 2 : 1,
    indomitable: sheet.level >= 17 ? 3 : sheet.level >= 13 ? 2 : sheet.level >= 9 ? 1 : 0,
    attacksPerAction: sheet.level >= 20 ? 4 : sheet.level >= 11 ? 3 : sheet.level >= 5 ? 2 : 1,
  };

  if (archetype?.slug === 'phb-guerriero-maestro-battaglia' && sheet.level >= 3) {
    resources.superiorityDice = {
      count: sheet.level >= 15 ? 6 : sheet.level >= 7 ? 5 : 4,
      die: sheet.level >= 18 ? 'd12' : sheet.level >= 10 ? 'd10' : 'd8',
    };
    resources.maneuversCount = sheet.level >= 15 ? 9 : sheet.level >= 10 ? 7 : sheet.level >= 7 ? 5 : 3;
    resources.maneuverDc = 8 + sheet.proficiencyBonus + Math.max(sheet.abilityMods.str, sheet.abilityMods.dex);
  }

  if (archetype?.slug === 'phb-guerriero-cavaliere-mistico' && sheet.level >= 3) {
    resources.cantripsKnown = sheet.level < 10 ? 2 : 3;
    resources.spellsKnown = THIRD_CASTER_SPELLS_KNOWN[sheet.level] ?? 0;
    resources.spellSaveDc = 8 + sheet.proficiencyBonus + sheet.abilityMods.int;
    resources.spellAttackBonus = sheet.proficiencyBonus + sheet.abilityMods.int;
  }

  if (archetype?.slug === 'xge-guerriero-arciere-arcano' && sheet.level >= 3) {
    resources.arcaneShot = {
      uses: 2,
      dc: 8 + sheet.proficiencyBonus + sheet.abilityMods.int,
      optionsCount: sheet.level >= 18 ? 6 : sheet.level >= 15 ? 5 : sheet.level >= 10 ? 4 : sheet.level >= 7 ? 3 : 2,
    };
  }

  if (archetype?.slug === 'xge-guerriero-cavaliere-errante' && sheet.level >= 3) {
    resources.unwaveringMarkAttacks = Math.max(1, sheet.abilityMods.str);
    if (sheet.level >= 7) {
      resources.wardingManeuverUses = Math.max(1, sheet.abilityMods.con);
    }
  }

  if (archetype?.slug === 'xge-guerriero-samurai' && sheet.level >= 3) {
    resources.fightingSpirit = {
      uses: 3,
      tempHp: sheet.level >= 15 ? 15 : sheet.level >= 10 ? 10 : 5,
    };
  }

  if (archetype?.slug === 'tce-guerriero-runico' && sheet.level >= 3) {
    resources.runes = {
      count: sheet.level >= 15 ? 5 : sheet.level >= 10 ? 4 : sheet.level >= 7 ? 3 : 2,
      usesPerRune: sheet.level >= 15 ? 2 : 1,
      dc: 8 + sheet.proficiencyBonus + sheet.abilityMods.con,
    };
    resources.giantsMight = {
      uses: sheet.proficiencyBonus,
      extraDamage: sheet.level >= 18 ? '1d10' : sheet.level >= 10 ? '1d8' : '1d6',
    };
    if (sheet.level >= 7) {
      resources.runicShieldUses = sheet.proficiencyBonus;
    }
  }

  if (archetype?.slug === 'tce-guerriero-psionico' && sheet.level >= 3) {
    resources.psionicDice = {
      count: 2 * sheet.proficiencyBonus,
      die: sheet.level >= 17 ? 'd12' : sheet.level >= 11 ? 'd10' : sheet.level >= 5 ? 'd8' : 'd6',
      dc: 8 + sheet.proficiencyBonus + sheet.abilityMods.int,
    };
  }

  if (archetype?.slug === 'phb-guerriero-campione' && sheet.level >= 3) {
    resources.champion = {
      critThreshold: sheet.level >= 15 ? '18-20' : '19-20',
      remarkableAthlete: sheet.level >= 7 ? Math.ceil(sheet.proficiencyBonus / 2) : 0,
      survivor: sheet.level >= 18 ? 5 + sheet.abilityMods.con : 0,
    };
  }

  return { classFeatures, archetypeFeatures, resources };
}

export async function addFighterGrantedSpells(
  original: GeneratedCharacterSheet,
  evidence: FighterEvidence,
  choices: FighterChoices = {},
  _torneo = false
): Promise<GeneratedCharacterSheet> {
  const archetype = fighterArchetypeFromLabel(original.classSubclass);
  if (original.level < 3 || !archetype) return original;

  const sheet = structuredClone(original);

  if (archetype.slug === 'xge-guerriero-arciere-arcano') {
    const cantripName = choices.arcaneArcherCantrip ?? 'Prestidigitazione';
    if (!sheet.spells.some((s) => s.name.toLowerCase() === cantripName.toLowerCase())) {
      const spell = manualSpellFromSources(
        cantripName,
        0,
        'Conoscenze dell’Arciere Arcano: trucchetto concesso (Caratteristica: Intelligenza).'
      );
      sheet.spells.push(spell);
      sheet.cantripsKnown = Math.max(sheet.cantripsKnown, 1);
    }
    sheet.spellcastingAbility = 'int';
    sheet.spellcastingClass = 'Guerriero';
    sheet.spellSaveDc = 8 + sheet.proficiencyBonus + sheet.abilityMods.int;
    sheet.spellAttackBonus = sheet.proficiencyBonus + sheet.abilityMods.int;
  }

  if (archetype.slug === 'tce-guerriero-psionico' && original.level >= 18) {
    const name = 'Telecinesi';
    if (!sheet.spells.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      const spell = manualSpellFromSources(
        name,
        5,
        'Maestro della Telecinesi: lancia telecinesi senza componenti. Intelligenza come caratteristica. Un utilizzo gratuito per riposo lungo, poi spendi un dado di Energia Psionica.'
      );
      sheet.spells.push(spell);
    }
    sheet.spellcastingAbility = 'int';
    sheet.spellcastingClass = 'Guerriero';
    sheet.spellSaveDc = 8 + sheet.proficiencyBonus + sheet.abilityMods.int;
    sheet.spellAttackBonus = sheet.proficiencyBonus + sheet.abilityMods.int;
  }

  if (archetype.slug === 'phb-guerriero-cavaliere-mistico') {
    sheet.spellcastingAbility = 'int';
    sheet.spellcastingClass = 'Guerriero';
    sheet.spellSaveDc = 8 + sheet.proficiencyBonus + sheet.abilityMods.int;
    sheet.spellAttackBonus = sheet.proficiencyBonus + sheet.abilityMods.int;
    // Ensure all spells have valid fullTextMd from source manuals
    for (let i = 0; i < sheet.spells.length; i++) {
      const s = sheet.spells[i];
      if (!s.fullTextMd || s.fullTextMd.length < 50) {
        try {
          const loaded = manualSpellFromSources(s.name, s.level);
          sheet.spells[i] = loaded;
        } catch {
          // Keep existing if not found in primary list
        }
      }
    }
  }

  return sheet;
}
