import { getManualMarkdownByFileName, preloadManualMarkdownFile } from './phb-spell-excerpt';
import {
  WIZARD_CLASS_LEVELS,
  WIZARD_TRADITION_FEATURES,
  wizardTraditionFromLabel,
  type WizardChoices,
} from '@/lib/sheet-generator/wizard-traditions';
import { extractLeveledFeatures, printPlainText, type PrintFeature } from '@/lib/sheet-generator/manual-feature-text';
import { extractManualSubclassFeatures } from '@/lib/sheet-generator/manual-subclass-features';
import { manualSpellFromSources } from './manual-spell-source';
import type { GeneratedCharacterSheet, GeneratedSpell } from '@/lib/sheet-generator/types';

export type WizardResources = {
  arcaneRecoveryLevels: number;
  spellsPrepared: number;
  cantripsKnown: number;
  spellSaveDc: number;
  spellAttackBonus: number;
  arcaneWardHp?: number;
  portentDiceCount?: number;
  powerSurgeMax?: number;
  powerSurgeDamage?: number;
  bladesongUses?: number;
  bladesongAcBonus?: number;
  manifestMindUses?: number;
};

export type WizardEvidence = {
  classFeatures: PrintFeature[];
  traditionFeatures: PrintFeature[];
  slots: GeneratedCharacterSheet['spellSlots'];
  cantrips: number;
  resources: WizardResources;
  grantedSpells: GeneratedSpell[];
};

export async function loadWizardEvidence(
  sheet: GeneratedCharacterSheet,
  origin?: string,
  _choices: WizardChoices = {}
): Promise<WizardEvidence> {
  await preloadManualMarkdownFile('manuale_giocatore.md', origin);
  const raw = getManualMarkdownByFileName('manuale_giocatore.md');
  const start = raw.search(/^# MAGO\s*$/m);
  const end = raw.indexOf('\n## TRADIZIONI ARCANE', start);
  if (start < 0 || end < 0) throw new Error('Capitolo Mago non trovato nel manuale.');
  const chapter = raw.slice(start, end);

  const classFeatures = extractLeveledFeatures(
    chapter,
    WIZARD_CLASS_LEVELS,
    sheet.level,
    'Manuale del Giocatore / Mago / manuale_giocatore.md'
  );

  for (const [title, unlock] of Object.entries(WIZARD_CLASS_LEVELS)) {
    if (unlock <= sheet.level && !classFeatures.some((f) => f.title === title)) {
      throw new Error(`Privilegio ${title} non trovato nel manuale.`);
    }
  }

  // Parse PHB wizard progression table
  const rows = [...chapter.matchAll(/<tr>([\s\S]*?)<\/tr>/gi)]
    .map((r) => [...r[1].matchAll(/<td>([\s\S]*?)<\/td>/gi)].map((c) => printPlainText(c[1])))
    .filter((r) => r.length === 13);
  const row = rows.find((r) => Number.parseInt(r[0]) === sheet.level);
  if (!row) throw new Error('Progressione del Mago non trovata nella tabella PHB.');

  const slots = Object.fromEntries(
    row.slice(4).map((v, i) => [i + 1, /^[—–-]$/.test(v) ? 0 : Number(v)])
  ) as GeneratedCharacterSheet['spellSlots'];
  const cantrips = Number(row[3]);
  if (!Number.isInteger(cantrips) || cantrips < 3 || Object.values(slots).some((v) => !Number.isInteger(v) || v < 0)) {
    throw new Error('Progressione incantesimi Mago non valida.');
  }

  const tradition = wizardTraditionFromLabel(sheet.classSubclass);
  if (sheet.level >= 2 && sheet.classSubclass && !tradition) {
    throw new Error('Tradizione Arcana non catalogata nei manuali.');
  }

  let traditionFeatures: PrintFeature[] = [];
  const grantedSpells: GeneratedSpell[] = [];

  if (sheet.level >= 2 && tradition) {
    const file = tradition.supplementRulesSource.markdownFile;
    await preloadManualMarkdownFile(file, origin);
    traditionFeatures = extractManualSubclassFeatures(
      getManualMarkdownByFileName(file),
      tradition,
      sheet.level,
      WIZARD_TRADITION_FEATURES[tradition.slug]
    );

    if (tradition.slug === 'phb-mago-necromanzia' && sheet.level >= 6) {
      grantedSpells.push(
        manualSpellFromSources(
          'Animare Morti',
          3,
          'Aggiunto gratuitamente al libro degli incantesimi (Servitori Non Morti).'
        )
      );
    }
    if (tradition.slug === 'phb-mago-illusione' && sheet.level >= 2) {
      grantedSpells.push(
        manualSpellFromSources(
          'Illusione Minore',
          0,
          'Trucchetto aggiuntivo della Scuola di Illusione (Illusione Minore Migliorata).'
        )
      );
    }
  }

  const resources: WizardResources = {
    arcaneRecoveryLevels: Math.ceil(sheet.level / 2),
    spellsPrepared: Math.max(1, sheet.level + sheet.abilityMods.int),
    cantripsKnown: cantrips,
    spellSaveDc: 8 + sheet.proficiencyBonus + sheet.abilityMods.int,
    spellAttackBonus: sheet.proficiencyBonus + sheet.abilityMods.int,
  };

  if (tradition?.slug === 'phb-mago-abiurazione' && sheet.level >= 2) {
    resources.arcaneWardHp = 2 * sheet.level + sheet.abilityMods.int;
  }
  if (tradition?.slug === 'phb-mago-divinazione' && sheet.level >= 2) {
    resources.portentDiceCount = sheet.level >= 14 ? 3 : 2;
  }
  if (tradition?.slug === 'xge-mago-guerra' && sheet.level >= 6) {
    resources.powerSurgeMax = Math.max(1, sheet.abilityMods.int);
    resources.powerSurgeDamage = Math.floor(sheet.level / 2);
  }
  if (tradition?.slug === 'tce-mago-canto-lama' && sheet.level >= 2) {
    resources.bladesongUses = sheet.proficiencyBonus;
    resources.bladesongAcBonus = Math.max(1, sheet.abilityMods.int);
  }
  if (tradition?.slug === 'tce-mago-scribi' && sheet.level >= 6) {
    resources.manifestMindUses = sheet.proficiencyBonus;
  }

  return {
    classFeatures,
    traditionFeatures,
    slots,
    cantrips,
    resources,
    grantedSpells,
  };
}

export function addWizardGrantedSpells(
  sheet: GeneratedCharacterSheet,
  evidence: WizardEvidence
): GeneratedCharacterSheet {
  const clone = structuredClone(sheet);
  for (const spell of evidence.grantedSpells) {
    if (!clone.spells.some((s) => s.name.toLowerCase() === spell.name.toLowerCase())) {
      clone.spells.push(spell);
    }
  }
  return clone;
}

