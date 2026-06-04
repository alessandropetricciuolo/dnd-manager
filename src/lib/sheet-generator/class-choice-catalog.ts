/** Stili di combattimento PHB (titoli ###). */
export const PHB_FIGHTING_STYLE_OPTIONS = [
  "Combattere con Armi Possenti",
  "Combattere con Due Armi",
  "Difesa",
  "Duellare",
  "Protezione",
  "Tiro",
] as const;

export type PhbFightingStyle = (typeof PHB_FIGHTING_STYLE_OPTIONS)[number];

export const WARLOCK_PACT_OPTIONS = [
  {
    name: "Patto della Catena",
    summary: "Trova Famiglio e famiglio potenziato.",
  },
  {
    name: "Patto della Lama",
    summary: "Arma del patto evocabile.",
  },
  {
    name: "Patto del Tomo",
    summary: "Libro delle Ombre con trucchetti extra.",
  },
] as const;

export type WarlockPactName = (typeof WARLOCK_PACT_OPTIONS)[number]["name"];

export type WarlockInvocationDef = {
  name: string;
  summary: string;
  minLevel?: number;
  requiresPact?: WarlockPactName;
};

export const WARLOCK_INVOCATION_OPTIONS: WarlockInvocationDef[] = [
  {
    name: "Deflagrazione Agonizzante",
    summary: "CHA ai danni di Deflagrazione Occulta.",
  },
  {
    name: "Armatura delle Ombre",
    summary: "Armatura Magica a volontà.",
  },
  {
    name: "Vista del Diavolo",
    summary: "Vista nel buio fino a 36 m.",
  },
  {
    name: "Deflagrazione Respingente",
    summary: "Spinge il bersaglio di 3 m.",
  },
  {
    name: "Lancia della Letargia",
    summary: "Riduce velocità del bersaglio.",
  },
  {
    name: "Maschera dei Molti Volti",
    summary: "Camuffare Se Stesso a volontà.",
  },
  {
    name: "Sussurri dalla Tomba",
    summary: "Parlare con i Morti a volontà.",
  },
  {
    name: "Vista dell'Occulto",
    summary: "Individuazione del Magico a volontà.",
  },
  {
    name: "Libro degli Antichi Segreti",
    summary: "Rituali nel Libro delle Ombre.",
    requiresPact: "Patto del Tomo",
  },
  {
    name: "Voce del Signore delle Catene",
    summary: "Percepisci tramite il famiglio.",
    requiresPact: "Patto della Catena",
  },
  {
    name: "Lama Assetata",
    summary: "Due attacchi con l'arma del patto.",
    minLevel: 5,
    requiresPact: "Patto della Lama",
  },
  {
    name: "Catene di Carceri",
    summary: "Blocca Mostri su celestiali/immondi/elementali.",
    minLevel: 15,
    requiresPact: "Patto della Catena",
  },
  {
    name: "Maestro di Mille Forme",
    summary: "Alterare Se Stesso a volontà.",
    minLevel: 15,
  },
  {
    name: "Sguardo delle Due Menti",
    summary: "Percezione tramite creatura consenziente.",
  },
];

export function warlockInvocationsKnown(level: number): number {
  const lvl = Math.max(1, Math.min(20, level));
  if (lvl < 2) return 0;
  if (lvl < 5) return 2;
  if (lvl < 7) return 3;
  if (lvl < 9) return 4;
  if (lvl < 12) return 5;
  if (lvl < 15) return 6;
  if (lvl < 18) return 7;
  return 8;
}

export function filterWarlockInvocationsForLevel(
  level: number,
  pactName: string | null | undefined
): WarlockInvocationDef[] {
  const effectiveLevel = Math.max(2, level);
  return WARLOCK_INVOCATION_OPTIONS.filter((opt) => {
    if ((opt.minLevel ?? 1) > effectiveLevel) return false;
    if (opt.requiresPact && opt.requiresPact !== pactName) return false;
    return true;
  });
}
