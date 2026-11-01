import { SUPPLEMENT_SUBCLASS_OPTIONS, type SubclassCatalogEntry } from '@/lib/character-subclass-catalog';

export const SORCERER_CLASS_LEVELS: Record<string, number> = {
  'INCANTESIMI': 1,
  'ORIGINE STREGONESCA': 1,
  'FONTE DI MAGIA': 2,
  'METAMAGIA': 3,
  'RIPRISTINO STREGONESCO': 20,
};

export const SORCERER_ORIGIN_FEATURES: Record<string, Array<[string, number]>> = {
  'phb-stregone-draconico': [
    ['ANTENATO DRACONICO', 1],
    ['RESILIENZA DRACONICA', 1],
    ['AFFINITÀ ELEMENTALE', 6],
    ['ALI DI DRAGO', 14],
    ['PRESENZA DRACONICA', 18],
  ],
  'phb-stregone-magia-selvaggia': [
    ['IMPULSO DI MAGIA SELVAGGIA', 1],
    ['ONDE DI CAOS', 1],
    ['PIEGARE LA FORTUNA', 6],
    ['CAOS CONTROLLATO', 14],
    ['BOMBARDAMENTO MAGICO', 18],
  ],
  'xge-stregone-anima-divina': [
    ['MAGIA DIVINA', 1],
    ['PRESCELTO DAGLI DÈI', 1],
    ['GUARIGIONE POTENZIATA', 6],
    ['ALI ULTRATERRENE', 14],
    ['RECUPERO ULTRATERRENO', 18],
  ],
  'xge-stregone-magia-ombre': [
    ['OCCHI DELL\'OSCURO', 1],
    ['FORZA DELLA TOMBA', 1],
    ['SEGUGIO DEI PRESAGI NEFASTI', 6],
    ['CAMMINARE NELLE OMBRE', 14],
    ['FORMA D\'OMBRA', 18],
  ],
  'xge-stregone-tempesta': [
    ['PORTAVOCE DEL VENTO', 1],
    ['MAGIA TEMPESTOSA', 1],
    ['CUORE DELLA TEMPESTA', 6],
    ['GUIDA DELLA TEMPESTA', 6],
    ['FURIA DELLA TEMPESTA', 14],
    ['ANIMA DEL VENTO', 18],
  ],
  'tce-stregone-anima-meccanica': [
    ['MAGIA MECCANICA', 1],
    ['RIPRISTINO DELL\'EQUILIBRIO', 1],
    ['BASTIONE DELLA LEGGE', 6],
    ['TRANCE DELL\'ORDINE', 14],
    ['CAVALLERIA MECCANICA', 18],
  ],
  'tce-stregone-mente-aberrante': [
    ['INCANTESIMI PSIONICI', 1],
    ['CONVERSAZIONE TELEPATICA', 1],
    ['STREGONERIA PSIONICA', 6],
    ['DIFESE PSICHICHE', 6],
    ['RIVELAZIONE DELLA CARNE', 14],
    ['IMPLOSIONE DISTORGENTE', 18],
  ],
};

export const SORCERER_METAMAGIC_OPTIONS = [
  { name: 'Incantesimo Celato', cost: '1 pt', desc: 'Lancia senza componenti verbali né somatiche.' },
  { name: 'Incantesimo Distante', cost: '1 pt', desc: 'Raddoppia gittata (se a contatto, raggio 9m).' },
  { name: 'Incantesimo Esteso', cost: '1 pt', desc: 'Raddoppia durata (se >= 1 min, fino a max 24h).' },
  { name: 'Incantesimo Intensificato', cost: '3 pt', desc: 'Un bersaglio ha svantaggio al primo TS.' },
  { name: 'Incantesimo Potenziato', cost: '1 pt', desc: 'Ritira fino a mod CAR dadi di danno.' },
  { name: 'Incantesimo Preciso', cost: '1 pt', desc: 'Fino a mod CAR creature superano il TS automaticamente.' },
  { name: 'Incantesimo Raddoppiato', cost: 'Livello slot (1 trucchetto)', desc: 'Bersaglia una 2ª creatura entro gittata.' },
  { name: 'Incantesimo Rapido', cost: '2 pt', desc: 'Se richiede 1 azione, lo lancia come azione bonus.' },
] as const;

export const DRACONIC_ANCESTRIES: Record<string, { damageType: string; color: string }> = {
  'Argento': { damageType: 'Freddo', color: 'Argento' },
  'Bianco': { damageType: 'Freddo', color: 'Bianco' },
  'Blu': { damageType: 'Fulmine', color: 'Blu' },
  'Bronzo': { damageType: 'Fulmine', color: 'Bronzo' },
  'Nero': { damageType: 'Acido', color: 'Nero' },
  'Oro': { damageType: 'Fuoco', color: 'Oro' },
  'Ottone': { damageType: 'Fuoco', color: 'Ottone' },
  'Rame': { damageType: 'Acido', color: 'Rame' },
  'Rosso': { damageType: 'Fuoco', color: 'Rosso' },
  'Verde': { damageType: 'Veleno', color: 'Verde' },
};

export const DIVINE_AFFINITY_SPELLS: Record<string, string> = {
  'Bene': 'Cura Ferite',
  'Male': 'Infliggi Ferite',
  'Legge': 'Benedizione',
  'Caos': 'Anatema',
  'Neutralità': 'Protezione dal Bene e dal Male',
};

export type SorcererChoices = {
  metamagic?: string[];
  draconicAncestry?: string;
  divineAffinity?: 'Bene' | 'Male' | 'Legge' | 'Caos' | 'Neutralità';
};

export function metamagicCountForLevel(level: number): number {
  if (level < 3) return 0;
  if (level < 10) return 2;
  if (level < 17) return 3;
  return 4;
}

export function defaultMetamagicForLevel(level: number): string[] {
  const count = metamagicCountForLevel(level);
  const preferred = [
    'Incantesimo Rapido',
    'Incantesimo Raddoppiato',
    'Incantesimo Celato',
    'Incantesimo Potenziato',
  ];
  return preferred.slice(0, count);
}

export const SORCERER_SLOTS_TABLE: Record<number, Record<number, number>> = {
  1: { 1: 2, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
  2: { 1: 3, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
  3: { 1: 4, 2: 2, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
  4: { 1: 4, 2: 3, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
  5: { 1: 4, 2: 3, 3: 2, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
  6: { 1: 4, 2: 3, 3: 3, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
  7: { 1: 4, 2: 3, 3: 3, 4: 1, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
  8: { 1: 4, 2: 3, 3: 3, 4: 2, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
  9: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1, 6: 0, 7: 0, 8: 0, 9: 0 },
  10: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 0, 7: 0, 8: 0, 9: 0 },
  11: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 0, 8: 0, 9: 0 },
  12: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 0, 8: 0, 9: 0 },
  13: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 0, 9: 0 },
  14: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 0, 9: 0 },
  15: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 0 },
  16: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 0 },
  17: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 1 },
  18: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 1, 7: 1, 8: 1, 9: 1 },
  19: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 1, 8: 1, 9: 1 },
  20: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1 },
};

export const SORCERER_CANTRIPS_KNOWN_TABLE: Record<number, number> = {
  1: 4, 2: 4, 3: 4,
  4: 5, 5: 5, 6: 5, 7: 5, 8: 5, 9: 5,
  10: 6, 11: 6, 12: 6, 13: 6, 14: 6, 15: 6, 16: 6, 17: 6, 18: 6, 19: 6, 20: 6,
};

export const SORCERER_KNOWN_SPELLS_TABLE: Record<number, number> = {
  1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 7, 7: 8, 8: 9, 9: 10,
  10: 11, 11: 12, 12: 12, 13: 13, 14: 13, 15: 14, 16: 14, 17: 15, 18: 15, 19: 15, 20: 15,
};

export type SorcererOriginSpellTier = {
  sorcererLevel: number;
  spellLevel: number;
  spells: string[];
};

export const SORCERER_ORIGIN_SPELLS: Record<string, SorcererOriginSpellTier[]> = {
  'tce-stregone-anima-meccanica': [
    { sorcererLevel: 1, spellLevel: 1, spells: ['Allarme', 'Protezione dal Bene e dal Male'] },
    { sorcererLevel: 3, spellLevel: 2, spells: ['Aiuto', 'Ristorare Inferiore'] },
    { sorcererLevel: 5, spellLevel: 3, spells: ['Dissolvi Magie', 'Protezione dall\'Energia'] },
    { sorcererLevel: 7, spellLevel: 4, spells: ['Evoca Costrutto', 'Libertà di Movimento'] },
    { sorcererLevel: 9, spellLevel: 5, spells: ['Muro di Forza', 'Ristorare Superiore'] },
  ],
  'tce-stregone-mente-aberrante': [
    { sorcererLevel: 1, spellLevel: 0, spells: ['Scheggia della Mente'] },
    { sorcererLevel: 1, spellLevel: 1, spells: ['Braccia di Hadar', 'Sussurri Dissonanti'] },
    { sorcererLevel: 3, spellLevel: 2, spells: ['Calmare Emozioni', 'Individuazione dei Pensieri'] },
    { sorcererLevel: 5, spellLevel: 3, spells: ['Fame di Hadar', 'Inviare'] },
    { sorcererLevel: 7, spellLevel: 4, spells: ['Evoca Aberrazione', 'Tentacoli Neri di Evard'] },
    { sorcererLevel: 9, spellLevel: 5, spells: ['Legame Telepatico di Rary', 'Telecinesi'] },
  ],
  'xge-stregone-magia-ombre': [
    { sorcererLevel: 3, spellLevel: 2, spells: ['Oscurità'] },
  ],
};

export function supportedSorcererOrigins(): SubclassCatalogEntry[] {
  return SUPPLEMENT_SUBCLASS_OPTIONS.filter((s) => s.parentClassLabel === 'Stregone');
}

export function sorcererOriginFromLabel(label: string | null | undefined): SubclassCatalogEntry | null {
  if (!label) return null;
  const norm = label.trim().toLowerCase();
  const origins = supportedSorcererOrigins();
  // Exact match first
  const exact = origins.find((s) => s.label.trim().toLowerCase() === norm);
  if (exact) return exact;

  if (norm.includes('meccanica')) {
    return origins.find((s) => s.slug === 'tce-stregone-anima-meccanica') ?? null;
  }
  if (norm.includes('aberrante')) {
    return origins.find((s) => s.slug === 'tce-stregone-mente-aberrante') ?? null;
  }
  if (norm.includes('divina')) {
    return origins.find((s) => s.slug === 'xge-stregone-anima-divina') ?? null;
  }
  if (norm.includes('ombre')) {
    return origins.find((s) => s.slug === 'xge-stregone-magia-ombre') ?? null;
  }
  if (norm.includes('tempesta')) {
    return origins.find((s) => s.slug === 'xge-stregone-tempesta') ?? null;
  }
  if (norm.includes('selvaggia')) {
    return origins.find((s) => s.slug === 'phb-stregone-magia-selvaggia') ?? null;
  }
  if (norm.includes('dracon')) {
    return origins.find((s) => s.slug === 'phb-stregone-draconico') ?? null;
  }
  return null;
}
