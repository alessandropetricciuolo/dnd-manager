import { SUPPLEMENT_SUBCLASS_OPTIONS, type SubclassCatalogEntry } from '@/lib/character-subclass-catalog';

export const MONK_CLASS_LEVELS: Record<string, number> = {
  'DIFESA SENZA ARMATURA': 1,
  'ARTI MARZIALI': 1,
  'KI': 2,
  'MOVIMENTO SENZA ARMATURA': 2,
  'TRADIZIONE MONASTICA': 3,
  'DEVIARE PROIETTILI': 3,
  'CADUTA LENTA': 4,
  'ATTACCO EXTRA': 5,
  'COLPO STORDENTE': 5,
  'COLPI KI POTENZIATI': 6,
  'ELUSIONE': 7,
  'MENTE LUCIDA': 7,
  'PUREZZA DEL CORPO': 10,
  'LINGUA DEL SOLE E DELLA LUNA': 13,
  'ANIMA ADAMANTINA': 14,
  'CORPO SENZA TEMPO': 15,
  'CORPO VUOTO': 18,
  'PERFEZIONE INTERIORE': 20,
};

export const MONK_TRADITION_FEATURES: Record<string, Array<[string, number]>> = {
  'phb-monaco-mano-aperta': [
    ['TECNICA DELLA MANO APERTA', 3],
    ['INTEGRITÀ DEL CORPO', 6],
    ['TRANQUILLITÀ', 11],
    ['PALMO TREMANTE', 17],
  ],
  'phb-monaco-ombra': [
    ['ARTI DELL’OMBRA', 3],
    ['PASSO DELL’OMBRA', 6],
    ['MANTO DI OMBRE', 11],
    ['OPPORTUNISTA', 17],
  ],
  'phb-monaco-quattro-elementi': [
    ['DISCEPOLO DEGLI ELEMENTI', 3],
  ],
  'xge-monaco-kensei': [
    ['CAMMINO DEL KENSEI', 3],
    ['TUTT’UNO CON LA LAMA', 6],
    ['AFFILIARE LA LAMA', 11],
    ['PRECISIONE INFALLIBILE', 17],
  ],
  'xge-monaco-maestro-ubriaco': [
    ['COMPETENZE BONUS', 3],
    ['TECNICA DELL’UBRIACO', 3],
    ['ANDATURA ONDEGGIANTE', 6],
    ['FORTUNA DELL’UBRIACONE', 11],
    ['FRENESIA INTOSCICATA', 17],
  ],
  'xge-monaco-anima-solare': [
    ['DARDO DEL SOLE RADIOSO', 3],
    ['COLPO DELL’ONDA INCANDESCENTE', 6],
    ['ESPLOSIONE SOLARE INCANDESCENTE', 11],
    ['SCUDO SOLARE', 17],
  ],
  'tce-monaco-se-astrale': [
    ['BRACCIA DEL SÉ ASTRALE', 3],
    ['VOLTO DEL SÉ ASTRALE', 6],
    ['CORPO DEL SÉ ASTRALE', 11],
    ['SÉ ASTRALE RISVEGLIATO', 17],
  ],
  'tce-monaco-misericordia': [
    ['STRUMENTI DI MISERICORDIA', 3],
    ['MANO GUARITRICE', 3],
    ['MANO DEL DOLORE', 3],
    ['TOCCO DEL MEDICO', 6],
    ['RAFFICA DI GUARIGIONE E DOLORE', 11],
    ['MANO DELLA MISERICORDIA SUPREMA', 17],
  ],
};

export const KENSEI_MELEE_WEAPONS = [
  'Spada lunga',
  'Spada corta',
  'Scimitarra',
  'Stocco',
  'Ascia da battaglia',
  'Martello da guerra',
  'Tridente',
  'Lancia',
  'Frusta',
] as const;

export const KENSEI_RANGED_WEAPONS = [
  'Arco lungo',
  'Arco corto',
] as const;

export type MonkChoices = {
  kenseiMeleeWeapon?: string;
  kenseiRangedWeapon?: string;
  mercyMask?: string;
};

export function monkMartialArtsDie(level: number): string {
  if (level >= 17) return '1d10';
  if (level >= 11) return '1d8';
  if (level >= 5) return '1d6';
  return '1d4';
}

export function monkUnarmoredMovement(level: number): string {
  if (level >= 18) return '+9 m';
  if (level >= 14) return '+7,5 m';
  if (level >= 10) return '+6 m';
  if (level >= 6) return '+4,5 m';
  if (level >= 2) return '+3 m';
  return '+0 m';
}

export function monkUnarmoredMovementMeters(level: number): number {
  if (level >= 18) return 9;
  if (level >= 14) return 7.5;
  if (level >= 10) return 6;
  if (level >= 6) return 4.5;
  if (level >= 2) return 3;
  return 0;
}

export function monkTraditionFromLabel(label: string | null | undefined): SubclassCatalogEntry | null {
  if (!label) return null;
  const norm = (s: string) => s.trim().toLowerCase().replace(/[\u2018\u2019']/g, "'");
  const target = norm(label);
  return (
    SUPPLEMENT_SUBCLASS_OPTIONS.find(
      (entry) =>
        entry.parentClassLabel === 'Monaco' &&
        (norm(entry.label) === target ||
          entry.sectionHeadings.some((h) => norm(h) === target) ||
          norm(entry.slug) === target)
    ) ?? null
  );
}

export function supportedMonkTraditions(): SubclassCatalogEntry[] {
  return SUPPLEMENT_SUBCLASS_OPTIONS.filter(
    (entry) => entry.parentClassLabel === 'Monaco' && Boolean(MONK_TRADITION_FEATURES[entry.slug])
  );
}
