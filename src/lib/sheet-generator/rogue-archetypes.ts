import { SUPPLEMENT_SUBCLASS_OPTIONS, type SubclassCatalogEntry } from '@/lib/character-subclass-catalog';
import type { SkillKey } from './types';

export const ROGUE_CLASS_LEVELS: Record<string, number> = {
  'MAESTRIA': 1,
  'ATTACCO FURTIVO': 1,
  'GERGO LADRESCO': 1,
  'AZIONE SCALTRA': 2,
  'SCHIVATA PRODIGIOSA': 5,
  'ELUSIONE': 7,
  'DOTE AFFIDABILE': 11,
  'PERCEZIONE CIECA': 14,
  'MENTE SFUGGENTE': 15,
  'INAFFERRABILE': 18,
  'COLPO DI FORTUNA': 20,
};

export const ROGUE_ARCHETYPE_FEATURES: Record<string, Array<[string, number]>> = {
  'phb-ladro-furfante': [
    ['MANI VELOCI', 3],
    ['LAVORO AL SECONDO PIANO', 3],
    ['FURTIVITÀ SUPREMA', 9],
    ['USARE OGGETTO MAGICO', 13],
    ['RIFLESSI DA FURFANTE', 17],
  ],
  'phb-ladro-assassino': [
    ['COMPETENZE BONUS', 3],
    ['ASSASSINARE', 3],
    ['MAESTRO INFILTRATO', 9],
    ['IMPOSTORE', 13],
    ['COLPO MORTALE', 17],
  ],
  'phb-ladro-mistificatore-arcano': [
    ['INCANTESIMI', 3],
    ['GIOCO DI PRESTIGIO DELLA MANO MAGICA', 3],
    ['IMBOSCATA MAGICA', 9],
    ['INGANNATORE VERSATILE', 13],
    ['LADRO DI INCANTESIMI', 17],
  ],
  'xge-ladro-esploratore': [
    ['SCHERMAGLIATORE', 3],
    ['SURVIVALISTA', 3],
    ['MOBILITÀ SUPERIORE', 9],
    ['MAESTRO DI IMBOSCATE', 13],
    ['COLPO IMPROVVISO', 17],
  ],
  'xge-ladro-indagatore': [
    ["ORECCHIO PER L'INGANNO", 3],
    ['OCCHIO PER I DETTAGLI', 3],
    ['COMBATTIMENTO INTUITIVO', 3],
    ['OCCHIO DI LINCE', 9],
    ['OCCHIO INFALLIBILE', 13],
    ['INDIVIDUARE IL PUNTO DEBOLE', 17],
  ],
  'xge-ladro-pianificatore': [
    ['MAESTRO DI INTRIGHI', 3],
    ['MAESTRO DI TATTICHE', 3],
    ['MANIPOLATORE INTUITIVO', 9],
    ['FUORVIARE', 13],
    ['ANIMA INGANNEVOLE', 17],
  ],
  'xge-ladro-spadaccino': [
    ['GIOCO DI GAMBE', 3],
    ['AUDACIA DEL FANFARONE', 3],
    ['SPAVALDERIA', 9],
    ['MANOVRA ELEGANTE', 13],
    ['MAESTRO DUELLANTE', 17],
  ],
  'tce-ladro-fantasma': [
    ['SUSSURRI DEI MORTI', 3],
    ['LAMENTI DALLA TOMBA', 3],
    ['PEGNI DEI DEFUNTI', 9],
    ['CAMMINO FANTASMA', 13],
    ['COMPAGNO DELLA MORTE', 17],
  ],
  'tce-ladro-lama-spirituale': [
    ['POTERE PSIONICO', 3],
    ['LAME PSICHICHE', 3],
    ['LAME DELL’ANIMA', 9],
    ['VELO PSICHICO', 13],
    ['SQUARCIARE LA MENTE', 17],
  ],
};

export const MASTERMIND_GAMING_SETS = [
  'Set di dadi',
  'Set di scacchi dei draghi',
  'Mazzo di tre draghi',
  'Set di carte',
] as const;

export type RogueChoices = {
  mastermindGamingSet?: typeof MASTERMIND_GAMING_SETS[number];
  mastermindLanguages?: [string, string];
  phantomWhispersSkill?: SkillKey;
  arcaneTricksterCantrip?: string;
};

export function rogueArchetypeFromLabel(label: string | null | undefined): SubclassCatalogEntry | null {
  if (!label) return null;
  const clean = label.trim().toLowerCase();
  return (
    SUPPLEMENT_SUBCLASS_OPTIONS.find(
      (c) => c.parentClassLabel === 'Ladro' && (c.label.toLowerCase() === clean || clean.includes(c.label.toLowerCase()))
    ) ?? null
  );
}

export function supportedRogueArchetypes(): SubclassCatalogEntry[] {
  return SUPPLEMENT_SUBCLASS_OPTIONS.filter((c) => c.parentClassLabel === 'Ladro');
}
