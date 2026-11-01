import { getManualMarkdownByFileName, preloadManualMarkdownFile } from './phb-spell-excerpt';
import {
  WARLOCK_CLASS_LEVELS,
  WARLOCK_PATRON_FEATURES,
  WARLOCK_SLOTS_TABLE,
  WARLOCK_KNOWN_SPELLS_TABLE,
  WARLOCK_CANTRIPS_KNOWN_TABLE,
  WARLOCK_INVOCATIONS_KNOWN_TABLE,
  GENIE_ELEMENTS,
  warlockPatronFromLabel,
  type WarlockChoices,
  type GenieKind,
  type WarlockPactBoon,
} from '@/lib/sheet-generator/warlock-patrons';
import { extractWarlockInvocationMarkdown, extractPhbWarlockPactMarkdown } from '@/lib/sheet-generator/warlock-invocation-phb';
import { extractLeveledFeatures, normalizeFeatureTitle, type PrintFeature } from '@/lib/sheet-generator/manual-feature-text';
import { extractManualSubclassFeatures } from '@/lib/sheet-generator/manual-subclass-features';
import { manualSpellFromSources } from './manual-spell-source';
import type { GeneratedCharacterSheet, GeneratedSpell } from '@/lib/sheet-generator/types';

export type WarlockResources = {
  pactSlotsCount: number;
  pactSlotLevel: number;
  spellSaveDc: number;
  spellAttackBonus: number;
  spellsKnown: number;
  cantripsKnown: number;
  invocationsCount: number;
  invocations: Array<{ name: string; desc: string }>;
  pactBoon?: { name: WarlockPactBoon; desc: string };
  mysticArcanum: Array<{ level: number; spellName: string }>;
  // Subclass specific
  hexbladeWarrior?: boolean;
  hexbladeCurse?: boolean;
  hexbladeWeapon?: string;
  healingLightDice?: number;
  genieKind?: GenieKind;
  genieDamageType?: string;
  tentacleDamage?: string;
  tempHpDarkOne?: number;
};

export type WarlockEvidence = {
  classFeatures: PrintFeature[];
  patronFeatures: PrintFeature[];
  resources: WarlockResources;
  slots: Record<number, number>;
  grantedSpells: GeneratedSpell[];
};

const DEFAULT_INVOCATIONS: string[] = [
  'Deflagrazione Agonizzante',
  'Armatura delle Ombre',
  'Vista del Diavolo',
  'Deflagrazione Respingente',
  'Lancia della Letargia',
  'Maschera dei Molti Volti',
  'Sussurri dalla Tomba',
  'Vista dell\'Occulto',
];

const DEFAULT_MYSTIC_ARCANUM: Record<number, string> = {
  6: 'Sguardo Penetrante',
  7: 'Dito della Morte',
  8: 'Dominare Mostri',
  9: 'Previsione',
};

export async function loadWarlockEvidence(
  sheet: GeneratedCharacterSheet,
  origin?: string,
  choices: WarlockChoices = {}
): Promise<WarlockEvidence> {
  await preloadManualMarkdownFile('manuale_giocatore.md', origin);
  const raw = getManualMarkdownByFileName('manuale_giocatore.md');
  const start = raw.search(/^# WARLOCK\s*$/m);
  const end = raw.indexOf('\n### PATRONI ULTRATERRENI', start);
  if (start < 0 || end < 0) throw new Error('Capitolo Warlock non trovato nel manuale.');
  const chapter = raw.slice(start, end);

  const classFeatures = extractLeveledFeatures(
    chapter,
    WARLOCK_CLASS_LEVELS,
    sheet.level,
    'Manuale del Giocatore / Warlock / manuale_giocatore.md'
  );

  const REQUIRED_WARLOCK_FEATURES: Record<string, number> = {
    'PATRONO ULTRATERRENO': 1,
    'MAGIA DEL PATTO': 1,
    'SUPPLICHE OCCULTE': 2,
    'DONO DEL PATTO': 3,
    'ARCANUM MISTICO': 11,
    'MAESTRO DELL\'OCCULTO': 20,
  };

  for (const [title, unlock] of Object.entries(REQUIRED_WARLOCK_FEATURES)) {
    if (unlock <= sheet.level && !classFeatures.some((f) => normalizeFeatureTitle(f.title) === normalizeFeatureTitle(title))) {
      throw new Error(`Privilegio ${title} non trovato nel manuale.`);
    }
  }

  const patronCatalog = warlockPatronFromLabel(sheet.classSubclass);
  if (sheet.level >= 1 && sheet.classSubclass && !patronCatalog) {
    throw new Error('Patrono Ultraterreno non catalogato nei manuali.');
  }

  let patronFeatures: PrintFeature[] = [];
  const grantedSpells: GeneratedSpell[] = [];

  if (sheet.level >= 1 && patronCatalog) {
    const file = patronCatalog.supplementRulesSource.markdownFile;
    await preloadManualMarkdownFile(file, origin);
    patronFeatures = extractManualSubclassFeatures(
      getManualMarkdownByFileName(file),
      patronCatalog,
      sheet.level,
      WARLOCK_PATRON_FEATURES[patronCatalog.slug] ?? []
    );

    // Celestiale bonus cantrips: Fiamma Sacra and Luce
    if (patronCatalog.slug === 'xge-warlock-celestiale') {
      const cantrips = ['Fiamma Sacra', 'Luce'];
      for (const c of cantrips) {
        const sp = manualSpellFromSources(c, 0);
        if (sp) grantedSpells.push(sp);
      }
    }

    // Insondabile 10th level: Tentacoli Neri di Evard
    if (patronCatalog.slug === 'tce-warlock-insondabile' && sheet.level >= 10) {
      const sp = manualSpellFromSources('Tentacoli Neri di Evard', 4);
      if (sp) grantedSpells.push(sp);
    }
  }

  // Pact Magic resources
  const chaMod = sheet.abilityMods?.cha ?? Math.floor(((sheet.abilities?.cha ?? 10) - 10) / 2);
  const pb = sheet.proficiencyBonus ?? 2;
  const spellSaveDc = 8 + pb + chaMod;
  const spellAttackBonus = pb + chaMod;

  const slotProg = WARLOCK_SLOTS_TABLE[sheet.level] ?? { count: 1, slotLevel: 1 };
  const pactSlotsCount = slotProg.count;
  const pactSlotLevel = slotProg.slotLevel;
  const spellsKnown = WARLOCK_KNOWN_SPELLS_TABLE[sheet.level] ?? 2;
  const cantripsKnown = (WARLOCK_CANTRIPS_KNOWN_TABLE[sheet.level] ?? 2) +
    (patronCatalog?.slug === 'xge-warlock-celestiale' ? 2 : 0);

  // Invocations
  const invocationsCount = WARLOCK_INVOCATIONS_KNOWN_TABLE[sheet.level] ?? 0;
  const chosenInvocations = choices.invocations && choices.invocations.length > 0
    ? choices.invocations.slice(0, invocationsCount)
    : DEFAULT_INVOCATIONS.slice(0, invocationsCount);

  const invocations = chosenInvocations.map((name) => {
    const rawMd = extractWarlockInvocationMarkdown(name);
    const desc = rawMd.replace(/^#{1,6}\s+[^\n]+\n/m, '').trim() || name;
    return { name, desc };
  });

  // Pact Boon
  let pactBoon: { name: WarlockPactBoon; desc: string } | undefined;
  if (sheet.level >= 3) {
    const boonName = choices.pactBoon ?? 'Patto del Tomo';
    const rawMd = extractPhbWarlockPactMarkdown(boonName);
    const desc = rawMd.replace(/^#{1,6}\s+[^\n]+\n/m, '').trim() || boonName;
    pactBoon = { name: boonName, desc };
  }

  // Mystic Arcanum
  const mysticArcanum: Array<{ level: number; spellName: string }> = [];
  if (sheet.level >= 11) {
    const spell6 = choices.mysticArcanum?.['6'] ?? DEFAULT_MYSTIC_ARCANUM[6];
    mysticArcanum.push({ level: 6, spellName: spell6 });
  }
  if (sheet.level >= 13) {
    const spell7 = choices.mysticArcanum?.['7'] ?? DEFAULT_MYSTIC_ARCANUM[7];
    mysticArcanum.push({ level: 7, spellName: spell7 });
  }
  if (sheet.level >= 15) {
    const spell8 = choices.mysticArcanum?.['8'] ?? DEFAULT_MYSTIC_ARCANUM[8];
    mysticArcanum.push({ level: 8, spellName: spell8 });
  }
  if (sheet.level >= 17) {
    const spell9 = choices.mysticArcanum?.['9'] ?? DEFAULT_MYSTIC_ARCANUM[9];
    mysticArcanum.push({ level: 9, spellName: spell9 });
  }

  // Patron specific resources
  const isHexblade = patronCatalog?.slug === 'xge-warlock-lama-sortilegio';
  const isCelestial = patronCatalog?.slug === 'xge-warlock-celestiale';
  const isGenie = patronCatalog?.slug === 'tce-warlock-genio';
  const isFathomless = patronCatalog?.slug === 'tce-warlock-insondabile';
  const isFiend = patronCatalog?.slug === 'phb-warlock-immondo';

  const genieKind: GenieKind | undefined = isGenie ? (choices.genieKind ?? 'Dao') : undefined;
  const genieDamageType = genieKind ? GENIE_ELEMENTS[genieKind].damageType : undefined;

  const resources: WarlockResources = {
    pactSlotsCount,
    pactSlotLevel,
    spellSaveDc,
    spellAttackBonus,
    spellsKnown,
    cantripsKnown,
    invocationsCount,
    invocations,
    pactBoon,
    mysticArcanum,
    hexbladeWarrior: isHexblade,
    hexbladeCurse: isHexblade,
    hexbladeWeapon: isHexblade ? (choices.hexbladeWeapon ?? 'Spada lunga') : undefined,
    healingLightDice: isCelestial ? 1 + sheet.level : undefined,
    genieKind,
    genieDamageType,
    tentacleDamage: isFathomless ? (sheet.level >= 10 ? '2d8' : '1d8') : undefined,
    tempHpDarkOne: isFiend ? Math.max(1, chaMod + sheet.level) : undefined,
  };

  const slots: Record<number, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0,
    7: 0,
    8: 0,
    9: 0,
  };
  slots[pactSlotLevel] = pactSlotsCount;

  return {
    classFeatures,
    patronFeatures,
    resources,
    slots,
    grantedSpells,
  };
}

export function addWarlockGrantedSpells(
  sheet: GeneratedCharacterSheet,
  evidence: WarlockEvidence
): GeneratedCharacterSheet {
  if (!evidence.grantedSpells || evidence.grantedSpells.length === 0) return sheet;

  const existing = new Set((sheet.spells ?? []).map((s) => s.name.toLowerCase().trim()));
  const newSpells = evidence.grantedSpells.filter((s) => !existing.has(s.name.toLowerCase().trim()));

  if (newSpells.length === 0) return sheet;

  return {
    ...sheet,
    spells: [...(sheet.spells ?? []), ...newSpells],
  };
}
