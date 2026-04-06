/**
 * Liste chiuse (PHB IT) per PG campagna lunga. Allineate a `manuale_giocatore.md` + ingest v4.
 */

export type SpellProgression = "none" | "full" | "half" | "pact" | "subclass";

export type ClassCatalogEntry = {
  slug: string;
  label: string;
  /** Sottostringa unica per trovare il blocco «Privilegi di classe» (testo). */
  privilegesAnchor: string;
  /** Ancora per il blocco regole di lancio / incantesimi di classe (opzionale). */
  spellcastingAnchor?: string;
  spellProgression: SpellProgression;
  spellList:
    | { style: "h1"; chapter: string }
    | { style: "h2"; sectionHeading: string }
    | null;
};

export type RaceCatalogEntry = {
  slug: string;
  label: string;
  /** Sezione ## tratti (ingest). */
  traitsSectionHeading: string;
  /** Se i tratti non sono una ## (halfling/gnomo/tiefling), usa contenuto. */
  traitsContentAnchor?: string;
  subraces?: { slug: string; label: string; sectionHeading: string }[];
};

export type BackgroundCatalogEntry = {
  slug: string;
  label: string;
  phbH1: string;
  opener: string;
};

export const PHB_MD_FILE = "manuale_giocatore.md";
export const PHB_BOOK_KEY = "player_handbook" as const;

export const RACE_OPTIONS: RaceCatalogEntry[] = [
  {
    slug: "elfo",
    label: "Elfo",
    traitsSectionHeading: "TRATTI DEGLI ELFI",
    subraces: [
      { slug: "elfo_alto", label: "Elfo alto", sectionHeading: "ELFO ALTO" },
      { slug: "elfo_boschi", label: "Elfo dei boschi", sectionHeading: "ELFO DEI BOSCHI" },
      { slug: "elfo_drow", label: "Elfo oscuro (drow)", sectionHeading: "ELFO OSCURO (DROW)" },
    ],
  },
  {
    slug: "halfling",
    label: "Halfling",
    traitsSectionHeading: "__CONTENT__",
    traitsContentAnchor: "Un personaggio halfling possiede",
    subraces: [
      { slug: "halfling_piedelesto", label: "Halfling piedelesto", sectionHeading: "HALFLING PIEDELESTO" },
      { slug: "halfling_tozzo", label: "Halfling tozzo", sectionHeading: "HALFLING TOZZO" },
    ],
  },
  {
    slug: "nano",
    label: "Nano",
    traitsSectionHeading: "TRATTI DEI NANI",
    subraces: [
      { slug: "nano_colline", label: "Nano delle colline", sectionHeading: "NANO DELLE COLLINE" },
      { slug: "nano_montagne", label: "Nano delle montagne", sectionHeading: "NANO DELLE MONTAGNE" },
    ],
  },
  { slug: "umano", label: "Umano", traitsSectionHeading: "TRATTI DEGLI UMANI" },
  { slug: "dragonide", label: "Dragonide", traitsSectionHeading: "TRATTI DEI DRAGONIDI" },
  {
    slug: "gnomo",
    label: "Gnomo",
    traitsSectionHeading: "__CONTENT__",
    traitsContentAnchor: "Un personaggio gnomo possiede",
    subraces: [
      { slug: "gnomo_foreste", label: "Gnomo delle foreste", sectionHeading: "GNOMO DELLE FORESTE" },
      { slug: "gnomo_rocce", label: "Gnomo delle rocce", sectionHeading: "GNOMO DELLE ROCCE" },
    ],
  },
  { slug: "mezzelfo", label: "Mezzelfo", traitsSectionHeading: "TRATTI DEI MEZZELFI" },
  { slug: "mezzorco", label: "Mezzorco", traitsSectionHeading: "TRATTI DEI MEZZORCHI" },
  {
    slug: "tiefling",
    label: "Tiefling",
    traitsSectionHeading: "__CONTENT__",
    traitsContentAnchor: "I tiefling condividono alcuni tratti razziali",
  },
];

export const CLASS_OPTIONS: ClassCatalogEntry[] = [
  {
    slug: "barbaro",
    label: "Barbaro",
    privilegesAnchor: "Un barbaro ottiene i seguenti privilegi di classe",
    spellProgression: "none",
    spellList: null,
  },
  {
    slug: "bardo",
    label: "Bardo",
    privilegesAnchor: "Un bardo ottiene i seguenti privilegi di classe",
    spellcastingAnchor: `La tabella "Bardo" indica quanti slot incantesimo`,
    spellProgression: "full",
    spellList: { style: "h2", sectionHeading: "INCANTESIMI DA BARDO" },
  },
  {
    slug: "chierico",
    label: "Chierico",
    privilegesAnchor: "Un chierico ottiene i seguenti privilegi di classe",
    spellcastingAnchor: "Un chierico è un tramite del potere divino",
    spellProgression: "full",
    spellList: { style: "h2", sectionHeading: "INCANTESIMI DA CHIERICO" },
  },
  {
    slug: "druido",
    label: "Druido",
    privilegesAnchor: "Un druido ottiene i seguenti privilegi di classe",
    spellcastingAnchor: "Un druido attinge all'essenza divina della natura",
    spellProgression: "full",
    spellList: { style: "h1", chapter: "INCANTESIMI DA DRUIDO" },
  },
  {
    slug: "guerriero",
    label: "Guerriero",
    privilegesAnchor: "Un guerriero ottiene i seguenti privilegi di classe",
    spellProgression: "none",
    spellList: null,
  },
  {
    slug: "ladro",
    label: "Ladro",
    privilegesAnchor: "Un ladro ottiene i seguenti privilegi di classe",
    spellcastingAnchor: "Quando arriva al 3° livello, il ladro ottiene",
    spellProgression: "subclass",
    spellList: null,
  },
  {
    slug: "mago",
    label: "Mago",
    privilegesAnchor: "Un mago ottiene i seguenti privilegi di classe",
    spellcastingAnchor: "Un mago è uno studioso di magia arcana",
    spellProgression: "full",
    spellList: { style: "h1", chapter: "INCANTESIMI DA MAGO" },
  },
  {
    slug: "monaco",
    label: "Monaco",
    privilegesAnchor: "Un monaco ottiene i seguenti privilegi di classe",
    spellProgression: "none",
    spellList: null,
  },
  {
    slug: "paladino",
    label: "Paladino",
    privilegesAnchor: "Un paladino ottiene i seguenti privilegi di classe",
    spellcastingAnchor: "Quando arriva al 2° livello, un paladino attinge",
    spellProgression: "half",
    spellList: { style: "h1", chapter: "INCANTESIMI DA PALADINO" },
  },
  {
    slug: "ranger",
    label: "Ranger",
    privilegesAnchor: "Un ranger ottiene i seguenti privilegi di classe",
    spellcastingAnchor: "Quando arriva al 2° livello, un ranger impara",
    spellProgression: "half",
    spellList: { style: "h1", chapter: "INCANTESIMI DA RANGER" },
  },
  {
    slug: "stregone",
    label: "Stregone",
    privilegesAnchor: "Uno stregone ottiene i seguenti privilegi di classe",
    spellcastingAnchor: "Un evento nel passato dello stregone o nella vita",
    spellProgression: "full",
    spellList: { style: "h1", chapter: "INCANTESIMI DA STREGONE" },
  },
  {
    slug: "warlock",
    label: "Warlock",
    privilegesAnchor: "Un warlock ottiene i seguenti privilegi di classe",
    spellcastingAnchor: `La tabella "Warlock" indica quanti slot incantesimo`,
    spellProgression: "pact",
    spellList: { style: "h1", chapter: "INCANTESIMI DA WARLOCK" },
  },
];

export const BACKGROUND_OPTIONS: BackgroundCatalogEntry[] = [
  { slug: "accolito", label: "Accolito", phbH1: "ACCOLITO", opener: "Un accolito ha passato la sua vita" },
  {
    slug: "artigiano_gilda",
    label: "Artigiano di gilda",
    phbH1: "ARTIGIANO DI GILDA",
    opener: "Questo artigiano appartiene a una gilda",
  },
  { slug: "ciarlatano", label: "Ciarlatano", phbH1: "CIARLATANO", opener: "Un ciarlatano è sempre stato portato" },
  { slug: "criminale", label: "Criminale", phbH1: "CRIMINALE", opener: "Un criminale è un esperto" },
  { slug: "eroe_popolare", label: "Eroe popolare", phbH1: "EROE POPOLARE", opener: "Un eroe popolare proviene dai ceti" },
  { slug: "forestiero", label: "Forestiero", phbH1: "FORESTIERO", opener: "Un forestiero è cresciuto nelle terre selvagge" },
  { slug: "intrattenitore", label: "Intrattenitore", phbH1: "INTRATTENITORE", opener: "Un intrattenitore brilla soprattutto quando" },
  { slug: "nobile", label: "Nobile", phbH1: "NOBILE", opener: "Un nobile conosce l'importanza della ricchezza" },
  { slug: "sapiente", label: "Sapiente", phbH1: "SAPIENTE", opener: "Un sapiente ha trascorso anni e anni" },
  { slug: "soldato", label: "Soldato", phbH1: "SOLDATO", opener: "La guerra è stata una presenza costante" },
];

export function classByLabel(label: string | null | undefined): ClassCatalogEntry | null {
  if (!label?.trim()) return null;
  const t = label.trim();
  return CLASS_OPTIONS.find((c) => c.label.toLowerCase() === t.toLowerCase()) ?? null;
}

export function raceBySlug(slug: string | null | undefined): RaceCatalogEntry | null {
  if (!slug?.trim()) return null;
  return RACE_OPTIONS.find((r) => r.slug === slug) ?? null;
}

export function backgroundBySlug(slug: string | null | undefined): BackgroundCatalogEntry | null {
  if (!slug?.trim()) return null;
  return BACKGROUND_OPTIONS.find((b) => b.slug === slug) ?? null;
}

export function maxSpellLevelOnSheet(classDef: ClassCatalogEntry | null, characterLevel: number): number {
  if (!classDef?.spellList) return -1;
  const L = Math.max(1, Math.min(20, characterLevel));
  switch (classDef.spellProgression) {
    case "none":
    case "subclass":
      return -1;
    case "full":
      return Math.min(9, Math.ceil(L / 2));
    case "half":
      if (L < 2) return -1;
      return Math.min(5, Math.ceil(L / 4));
    case "pact":
      return Math.min(5, Math.ceil(L / 2));
    default:
      return -1;
  }
}
