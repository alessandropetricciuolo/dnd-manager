import { getManualMarkdownByFileName, preloadManualMarkdownFile } from './phb-spell-excerpt';
import {
  PALADIN_CLASS_LEVELS,
  PALADIN_OATH_FEATURES,
  PALADIN_SLOTS_TABLE,
  PALADIN_OATH_SPELLS,
  paladinOathFromLabel,
  paladinSpellsPrepared,
  type PaladinChoices,
} from '@/lib/sheet-generator/paladin-oaths';
import { extractLeveledFeatures, type PrintFeature } from '@/lib/sheet-generator/manual-feature-text';
import { extractManualSubclassFeatures } from '@/lib/sheet-generator/manual-subclass-features';
import { manualSpellFromSources } from './manual-spell-source';
import type { GeneratedCharacterSheet, GeneratedSpell } from '@/lib/sheet-generator/types';

export type PaladinResources = {
  layOnHandsPool: number;
  divineSenseUses: number;
  channelDivinityUses: number;
  cleansingTouchUses: number;
  spellsPrepared: number;
  spellSaveDc: number;
  spellAttackBonus: number;
  fightingStyle: string;
  conquestAuraDamage?: number;
  sentinelSmiteDamage?: string;
};

export type PaladinEvidence = {
  classFeatures: PrintFeature[];
  traditionFeatures: PrintFeature[];
  resources: PaladinResources;
  slots: Record<number, number>;
  grantedSpells: GeneratedSpell[];
};

export async function loadPaladinEvidence(
  sheet: GeneratedCharacterSheet,
  origin?: string,
  choices: PaladinChoices = {}
): Promise<PaladinEvidence> {
  await preloadManualMarkdownFile('manuale_giocatore.md', origin);
  const raw = getManualMarkdownByFileName('manuale_giocatore.md');
  const start = raw.search(/^# PALADINO\s*$/m);
  const end = raw.indexOf('\n## GIURAMENTI SACRI', start);
  if (start < 0 || end < 0) throw new Error('Capitolo Paladino non trovato nel manuale.');
  const chapter = raw.slice(start, end);

  const classFeatures = extractLeveledFeatures(
    chapter,
    PALADIN_CLASS_LEVELS,
    sheet.level,
    'Manuale del Giocatore / Paladino / manuale_giocatore.md'
  );

  for (const [title, unlock] of Object.entries(PALADIN_CLASS_LEVELS)) {
    if (unlock <= sheet.level && !classFeatures.some((f) => f.title === title)) {
      throw new Error(`Privilegio ${title} non trovato nel manuale.`);
    }
  }

  const oath = paladinOathFromLabel(sheet.classSubclass);
  if (sheet.level >= 3 && sheet.classSubclass && !oath) {
    throw new Error('Giuramento Sacro non catalogato nei manuali.');
  }

  let traditionFeatures: PrintFeature[] = [];
  const grantedSpells: GeneratedSpell[] = [];

  if (sheet.level >= 3 && oath) {
    const file = oath.supplementRulesSource.markdownFile;
    await preloadManualMarkdownFile(file, origin);
    traditionFeatures = extractManualSubclassFeatures(
      getManualMarkdownByFileName(file),
      oath,
      sheet.level,
      PALADIN_OATH_FEATURES[oath.slug] ?? []
    );

    // Load granted oath spells
    const oathSpellTiers = PALADIN_OATH_SPELLS[oath.slug] ?? [];
    for (const tier of oathSpellTiers) {
      if (tier.paladinLevel <= sheet.level) {
        for (const spellName of tier.spells) {
          const spell = manualSpellFromSources(
            spellName,
            tier.spellLevel,
            `Sempre preparato: incantesimo di giuramento (${oath.label}, livello ${tier.paladinLevel}). Non conta nel limite giornaliero.`,
            {
              origin: 'subclass',
              sourceLabel: oath.label,
              ability: 'cha',
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
  }

  const fightingStyle = choices.fightingStyle ?? 'Difesa';
  const styleFeature = classFeatures.find((f) => f.title === 'STILE DI COMBATTIMENTO');
  if (styleFeature) {
    const header = styleFeature.body.split(/^###\s+/m)[0].trim();
    const styleH = new RegExp(`^###\\s+${fightingStyle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\n([\\s\\S]*?)(?=^###|$)`, 'im');
    const m = styleH.exec(styleFeature.body);
    if (m) {
      styleFeature.body = `${header}\n\n**${fightingStyle}:** ${m[1].trim()}`;
    }
  }
  const chaMod = sheet.abilityMods.cha;
  const slots = PALADIN_SLOTS_TABLE[sheet.level] ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  const resources: PaladinResources = {
    layOnHandsPool: 5 * sheet.level,
    divineSenseUses: Math.max(1, 1 + chaMod),
    channelDivinityUses: sheet.level >= 3 ? 1 : 0,
    cleansingTouchUses: sheet.level >= 14 ? Math.max(1, chaMod) : 0,
    spellsPrepared: paladinSpellsPrepared(sheet.level, chaMod),
    spellSaveDc: 8 + sheet.proficiencyBonus + chaMod,
    spellAttackBonus: sheet.proficiencyBonus + chaMod,
    fightingStyle,
  };

  if (oath?.slug === 'xge-paladino-conquista' && sheet.level >= 7) {
    resources.conquestAuraDamage = Math.floor(sheet.level / 2);
  }
  if (oath?.slug === 'tce-paladino-sentinelle' && sheet.level >= 15) {
    resources.sentinelSmiteDamage = `2d8 + ${Math.max(0, chaMod)}`;
  }

  return {
    classFeatures,
    traditionFeatures,
    resources,
    slots,
    grantedSpells,
  };
}

export function addPaladinGrantedSpells(
  sheet: GeneratedCharacterSheet,
  evidence: PaladinEvidence
): GeneratedCharacterSheet {
  const clone = structuredClone(sheet);
  const isPaladinOrigin = (o?: string) => !o || o === 'class' || o === 'subclass';
  for (const spell of evidence.grantedSpells) {
    const idx = clone.spells.findIndex(
      (s) => isPaladinOrigin(s.origin) && s.name.toLowerCase() === spell.name.toLowerCase()
    );
    if (idx < 0) {
      clone.spells.push(spell);
    } else {
      clone.spells[idx] = spell;
    }
  }
  return clone;
}
