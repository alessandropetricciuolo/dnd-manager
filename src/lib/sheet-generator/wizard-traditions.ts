import { SUPPLEMENT_SUBCLASS_OPTIONS, type SubclassCatalogEntry } from '@/lib/character-subclass-catalog';

export const WIZARD_CLASS_LEVELS: Record<string, number> = {
  'INCANTESIMI': 1,
  'RECUPERO ARCANO': 1,
  'TRADIZIONE ARCANA': 2,
  'MAESTRIA NEGLI INCANTESIMI': 18,
  'INCANTESIMI PERSONALI': 20,
};

export const WIZARD_TRADITION_FEATURES: Record<string, Array<[string, number]>> = {
  'phb-mago-abiurazione': [
    ['ABIURATORE SAPIENTE', 2],
    ['INTERDIZIONE ARCANA', 2],
    ['INTERDIZIONE PROIETTATA', 6],
    ['ABIURAZIONE MIGLIORATA', 10],
    ['RESISTENZA AGLI INCANTESIMI', 14],
  ],
  'phb-mago-ammaliamento': [
    ['AMMALIATORE SAPIENTE', 2],
    ['SGUARDO IPNOTICO', 2],
    ['FASCINO ISTINTIVO', 6],
    ['AMMALIAMENTO CONDIVISO', 10],
    ['ALTERARE RICORDI', 14],
  ],
  'phb-mago-divinazione': [
    ['DIVINATORE SAPIENTE', 2],
    ['PORTENTO', 2],
    ['DIVINAZIONE ESPERTA', 6],
    ['TERZO OCCHIO', 10],
    ['PORTENTO SUPERIORE', 14],
  ],
  'phb-mago-evocazione': [
    ['EVOCATORE SAPIENTE', 2],
    ['EVOCAZIONE MINORE', 2],
    ['TRASPOSIZIONE BENEVOLA', 6],
    ['EVOCAZIONE FOCALIZZATA', 10],
    ['EVOCAZIONI PERDURANTI', 14],
  ],
  'phb-mago-illusione': [
    ['ILLUSIONISTA SAPIENTE', 2],
    ['ILLUSIONE MINORE MIGLIORATA', 2],
    ['ILLUSIONI DUTTILI', 6],
    ['SOSIA ILLUSORIO', 10],
    ['REALTÀ ILLUSORIA', 14],
  ],
  'phb-mago-invocazione': [
    ['INVOCATORE SAPIENTE', 2],
    ['PLASMARE INCANTESIMI', 2],
    ['TRUCCHETTO POTENTE', 6],
    ['INVOCAZIONE POTENTE', 10],
    ['SATURAZIONE MAGICA', 14],
  ],
  'phb-mago-necromanzia': [
    ['NECROMANTE SAPIENTE', 2],
    ['RACCOLTO MACABRO', 2],
    ['SERVITORI NON MORTI', 6],
    ['IMPERVIO ALLA NON MORTE', 10],
    ['COMANDARE NON MORTI', 14],
  ],
  'phb-mago-trasmutazione': [
    ['TRASMUTATORE SAPIENTE', 2],
    ['ALCHIMIA MINORE', 2],
    ['PIETRA DEL TRASMUTATORE', 6],
    ['MUTAFORMA', 10],
    ['MAESTRO TRASMUTATORE', 14],
  ],
  'xge-mago-guerra': [
    ['DEVIAZIONE ARCANA', 2],
    ['INGEGNO TATTICO', 2],
    ['IMPULSO DI POTERE', 6],
    ['MAGIA DUREVOLE', 10],
    ['SUDARIO DI DEVIAZIONE', 14],
  ],
  'tce-mago-canto-lama': [
    ['ARTE DELLA GUERRA E DEL CANTO', 2],
    ['MELODIA DELLA LAMA', 2],
    ['ATTACCO EXTRA', 6],
    ['CANZONE DI DIFESA', 10],
    ['CANZONE DI VITTORIA', 14],
  ],
  'tce-mago-scribi': [
    ['CALAMO INCANTATO', 2],
    ['LIBRO DEGLI INCANTESIMI RISVEGLIATO', 2],
    ['MENTE MANIFESTA', 6],
    ['SCRIVANO ARCANO', 10],
    ['COMUNIONE CON IL TESTO', 14],
  ],
};

export const BLADESINGER_WEAPONS = [
  'Stocco',
  'Spada corta',
  'Spada lunga',
  'Scimitarra',
  'Frusta',
  'Martello da guerra',
  'Ascia da battaglia',
  'Tridente',
] as const;

export type WizardChoices = {
  bladesingerWeapon?: string;
  signatureSpells?: [string, string];
  spellMasterySpells?: [string, string];
};

export function wizardTraditionFromLabel(label: string | null | undefined): SubclassCatalogEntry | null {
  if (!label) return null;
  const target = label.trim().toLowerCase();
  return (
    SUPPLEMENT_SUBCLASS_OPTIONS.find(
      (entry) =>
        entry.parentClassLabel === 'Mago' &&
        (entry.label.toLowerCase() === target ||
          entry.sectionHeadings.some((h) => h.toLowerCase() === target) ||
          entry.slug.toLowerCase() === target)
    ) ?? null
  );
}

export function supportedWizardTraditions(): SubclassCatalogEntry[] {
  return SUPPLEMENT_SUBCLASS_OPTIONS.filter(
    (entry) => entry.parentClassLabel === 'Mago' && Boolean(WIZARD_TRADITION_FEATURES[entry.slug])
  );
}
