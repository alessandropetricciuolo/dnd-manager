import { getManualMarkdownByFileName, preloadManualMarkdownFile } from './phb-spell-excerpt';
import {
  MONK_CLASS_LEVELS,
  MONK_TRADITION_FEATURES,
  monkTraditionFromLabel,
  monkMartialArtsDie,
  monkUnarmoredMovement,
  type MonkChoices,
} from '@/lib/sheet-generator/monk-traditions';
import { extractLeveledFeatures, type PrintFeature } from '@/lib/sheet-generator/manual-feature-text';
import { extractManualSubclassFeatures } from '@/lib/sheet-generator/manual-subclass-features';
import { manualSpellFromSources } from './manual-spell-source';
import type { GeneratedCharacterSheet, GeneratedSpell } from '@/lib/sheet-generator/types';

export type MonkResources = {
  kiPoints: number;
  kiSaveDc: number;
  martialArtsDie: string;
  unarmoredMovement: string;
  deflectMissiles: string;
  wholenessOfBodyHp?: number;
  handOfHealingDice?: string;
  astralArmsDamage?: string;
};

export type MonkEvidence = {
  classFeatures: PrintFeature[];
  traditionFeatures: PrintFeature[];
  resources: MonkResources;
  grantedSpells: GeneratedSpell[];
};

export async function loadMonkEvidence(
  sheet: GeneratedCharacterSheet,
  origin?: string,
  _choices: MonkChoices = {}
): Promise<MonkEvidence> {
  await preloadManualMarkdownFile('manuale_giocatore.md', origin);
  const raw = getManualMarkdownByFileName('manuale_giocatore.md');
  const start = raw.search(/^# MONACO\s*$/m);
  const end = raw.indexOf('\n## TRADIZIONI MONASTICHE', start);
  if (start < 0 || end < 0) throw new Error('Capitolo Monaco non trovato nel manuale.');
  const chapter = raw.slice(start, end);

  const classFeatures = extractLeveledFeatures(
    chapter,
    MONK_CLASS_LEVELS,
    sheet.level,
    'Manuale del Giocatore / Monaco / manuale_giocatore.md'
  );

  for (const [title, unlock] of Object.entries(MONK_CLASS_LEVELS)) {
    if (unlock <= sheet.level && !classFeatures.some((f) => f.title === title)) {
      throw new Error(`Privilegio ${title} non trovato nel manuale.`);
    }
  }

  const tradition = monkTraditionFromLabel(sheet.classSubclass);
  if (sheet.level >= 3 && sheet.classSubclass && !tradition) {
    throw new Error('Tradizione Monastica non catalogata nei manuali.');
  }

  let traditionFeatures: PrintFeature[] = [];
  const grantedSpells: GeneratedSpell[] = [];

  if (sheet.level >= 3 && tradition) {
    const file = tradition.supplementRulesSource.markdownFile;
    await preloadManualMarkdownFile(file, origin);
    traditionFeatures = extractManualSubclassFeatures(
      getManualMarkdownByFileName(file),
      tradition,
      sheet.level,
      MONK_TRADITION_FEATURES[tradition.slug]
    );

    if (tradition.slug === 'phb-monaco-ombra') {
      grantedSpells.push(
        manualSpellFromSources(
          'Illusione Minore',
          0,
          'Trucchetto aggiuntivo concesso dalla Via dell’Ombra (Arti dell’Ombra).',
          {
            origin: 'subclass',
            sourceLabel: tradition.label,
            ability: 'wis',
            alwaysPrepared: true,
            requiresSlot: false,
          }
        )
      );
    }
  }

  const die = monkMartialArtsDie(sheet.level);
  const movement = monkUnarmoredMovement(sheet.level);
  const resources: MonkResources = {
    kiPoints: sheet.level >= 2 ? sheet.level : 0,
    kiSaveDc: 8 + sheet.proficiencyBonus + sheet.abilityMods.wis,
    martialArtsDie: die,
    unarmoredMovement: movement,
    deflectMissiles: `1d10 + DES + ${sheet.level}`,
  };

  if (tradition?.slug === 'phb-monaco-mano-aperta' && sheet.level >= 6) {
    resources.wholenessOfBodyHp = 3 * sheet.level;
  }
  if (tradition?.slug === 'tce-monaco-misericordia' && sheet.level >= 3) {
    resources.handOfHealingDice = `${die} + ${sheet.abilityMods.wis}`;
  }
  if (tradition?.slug === 'tce-monaco-se-astrale' && sheet.level >= 3) {
    resources.astralArmsDamage = `2d${die.replace(/^1d/, '')} forza`;
  }

  return {
    classFeatures,
    traditionFeatures,
    resources,
    grantedSpells,
  };
}

export function addMonkGrantedSpells(
  sheet: GeneratedCharacterSheet,
  evidence: MonkEvidence
): GeneratedCharacterSheet {
  const clone = structuredClone(sheet);
  const isMonkOrigin = (o?: string) => !o || o === 'class' || o === 'subclass';
  for (const spell of evidence.grantedSpells) {
    if (!clone.spells.some((s) => isMonkOrigin(s.origin) && s.name.toLowerCase() === spell.name.toLowerCase())) {
      clone.spells.push(spell);
    }
  }
  return clone;
}
