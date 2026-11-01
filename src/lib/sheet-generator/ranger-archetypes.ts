import { SUPPLEMENT_SUBCLASS_OPTIONS, type SubclassCatalogEntry } from '@/lib/character-subclass-catalog';

export const RANGER_CLASS_LEVELS: Record<string, number> = {
  'NEMICO PRESCELTO': 1,
  'ESPLORATORE NATO': 1,
  'STILE DI COMBATTIMENTO': 2,
  'INCANTESIMI': 2,
  'ARCHETIPO RANGER': 3,
  'CONSAPEVOLEZZA PRIMORDIALE': 3,
  'ATTACCO EXTRA': 5,
  'ANDATURA SUL TERRITORIO': 8,
  'NASCONDERSI IN PIENA VISTA': 10,
  'SVANIRE': 14,
  'SENSI FERINI': 18,
  'STERMINATORE DI NEMICI': 20,
};

export const RANGER_ARCHETYPE_FEATURES: Record<string, Array<[string, number]>> = {
  'phb-ranger-cacciatore': [
    ['PREDA DEL CACCIATORE', 3],
    ['TATTICHE DIFENSIVE', 7],
    ['MULTIATTACCO', 11],
    ['DIFESA DEL CACCIATORE SUPERIORE', 15],
  ],
  'phb-ranger-signore-bestie': [
    ['COMPAGNO DEL RANGER', 3],
    ['ADDESTRAMENTO STRAORDINARIO', 7],
    ['FURIA BESTIALE', 11],
    ['CONDIVIDERE INCANTESIMI', 15],
  ],
  'xge-ranger-tenebre': [
    ['MAGIA DEL CACCIATORE DELLE TENEBRE', 3],
    ['IMBOSCATA TERRIFICANTE', 3],
    ['VISTA DELL\'OMBRA', 3],
    ['MENTE DI FERRO', 7],
    ['RAFFICA DEL CACCIATORE', 11],
    ['SCHIVATA DELL\'OMBRA', 15],
  ],
  'xge-ranger-uccisore-mostri': [
    ['MAGIA DELL\'UCCISORE DI MOSTRI', 3],
    ['PERCEZIONE DEL CACCIATORE', 3],
    ['PREDA DELL\'UCCISORE', 3],
    ['DIFESA SOPRANNATURALE', 7],
    ['NEMESI DEGLI INCANTATORI', 11],
    ['CONTRATTACCO DELL\'UCCISORE', 15],
  ],
  'xge-ranger-viandante-orizzonte': [
    ['MAGIA DEL VIANDANTE DELL\'ORIZZONTE', 3],
    ['INDIVIDUAZIONE DEI PORTALI', 3],
    ['COMBATTENTE PLANARE', 3],
    ['PASSO ETEREO', 7],
    ['COLPO DISTANTE', 11],
    ['DIFESA SPETTRALE', 15],
  ],
  'tce-ranger-custode-sciami': [
    ['SCIAME RIUNITO', 3],
    ['MAGIA DEL CUSTODE DEGLI SCIAMI', 3],
    ['MAREA AVVOLGENTE', 7],
    ['SCIAME POSSENTE', 11],
    ['DISPERSIONE BRULICANTE', 15],
  ],
  'tce-ranger-viandante-fatato': [
    ['COLPI TERRIBILI', 3],
    ['MAGIA DEL VIANDANTE FATATO', 3],
    ['FASCINO ULTRATERRENO', 3],
    ['SCAMBIO SEDUCENTE', 7],
    ['RINFORZI FATATI', 11],
    ['VIANDANTE VELATO', 15],
  ],
};

export const RANGER_FIGHTING_STYLES = [
  'Combattere con Due Armi',
  'Difesa',
  'Duellare',
  'Tiro',
] as const;

export type RangerFightingStyle = typeof RANGER_FIGHTING_STYLES[number];

export type RangerChoices = {
  fightingStyle?: RangerFightingStyle;
  favoredEnemies?: string[];
  favoredTerrains?: string[];
  feyWandererSkill?: 'Inganno' | 'Intrattenere' | 'Persuasione';
  hunterPrey?: 'Devastatore dell\'Orda' | 'Sterminatore di Colossi' | 'Uccisore di Giganti';
  defensiveTactics?: 'Difesa dal Multiattacco' | 'Sfuggire all\'Orda' | 'Volontà d\'Acciaio';
  multiattack?: 'Attacco Turbinante' | 'Raffica';
  superiorHunterDefense?: 'Elusione' | 'Opporsi alla Marea' | 'Schivata Prodigiosa';
};

export const RANGER_SLOTS_TABLE: Record<number, Record<number, number>> = {
  1: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  2: { 1: 2, 2: 0, 3: 0, 4: 0, 5: 0 },
  3: { 1: 3, 2: 0, 3: 0, 4: 0, 5: 0 },
  4: { 1: 3, 2: 0, 3: 0, 4: 0, 5: 0 },
  5: { 1: 4, 2: 2, 3: 0, 4: 0, 5: 0 },
  6: { 1: 4, 2: 2, 3: 0, 4: 0, 5: 0 },
  7: { 1: 4, 2: 3, 3: 0, 4: 0, 5: 0 },
  8: { 1: 4, 2: 3, 3: 0, 4: 0, 5: 0 },
  9: { 1: 4, 2: 3, 3: 2, 4: 0, 5: 0 },
  10: { 1: 4, 2: 3, 3: 2, 4: 0, 5: 0 },
  11: { 1: 4, 2: 3, 3: 3, 4: 0, 5: 0 },
  12: { 1: 4, 2: 3, 3: 3, 4: 0, 5: 0 },
  13: { 1: 4, 2: 3, 3: 3, 4: 1, 5: 0 },
  14: { 1: 4, 2: 3, 3: 3, 4: 1, 5: 0 },
  15: { 1: 4, 2: 3, 3: 3, 4: 2, 5: 0 },
  16: { 1: 4, 2: 3, 3: 3, 4: 2, 5: 0 },
  17: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 },
  18: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 },
  19: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 },
  20: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 },
};

export const RANGER_KNOWN_SPELLS_TABLE: Record<number, number> = {
  1: 0,
  2: 2,
  3: 3,
  4: 3,
  5: 4,
  6: 4,
  7: 5,
  8: 5,
  9: 6,
  10: 6,
  11: 7,
  12: 7,
  13: 8,
  14: 8,
  15: 9,
  16: 9,
  17: 10,
  18: 10,
  19: 11,
  20: 11,
};

export type RangerArchetypeSpellTier = {
  rangerLevel: number;
  spellLevel: number;
  spells: string[];
};

export const RANGER_ARCHETYPE_SPELLS: Record<string, RangerArchetypeSpellTier[]> = {
  'xge-ranger-tenebre': [
    { rangerLevel: 3, spellLevel: 1, spells: ['Camuffare Se Stesso'] },
    { rangerLevel: 5, spellLevel: 2, spells: ['Trucco della Corda'] },
    { rangerLevel: 9, spellLevel: 3, spells: ['Paura'] },
    { rangerLevel: 13, spellLevel: 4, spells: ['Invisibilità Superiore'] },
    { rangerLevel: 17, spellLevel: 5, spells: ['Sembrare'] },
  ],
  'xge-ranger-uccisore-mostri': [
    { rangerLevel: 3, spellLevel: 1, spells: ['Protezione dal Bene e dal Male'] },
    { rangerLevel: 5, spellLevel: 2, spells: ['Zona di Verità'] },
    { rangerLevel: 9, spellLevel: 3, spells: ['Cerchio Magico'] },
    { rangerLevel: 13, spellLevel: 4, spells: ['Esilio'] },
    { rangerLevel: 17, spellLevel: 5, spells: ['Blocca Mostri'] },
  ],
  'xge-ranger-viandante-orizzonte': [
    { rangerLevel: 3, spellLevel: 1, spells: ['Protezione dal Bene e dal Male'] },
    { rangerLevel: 5, spellLevel: 2, spells: ['Passo Velato'] },
    { rangerLevel: 9, spellLevel: 3, spells: ['Velocità'] },
    { rangerLevel: 13, spellLevel: 4, spells: ['Esilio'] },
    { rangerLevel: 17, spellLevel: 5, spells: ['Cerchio di Teletrasporto'] },
  ],
  'tce-ranger-custode-sciami': [
    { rangerLevel: 3, spellLevel: 0, spells: ['Mano Magica'] },
    { rangerLevel: 3, spellLevel: 1, spells: ['Luminescenza'] },
    { rangerLevel: 5, spellLevel: 2, spells: ['Ragnatela'] },
    { rangerLevel: 9, spellLevel: 3, spells: ['Forma Gassosa'] },
    { rangerLevel: 13, spellLevel: 4, spells: ['Occhio Arcano'] },
    { rangerLevel: 17, spellLevel: 5, spells: ['Piaga degli Insetti'] },
  ],
  'tce-ranger-viandante-fatato': [
    { rangerLevel: 3, spellLevel: 1, spells: ['Charme su Persone'] },
    { rangerLevel: 5, spellLevel: 2, spells: ['Passo Velato'] },
    { rangerLevel: 9, spellLevel: 3, spells: ['Dissolvi Magie'] },
    { rangerLevel: 11, spellLevel: 3, spells: ['Evoca Folletto'] },
    { rangerLevel: 13, spellLevel: 4, spells: ['Porta Dimensionale'] },
    { rangerLevel: 17, spellLevel: 5, spells: ['Fuorviare'] },
  ],
};

export function supportedRangerArchetypes(): SubclassCatalogEntry[] {
  return SUPPLEMENT_SUBCLASS_OPTIONS.filter((s) => s.parentClassLabel === 'Ranger');
}

export function rangerArchetypeFromLabel(label: string | null | undefined): SubclassCatalogEntry | null {
  if (!label) return null;
  const norm = label.trim().toLowerCase();
  const archetypes = supportedRangerArchetypes();
  // Exact match first
  const exact = archetypes.find((s) => s.label.trim().toLowerCase() === norm);
  if (exact) return exact;

  if (norm.includes('tenebre')) {
    return archetypes.find((s) => s.slug === 'xge-ranger-tenebre') ?? null;
  }
  if (norm.includes('mostri')) {
    return archetypes.find((s) => s.slug === 'xge-ranger-uccisore-mostri') ?? null;
  }
  if (norm.includes('orizzonte')) {
    return archetypes.find((s) => s.slug === 'xge-ranger-viandante-orizzonte') ?? null;
  }
  if (norm.includes('sciami')) {
    return archetypes.find((s) => s.slug === 'tce-ranger-custode-sciami') ?? null;
  }
  if (norm.includes('fatato')) {
    return archetypes.find((s) => s.slug === 'tce-ranger-viandante-fatato') ?? null;
  }
  if (norm.includes('bestie')) {
    return archetypes.find((s) => s.slug === 'phb-ranger-signore-bestie') ?? null;
  }
  if (norm.includes('cacciatore')) {
    return archetypes.find((s) => s.slug === 'phb-ranger-cacciatore') ?? null;
  }
  return null;
}
