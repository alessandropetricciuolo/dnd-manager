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
          const spell = manualSpellFromSources(
            spellName,
            tier.spellLevel,
            `Magia dell'archetipo (${archetype.label}, livello ${tier.rangerLevel}): conosciuto aggiuntivo, non conta nel limite.`,
            {
              origin: 'subclass',
              sourceLabel: archetype.label,
              ability: 'wis',
              alwaysPrepared: true,
              requiresSlot: true,
            }
          );
          if (spell) {
            grantedSpells.push(spell);
          }
        }
      }
    }

    // Filter Hunter multi-option features to only the chosen option
    if (archetype.slug === 'phb-ranger-cacciatore') {
      const filterSubChoice = (featTitle: string, optionTitle: string) => {
        const feat = archetypeFeatures.find((f) => f.title === featTitle);
        if (!feat) return;
        const esc = optionTitle.replace(/[’‘]/g, "'").replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(`(?:^|\\n)\\*{0,3}${esc}\\.?\\*{0,3}\\s*([\\s\\S]*?)(?=\\n\\*{2,3}[A-ZÀ-Ü]|$)`, 'i');
        const m = re.exec(feat.body.replace(/[’‘]/g, "'"));
        if (m) {
          feat.body = `**${optionTitle}.** ${m[1].trim()}`;
        }
      };
      filterSubChoice('PREDA DEL CACCIATORE', choices.hunterPrey ?? 'Sterminatore di Colossi');
      filterSubChoice('TATTICHE DIFENSIVE', choices.defensiveTactics ?? "Sfuggire all'Orda");
      filterSubChoice('MULTIATTACCO', choices.multiattack ?? 'Raffica');
      filterSubChoice('DIFESA DEL CACCIATORE SUPERIORE', choices.superiorHunterDefense ?? 'Elusione');
    }
  }

  const fightingStyle: RangerFightingStyle = choices.fightingStyle ?? 'Tiro';
  const styleFeature = classFeatures.find((f) => f.title === 'STILE DI COMBATTIMENTO');
  if (styleFeature) {
    const header = styleFeature.body.split(/^###\s+/m)[0].trim();
    const styleH = new RegExp(`^###\\s+${fightingStyle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\n([\\s\\S]*?)(?=^###|$)`, 'im');
    const m = styleH.exec(styleFeature.body);
    if (m) {
      styleFeature.body = `${header}\n\n**${fightingStyle}:** ${m[1].trim()}`;
    }
  }
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
    const spellAtk = pb + wisMod;
    const spellDc = 8 + pb + wisMod;
    const chosenBeast = choices.beastCompanion ?? 'Lupo';
    const beastCatalog: Record<string, RangerCompanion> = {
      Lupo: {
        name: 'Lupo',
        species: 'Lupo (Bestia Media, PHB)',
        hp: Math.max(11, 4 * sheet.level),
        ac: 13 + pb,
        speed: '12 m',
        attackBonus: 4 + pb,
        damage: `2d4 + ${2 + pb} perforante`,
        notes: 'Olfatto e Udito Acuti; Tattiche del Branco. Morso: TS FOR CD 11 o prono.',
      },
      Pantera: {
        name: 'Pantera',
        species: 'Pantera (Bestia Media, PHB)',
        hp: Math.max(13, 4 * sheet.level),
        ac: 12 + pb,
        speed: '15 m, scalare 12 m',
        attackBonus: 4 + pb,
        damage: `1d6 + ${2 + pb} perforante`,
        notes: 'Olfatto Acuto; Balzo (6 m + artigli: TS FOR CD 12 o prono, poi morso con azione bonus).',
      },
      Mastino: {
        name: 'Mastino',
        species: 'Mastino (Bestia Media, PHB)',
        hp: Math.max(5, 4 * sheet.level),
        ac: 12 + pb,
        speed: '12 m',
        attackBonus: 3 + pb,
        damage: `1d6 + ${1 + pb} perforante`,
        notes: 'Olfatto e Udito Acuti. Morso: TS FOR CD 11 o prono.',
      },
      Falco: {
        name: 'Falco',
        species: 'Falco (Bestia Minuscola, PHB)',
        hp: Math.max(1, 4 * sheet.level),
        ac: 13 + pb,
        speed: '3 m, volare 18 m',
        attackBonus: 5 + pb,
        damage: `${1 + pb} tagliente`,
        notes: 'Vista Acuta (vantaggio alle prove di Percezione basate sulla vista).',
      },
      Cinghiale: {
        name: 'Cinghiale',
        species: 'Cinghiale (Bestia Media, PHB)',
        hp: Math.max(11, 4 * sheet.level),
        ac: 11 + pb,
        speed: '12 m',
        attackBonus: 3 + pb,
        damage: `1d6 + ${1 + pb} tagliente`,
        notes: 'Carica (6 m: +1d6 taglienti e TS FOR CD 11 o prono); Implacabile (7 danni o meno -> 1 PF, 1/riposo).',
      },
      'Bestia della Terra': {
        name: 'Bestia della Terra',
        species: 'Compagno Primordiale Media (Tasha)',
        hp: 5 + 5 * sheet.level,
        ac: 13 + pb,
        speed: '12 m, scalare 12 m',
        attackBonus: spellAtk,
        damage: `1d8 + ${2 + pb} tagliente`,
        notes: `Carica (6 m: +1d6 taglienti e TS FOR CD ${spellDc} o prono); Legame Primordiale (+BC a prove e TS).`,
      },
      'Bestia del Cielo': {
        name: 'Bestia del Cielo',
        species: 'Compagno Primordiale Piccola (Tasha)',
        hp: 4 + 4 * sheet.level,
        ac: 13 + pb,
        speed: '3 m, volare 18 m',
        attackBonus: spellAtk,
        damage: `1d4 + ${3 + pb} tagliente`,
        notes: 'Sfuggente (nessun AdO in volo); Legame Primordiale (+BC a prove e TS).',
      },
      'Bestia del Mare': {
        name: 'Bestia del Mare',
        species: 'Compagno Primordiale Media (Tasha)',
        hp: 5 + 5 * sheet.level,
        ac: 13 + pb,
        speed: '1,5 m, nuotare 18 m',
        attackBonus: spellAtk,
        damage: `1d6 + ${2 + pb} cont./perf.`,
        notes: `Anfibia; Legame Primordiale (+BC a prove e TS); Colpo Afferrante (afferrato, CD ${spellDc} per sfuggire).`,
      },
    };
    resources.beastCompanion = beastCatalog[chosenBeast] ?? beastCatalog.Lupo;
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
  const isRangerOrigin = (o?: string) => !o || o === 'class' || o === 'subclass';
  for (const spell of evidence.grantedSpells) {
    if (!clone.spells.some((s) => isRangerOrigin(s.origin) && s.name.toLowerCase() === spell.name.toLowerCase())) {
      clone.spells.push(spell);
    }
  }
  return clone;
}
