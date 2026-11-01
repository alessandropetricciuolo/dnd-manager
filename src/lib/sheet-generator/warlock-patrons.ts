import { SUPPLEMENT_SUBCLASS_OPTIONS, type SubclassCatalogEntry } from '@/lib/character-subclass-catalog';

export const WARLOCK_CLASS_LEVELS: Record<string, number> = {
  'PATRONO ULTRATERRENO': 1,
  'MAGIA DEL PATTO': 1,
  'SUPPLICHE OCCULTE': 2,
  'DONO DEL PATTO': 3,
  'AUMENTO DEI PUNTEGGI DI CARATTERISTICA': 4,
  'INCREMENTO DEI PUNTEGGI DI CARATTERISTICA': 4,
  'ARCANUM MISTICO': 11,
  'MAESTRO DELL\'OCCULTO': 20,
};

export const WARLOCK_PATRON_FEATURES: Record<string, Array<[string, number]>> = {
  'phb-warlock-fatato': [
    ['PRESENZA FATATA', 1],
    ['FUGA VELATA', 6],
    ['DIFESE SEDUCENTI', 10],
    ['DELIRIO OSCURO', 14],
  ],
  'phb-warlock-immondo': [
    ['BENEDIZIONE DELL\'OSCURO', 1],
    ['FORTUNA DELL\'OSCURO', 6],
    ['RESILIENZA IMMONDA', 10],
    ['SCAGLIARE ALL\'INFERNO', 14],
  ],
  'phb-warlock-grande-antico': [
    ['MENTE RISVEGLIATA', 1],
    ['INTERDIZIONE ENTROPICA', 6],
    ['SCUDO DEL PENSIERO', 10],
    ['CREARE SERVITORE', 14],
  ],
  'xge-warlock-celestiale': [
    ['TRUCCHETTI BONUS', 1],
    ['LUCE GUARITRICE', 1],
    ['ANIMA RADIOSA', 6],
    ['RESILIENZA CELESTIALE', 10],
    ['VENDETTA INCANDESCENTE', 14],
  ],
  'xge-warlock-lama-sortilegio': [
    ['MALEDIZIONE DELLA LAMA DEL SORTILEGIO', 1],
    ['COMBATTENTE DEL SORTILEGIO', 1],
    ['SPETTRO MALEDETTO', 6],
    ['ARMATURA DEI SORTILEGI', 10],
    ['MAESTRO DEI SORTILEGI', 14],
  ],
  'tce-warlock-genio': [
    ['RECIPIENTE DEL GENIO', 1],
    ['DONO ELEMENTALE', 6],
    ['SANTUARIO DEL RECIPIENTE', 10],
    ['DESIDERIO LIMITATO', 14],
  ],
  'tce-warlock-insondabile': [
    ['TENTACOLI DELLE PROFONDITÀ', 1],
    ['DONO DEL MARE', 1],
    ['ANIMA OCEANICA', 6],
    ['SPIRALE GUARDIANA', 6],
    ['PRESA DEI TENTACOLI', 10],
    ['IMMERSIONE INSONDABILE', 14],
  ],
};

export const WARLOCK_PACT_BOONS = [
  'Patto della Catena',
  'Patto della Lama',
  'Patto del Tomo',
  'Patto del Talismano',
] as const;

export type WarlockPactBoon = (typeof WARLOCK_PACT_BOONS)[number];

export interface WarlockSlotsProgression {
  count: number;
  slotLevel: number;
}

export const WARLOCK_SLOTS_TABLE: Record<number, WarlockSlotsProgression> = {
  1: { count: 1, slotLevel: 1 },
  2: { count: 2, slotLevel: 1 },
  3: { count: 2, slotLevel: 2 },
  4: { count: 2, slotLevel: 2 },
  5: { count: 2, slotLevel: 3 },
  6: { count: 2, slotLevel: 3 },
  7: { count: 2, slotLevel: 4 },
  8: { count: 2, slotLevel: 4 },
  9: { count: 2, slotLevel: 5 },
  10: { count: 2, slotLevel: 5 },
  11: { count: 3, slotLevel: 5 },
  12: { count: 3, slotLevel: 5 },
  13: { count: 3, slotLevel: 5 },
  14: { count: 3, slotLevel: 5 },
  15: { count: 3, slotLevel: 5 },
  16: { count: 3, slotLevel: 5 },
  17: { count: 4, slotLevel: 5 },
  18: { count: 4, slotLevel: 5 },
  19: { count: 4, slotLevel: 5 },
  20: { count: 4, slotLevel: 5 },
};

export const WARLOCK_CANTRIPS_KNOWN_TABLE: Record<number, number> = {
  1: 2, 2: 2, 3: 2,
  4: 3, 5: 3, 6: 3, 7: 3, 8: 3, 9: 3,
  10: 4, 11: 4, 12: 4, 13: 4, 14: 4, 15: 4, 16: 4, 17: 4, 18: 4, 19: 4, 20: 4,
};

export const WARLOCK_KNOWN_SPELLS_TABLE: Record<number, number> = {
  1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 7, 7: 8, 8: 9, 9: 10,
  10: 10, 11: 11, 12: 11, 13: 12, 14: 12, 15: 13, 16: 13, 17: 14, 18: 14, 19: 15, 20: 15,
};

export const WARLOCK_INVOCATIONS_KNOWN_TABLE: Record<number, number> = {
  1: 0, 2: 2, 3: 2, 4: 2,
  5: 3, 6: 3, 7: 4, 8: 4,
  9: 5, 10: 5, 11: 5,
  12: 6, 13: 6, 14: 6,
  15: 7, 16: 7, 17: 7,
  18: 8, 19: 8, 20: 8,
};

export const WARLOCK_MYSTIC_ARCANUM_LEVELS = [
  { minWarlockLevel: 11, spellLevel: 6 },
  { minWarlockLevel: 13, spellLevel: 7 },
  { minWarlockLevel: 15, spellLevel: 8 },
  { minWarlockLevel: 17, spellLevel: 9 },
] as const;

export const GENIE_KINDS = ['Dao', 'Djinni', 'Efreeti', 'Marid'] as const;
export type GenieKind = (typeof GENIE_KINDS)[number];

export const GENIE_ELEMENTS: Record<GenieKind, { element: string; damageType: string }> = {
  Dao: { element: 'Terra', damageType: 'contundenti' },
  Djinni: { element: 'Aria', damageType: 'tuono' },
  Efreeti: { element: 'Fuoco', damageType: 'fuoco' },
  Marid: { element: 'Acqua', damageType: 'freddo' },
};

export interface WarlockChoices {
  pactBoon?: WarlockPactBoon;
  invocations?: string[];
  mysticArcanum?: {
    6?: string;
    7?: string;
    8?: string;
    9?: string;
  };
  hexbladeWeapon?: string;
  genieKind?: GenieKind;
}

export function supportedWarlockPatrons(): SubclassCatalogEntry[] {
  return SUPPLEMENT_SUBCLASS_OPTIONS.filter((s) => s.parentClassLabel === 'Warlock');
}

export function warlockPatronFromLabel(label: string | null | undefined): SubclassCatalogEntry | null {
  if (!label) return null;
  const norm = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[’‘]/g, "'")
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();

  const target = norm(label);
  const patrons = supportedWarlockPatrons();
  const direct = patrons.find((p) => norm(p.label) === target);
  if (direct) return direct;

  const match = patrons.find((p) => {
    return p.sectionHeadings.some((h) => norm(h) === target || target.includes(norm(h)));
  });
  if (match) return match;

  if (target.includes('FATATO')) return patrons.find((p) => p.slug === 'phb-warlock-fatato') ?? null;
  if (target.includes('IMMONDO')) return patrons.find((p) => p.slug === 'phb-warlock-immondo') ?? null;
  if (target.includes('ANTICO')) return patrons.find((p) => p.slug === 'phb-warlock-grande-antico') ?? null;
  if (target.includes('CELESTIALE')) return patrons.find((p) => p.slug === 'xge-warlock-celestiale') ?? null;
  if (target.includes('LAMA') || target.includes('SORTILEGIO')) return patrons.find((p) => p.slug === 'xge-warlock-lama-sortilegio') ?? null;
  if (target.includes('GENIO')) return patrons.find((p) => p.slug === 'tce-warlock-genio') ?? null;
  if (target.includes('INSONDABILE')) return patrons.find((p) => p.slug === 'tce-warlock-insondabile') ?? null;

  return null;
}
