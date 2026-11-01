import { SUPPLEMENT_SUBCLASS_OPTIONS, type SubclassCatalogEntry } from '@/lib/character-subclass-catalog';

export const PALADIN_CLASS_LEVELS: Record<string, number> = {
  'PERCEZIONE DEL DIVINO': 1,
  'IMPOSIZIONE DELLE MANI': 1,
  'STILE DI COMBATTIMENTO': 2,
  'INCANTESIMI': 2,
  'PUNIZIONE DIVINA': 2,
  'SALUTE DIVINA': 3,
  'GIURAMENTO SACRO': 3,
  'ATTACCO EXTRA': 5,
  'AURA DI PROTEZIONE': 6,
  'AURA DI CORAGGIO': 10,
  'PUNIZIONE DIVINA MIGLIORATA': 11,
  'TOCCO PURIFICATORE': 14,
};

export const PALADIN_OATH_FEATURES: Record<string, Array<[string, number]>> = {
  'phb-paladino-devozione': [
    ['INCANTESIMI DI GIURAMENTO', 3],
    ['INCANALARE DIVINITÀ', 3],
    ['AURA DI DEVOZIONE', 7],
    ['PUREZZA DI SPIRITO', 15],
    ['NUBE SACRA', 20],
  ],
  'phb-paladino-antichi': [
    ['INCANTESIMI DI GIURAMENTO', 3],
    ['INCANALARE DIVINITÀ', 3],
    ['AURA DI INTERDIZIONE', 7],
    ['SENTINELLA IMPERITURA', 15],
    ['CAMPIONE DEGLI ANTICHI', 20],
  ],
  'phb-paladino-vendetta': [
    ['INCANTESIMI DI GIURAMENTO', 3],
    ['INCANALARE DIVINITÀ', 3],
    ['VENDICATORE IMPLACABILE', 7],
    ['ANIMA DI VENDETTA', 15],
    ['ANGELO VENDICATORE', 20],
  ],
  'xge-paladino-conquista': [
    ['INCANTESIMI DI GIURAMENTO', 3],
    ['INCANALARE DIVINITÀ', 3],
    ['AURA DI CONQUISTA', 7],
    ['INTIMORIRE SPREZZANTE', 15],
    ['CONQUISTATORE INVINCIBILE', 20],
  ],
  'xge-paladino-redenzione': [
    ['INCANTESIMI DI GIURAMENTO', 3],
    ['INCANALARE DIVINITÀ', 3],
    ['AURA DEL GUARDIANO', 7],
    ['SPIRITO PROTETTIVO', 15],
    ['EMISSARIO DI REDENZIONE', 20],
  ],
  'tce-paladino-sentinelle': [
    ['INCANTESIMI DI GIURAMENTO', 3],
    ['INCANALARE DIVINITÀ', 3],
    ['AURA DELLA SENTINELLA', 7],
    ['PUNIZIONE SOLERTE', 15],
    ['BALUARDO DEI MORTALI', 20],
  ],
  'tce-paladino-gloria': [
    ['INCANTESIMI DI GIURAMENTO', 3],
    ['INGANALARE DIVINITÀ', 3], // preserved OCR typo in source heading
    ['AURA DI ALACRITÀ', 7],
    ['DIFESA GLORIOSA', 15],
    ['LEGGENDA VIVENTE', 20],
  ],
};

export const PALADIN_FIGHTING_STYLES = [
  'Combattere con Armi Possenti',
  'Difesa',
  'Duellare',
  'Protezione',
] as const;

export type PaladinFightingStyle = typeof PALADIN_FIGHTING_STYLES[number];

export type PaladinChoices = {
  fightingStyle?: PaladinFightingStyle;
};

export const PALADIN_SLOTS_TABLE: Record<number, Record<number, number>> = {
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

export const PALADIN_OATH_SPELLS: Record<string, Array<{ paladinLevel: number; spellLevel: number; spells: string[] }>> = {
  'phb-paladino-devozione': [
    { paladinLevel: 3, spellLevel: 1, spells: ['Protezione dal Bene e dal Male', 'Santuario'] },
    { paladinLevel: 5, spellLevel: 2, spells: ['Ristorare Inferiore', 'Zona di Verità'] },
    { paladinLevel: 9, spellLevel: 3, spells: ['Dissolvi Magie', 'Faro di Speranza'] },
    { paladinLevel: 13, spellLevel: 4, spells: ['Guardiano della Fede', 'Libertà di Movimento'] },
    { paladinLevel: 17, spellLevel: 5, spells: ['Colpo Infuocato', 'Comunione'] },
  ],
  'phb-paladino-antichi': [
    { paladinLevel: 3, spellLevel: 1, spells: ['Colpo Intrappolante', 'Parlare con gli Animali'] },
    { paladinLevel: 5, spellLevel: 2, spells: ['Bagliore Lunare', 'Passo Velato'] },
    { paladinLevel: 9, spellLevel: 3, spells: ['Crescita Vegetale', "Protezione dall'Energia"] },
    { paladinLevel: 13, spellLevel: 4, spells: ['Pelle di Pietra', 'Tempesta di Ghiaccio'] },
    { paladinLevel: 17, spellLevel: 5, spells: ['Comunione con la Natura', 'Traslazione Arborea'] },
  ],
  'phb-paladino-vendetta': [
    { paladinLevel: 3, spellLevel: 1, spells: ['Anatema', 'Marchio del Cacciatore'] },
    { paladinLevel: 5, spellLevel: 2, spells: ['Blocca Persone', 'Passo Velato'] },
    { paladinLevel: 9, spellLevel: 3, spells: ["Protezione dall'Energia", 'Velocità'] },
    { paladinLevel: 13, spellLevel: 4, spells: ['Esilio', 'Porta Dimensionale'] },
    { paladinLevel: 17, spellLevel: 5, spells: ['Blocca Mostri', 'Scrutare'] },
  ],
  'xge-paladino-conquista': [
    { paladinLevel: 3, spellLevel: 1, spells: ['Armatura di Agathys', 'Comando'] },
    { paladinLevel: 5, spellLevel: 2, spells: ['Arma Spirituale', 'Blocca Persone'] },
    { paladinLevel: 9, spellLevel: 3, spells: ['Paura', 'Scagliare Maledizione'] },
    { paladinLevel: 13, spellLevel: 4, spells: ['Dominare Bestie', 'Pelle di Pietra'] },
    { paladinLevel: 17, spellLevel: 5, spells: ['Dominare Persone', 'Nube Mortale'] },
  ],
  'xge-paladino-redenzione': [
    { paladinLevel: 3, spellLevel: 1, spells: ['Santuario', 'Sonno'] },
    { paladinLevel: 5, spellLevel: 2, spells: ['Blocca Persone', 'Calmare Emozioni'] },
    { paladinLevel: 9, spellLevel: 3, spells: ['Controincantesimo', 'Trama Ipnotica'] },
    { paladinLevel: 13, spellLevel: 4, spells: ['Pelle di Pietra', 'Sfera Elastica di Otiluke'] },
    { paladinLevel: 17, spellLevel: 5, spells: ['Blocca Mostri', 'Muro di Forza'] },
  ],
  'tce-paladino-sentinelle': [
    { paladinLevel: 3, spellLevel: 1, spells: ['Allarme', 'Individuazione del Magico'] },
    { paladinLevel: 5, spellLevel: 2, spells: ['Bagliore Lunare', 'Vedere Invisibilità'] },
    { paladinLevel: 9, spellLevel: 3, spells: ['Anti-Individuazione', 'Controincantesimo'] },
    { paladinLevel: 13, spellLevel: 4, spells: ['Aura di Purezza', 'Esilio'] },
    { paladinLevel: 17, spellLevel: 5, spells: ['Blocca Mostri', 'Scrutare'] },
  ],
  'tce-paladino-gloria': [
    { paladinLevel: 3, spellLevel: 1, spells: ['Dardo Tracciante', 'Eroismo'] },
    { paladinLevel: 5, spellLevel: 2, spells: ['Arma Magica', 'Caratteristica Potenziata'] },
    { paladinLevel: 9, spellLevel: 3, spells: ["Protezione dall'Energia", 'Velocità'] },
    { paladinLevel: 13, spellLevel: 4, spells: ['Compulsione', 'Libertà di Movimento'] },
    { paladinLevel: 17, spellLevel: 5, spells: ['Colpo Infuocato', 'Comunione'] },
  ],
};

export function paladinSpellsPrepared(level: number, chaMod: number): number {
  return Math.max(1, Math.floor(level / 2) + chaMod);
}

export function paladinOathFromLabel(label: string | null | undefined): SubclassCatalogEntry | null {
  if (!label) return null;
  const norm = (s: string) => s.trim().toLowerCase().replace(/[\u2018\u2019']/g, "'");
  const target = norm(label);
  return (
    SUPPLEMENT_SUBCLASS_OPTIONS.find(
      (entry) =>
        entry.parentClassLabel === 'Paladino' &&
        (norm(entry.label) === target ||
          entry.sectionHeadings.some((h) => norm(h) === target) ||
          norm(entry.slug) === target)
    ) ?? null
  );
}

export function supportedPaladinOaths(): SubclassCatalogEntry[] {
  return SUPPLEMENT_SUBCLASS_OPTIONS.filter(
    (entry) => entry.parentClassLabel === 'Paladino' && Boolean(PALADIN_OATH_FEATURES[entry.slug])
  );
}
