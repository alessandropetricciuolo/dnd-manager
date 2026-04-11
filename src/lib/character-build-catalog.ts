/**
 * Liste chiuse per PG campagna lunga. Classi PHB: `manuale_giocatore.md` + ingest v4.
 * Classe Artefice: `Tasha.md` (stesso testo in ingest con `manual_book_key` tasha).
 */

import type { WikiManualBookKey } from "@/lib/manual-book-catalog";

export type SpellProgression = "none" | "full" | "half" | "half_up" | "pact" | "subclass";

export type ClassSupplementRulesSource = {
  markdownFile: string;
  manualBookKey: WikiManualBookKey;
};

/** Rimuove un blocco (inclusa la riga `afterLine`, esclusa `untilLine`) dopo l’estratto principale. */
export type ClassPrivilegesMdStrip = { afterLine: string; untilLine: string };

export type ClassCatalogEntry = {
  slug: string;
  label: string;
  /** Sottostringa unica per trovare il blocco «Privilegi di classe» (testo / Supabase). */
  privilegesAnchor: string;
  /** Varianti di frase (es. Eberron vs Tasha); la prima che matcha nel markdown vince. */
  privilegesAnchors?: string[];
  /**
   * File markdown da cui estrarre i privilegi (default: {@link PHB_MD_FILE}).
   */
  privilegesMarkdownFile?: string;
  /**
   * Se impostato, le query Supabase per privilegi/spellcasting/lista possono privilegiare questo manuale.
   * Di solito coincide con `privilegesMarkdownFile` + chiave ingest.
   */
  supplementRulesSource?: ClassSupplementRulesSource;
  /**
   * Fine blocco privilegi nel file indicato: regex su una riga; l’estratto termina prima di questa riga.
   * Se assente, si usa solo l’indice su Supabase.
   */
  privilegesExcerptStopPattern?: string;
  /** Ritagli aggiuntivi (es. lista incantesimi collocata nel mezzo della classe in Tasha). */
  privilegesMdStrips?: ClassPrivilegesMdStrip[];
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
  /** Manuale sorgente per i tratti (default: PHB). */
  supplementRulesSource?: ClassSupplementRulesSource;
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
export const MPMM_MD_FILE = "Mostri del multiverso.md";
export const MPMM_BOOK_KEY = "mordenkainen_multiverse" as const;

const MPMM_SOURCE: ClassSupplementRulesSource = {
  markdownFile: MPMM_MD_FILE,
  manualBookKey: MPMM_BOOK_KEY,
};

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
  { slug: "aarakocra", label: "Aarakocra", traitsSectionHeading: "TRATTI DELL'AARAKOCRA", supplementRulesSource: MPMM_SOURCE },
  { slug: "aasimar", label: "Aasimar", traitsSectionHeading: "TRATTI DELL'AASIMAR", supplementRulesSource: MPMM_SOURCE },
  { slug: "cangiante", label: "Cangiante", traitsSectionHeading: "CANGIANTE", supplementRulesSource: MPMM_SOURCE },
  { slug: "centauro", label: "Centauro", traitsSectionHeading: "TRATTI DEL CENTAURO", supplementRulesSource: MPMM_SOURCE },
  { slug: "coboldo", label: "Coboldo", traitsSectionHeading: "TRATTI DEL COBOLDO", supplementRulesSource: MPMM_SOURCE },
  { slug: "duergar", label: "Duergar", traitsSectionHeading: "TRATTI DEL DUERGAR", supplementRulesSource: MPMM_SOURCE },
  { slug: "eladrin", label: "Eladrin", traitsSectionHeading: "TRATTI DELL'ELADRIN", supplementRulesSource: MPMM_SOURCE },
  { slug: "elfo_mare", label: "Elfo del mare", traitsSectionHeading: "ELFO DEL MARE", supplementRulesSource: MPMM_SOURCE },
  { slug: "fata", label: "Fata", traitsSectionHeading: "TRATTI DELLA FATA", supplementRulesSource: MPMM_SOURCE },
  { slug: "firbolg", label: "Firbolg", traitsSectionHeading: "TRATTI DEL FIRBOLG", supplementRulesSource: MPMM_SOURCE },
  {
    slug: "genasi",
    label: "Genasi",
    traitsSectionHeading: "__CONTENT__",
    traitsContentAnchor: "TRATTI DEL GENASI DELL'ACQUA",
    supplementRulesSource: MPMM_SOURCE,
    subraces: [
      { slug: "genasi_acqua", label: "Genasi dell'acqua", sectionHeading: "TRATTI DEL GENASI DELL'ACQUA" },
      { slug: "genasi_aria", label: "Genasi dell'aria", sectionHeading: "TRATTI DEL GENASI DELL'ARIA" },
      { slug: "genasi_fuoco", label: "Genasi del fuoco", sectionHeading: "TRATTI DEL GENASI DEL FUOCO" },
      { slug: "genasi_terra", label: "Genasi della terra", sectionHeading: "TRATTI DEL GENASI DELLA TERRA" },
    ],
  },
  { slug: "githyanki", label: "Githyanki", traitsSectionHeading: "TRATTI DEL GITHYANKI", supplementRulesSource: MPMM_SOURCE },
  { slug: "githzerai", label: "Githzerai", traitsSectionHeading: "TRATTI DEL GITHZERAI", supplementRulesSource: MPMM_SOURCE },
  {
    slug: "gnomo_profondita",
    label: "Gnomo delle profondità",
    traitsSectionHeading: "TRATTI DELLO GNOMO DELLE PROFONDITÀ",
    supplementRulesSource: MPMM_SOURCE,
  },
  { slug: "goblin", label: "Goblin", traitsSectionHeading: "TRATTI DEL GOBLIN", supplementRulesSource: MPMM_SOURCE },
  { slug: "goliath", label: "Goliath", traitsSectionHeading: "TRATTI DEL GOLIATH", supplementRulesSource: MPMM_SOURCE },
  { slug: "hobgoblin", label: "Hobgoblin", traitsSectionHeading: "TRATTI DELL'HOBGOBLIN", supplementRulesSource: MPMM_SOURCE },
  { slug: "kenku", label: "Kenku", traitsSectionHeading: "TRATTI DEL KENKU", supplementRulesSource: MPMM_SOURCE },
  { slug: "leporidion", label: "Leporidion", traitsSectionHeading: "TRATTI DEL LEPORIDION", supplementRulesSource: MPMM_SOURCE },
  { slug: "lucertoloide", label: "Lucertoloide", traitsSectionHeading: "TRATTI DEL LUCERTOLOIDE", supplementRulesSource: MPMM_SOURCE },
  { slug: "minotauro", label: "Minotauro", traitsSectionHeading: "TRATTI DEL MINOTAURO", supplementRulesSource: MPMM_SOURCE },
  { slug: "morfico", label: "Morfico", traitsSectionHeading: "TRATTI DEL MORFICO", supplementRulesSource: MPMM_SOURCE },
  { slug: "orco", label: "Orco", traitsSectionHeading: "TRATTI DELL'ORCO", supplementRulesSource: MPMM_SOURCE },
  { slug: "satiro", label: "Satiro", traitsSectionHeading: "TRATTI DEL SATIRO", supplementRulesSource: MPMM_SOURCE },
  { slug: "shadar_kai", label: "Shadar-kai", traitsSectionHeading: "TRATTI DELLO SHADAR-KAI", supplementRulesSource: MPMM_SOURCE },
  { slug: "tabaxi", label: "Tabaxi", traitsSectionHeading: "TRATTI DEL TABAXI", supplementRulesSource: MPMM_SOURCE },
  { slug: "tortuga", label: "Tortuga", traitsSectionHeading: "TRATTI DEL TORTUGA", supplementRulesSource: MPMM_SOURCE },
  { slug: "tritone", label: "Tritone", traitsSectionHeading: "TRATTI DEL TRITONE", supplementRulesSource: MPMM_SOURCE },
  { slug: "urgoblin", label: "Urgoblin", traitsSectionHeading: "TRATTI DELL'URGOBLIN", supplementRulesSource: MPMM_SOURCE },
  { slug: "yuan_ti", label: "Yuan-ti", traitsSectionHeading: "TRATTI DELLO YUAN-TI", supplementRulesSource: MPMM_SOURCE },
];

export const CLASS_OPTIONS: ClassCatalogEntry[] = [
  {
    slug: "barbaro",
    label: "Barbaro",
    privilegesAnchor: "Un barbaro ottiene i seguenti privilegi di classe",
    privilegesExcerptStopPattern: "^##\\s+CAMMINI PRIMORDIALI\\s*$",
    spellProgression: "none",
    spellList: null,
  },
  {
    slug: "bardo",
    label: "Bardo",
    privilegesAnchor: "Un bardo ottiene i seguenti privilegi di classe",
    privilegesExcerptStopPattern: "^#\\s+BARDO\\s*$",
    spellcastingAnchor: `La tabella "Bardo" indica quanti slot incantesimo`,
    spellProgression: "full",
    spellList: { style: "h2", sectionHeading: "INCANTESIMI DA BARDO" },
  },
  {
    slug: "chierico",
    label: "Chierico",
    privilegesAnchor: "Un chierico ottiene i seguenti privilegi di classe",
    privilegesExcerptStopPattern: "^#\\s+INCANALARE DIVINITÀ",
    spellcastingAnchor: "Un chierico è un tramite del potere divino",
    spellProgression: "full",
    spellList: { style: "h2", sectionHeading: "INCANTESIMI DA CHIERICO" },
  },
  {
    slug: "druido",
    label: "Druido",
    privilegesAnchor: "Un druido ottiene i seguenti privilegi di classe",
    privilegesExcerptStopPattern: "^##\\s+FORMA SELVATICA",
    spellcastingAnchor: "Un druido attinge all'essenza divina della natura",
    spellProgression: "full",
    spellList: { style: "h1", chapter: "INCANTESIMI DA DRUIDO" },
  },
  {
    slug: "guerriero",
    label: "Guerriero",
    privilegesAnchor: "Un guerriero ottiene i seguenti privilegi di classe",
    privilegesExcerptStopPattern: "^##\\s+ARCHETIPI MARZIALI\\s*$",
    spellProgression: "none",
    spellList: null,
  },
  {
    slug: "ladro",
    label: "Ladro",
    privilegesAnchor: "Un ladro ottiene i seguenti privilegi di classe",
    privilegesExcerptStopPattern: "^#\\s+COLPO DI FORTUNA",
    spellcastingAnchor: "Quando arriva al 3° livello, il ladro ottiene",
    spellProgression: "subclass",
    spellList: null,
  },
  {
    slug: "mago",
    label: "Mago",
    privilegesAnchor: "Un mago ottiene i seguenti privilegi di classe",
    privilegesExcerptStopPattern: "^#\\s+RECUPERO ARCANO",
    spellcastingAnchor: "Un mago è uno studioso di magia arcana",
    spellProgression: "full",
    spellList: { style: "h1", chapter: "INCANTESIMI DA MAGO" },
  },
  {
    slug: "monaco",
    label: "Monaco",
    privilegesAnchor: "Un monaco ottiene i seguenti privilegi di classe",
    privilegesExcerptStopPattern: "^##\\s+KI\\s*$",
    spellProgression: "none",
    spellList: null,
  },
  {
    slug: "paladino",
    label: "Paladino",
    privilegesAnchor: "Un paladino ottiene i seguenti privilegi di classe",
    privilegesExcerptStopPattern: "^##\\s+PUNIZIONE DIVINA\\s*$",
    spellcastingAnchor: "Quando arriva al 2° livello, un paladino attinge",
    spellProgression: "half",
    spellList: { style: "h1", chapter: "INCANTESIMI DA PALADINO" },
  },
  {
    slug: "ranger",
    label: "Ranger",
    privilegesAnchor: "Un ranger ottiene i seguenti privilegi di classe",
    /** Ferma prima degli archetipi (Cacciatore / Signore delle Bestie), non a metà dei privilegi core. */
    privilegesExcerptStopPattern: "^##\\s+ARCHETIPI RANGER\\s*$",
    spellcastingAnchor: "Quando arriva al 2° livello, un ranger impara",
    spellProgression: "half",
    spellList: { style: "h1", chapter: "INCANTESIMI DA RANGER" },
  },
  {
    slug: "stregone",
    label: "Stregone",
    privilegesAnchor: "Uno stregone ottiene i seguenti privilegi di classe",
    privilegesExcerptStopPattern: "^##\\s+ORIGINE STREGONESCA\\s*$",
    spellcastingAnchor: "Un evento nel passato dello stregone o nella vita",
    spellProgression: "full",
    spellList: { style: "h1", chapter: "INCANTESIMI DA STREGONE" },
  },
  {
    slug: "warlock",
    label: "Warlock",
    privilegesAnchor: "Un warlock ottiene i seguenti privilegi di classe",
    privilegesExcerptStopPattern: "^##\\s+SUPPLICHE OCCULTE\\s*$",
    spellcastingAnchor: `La tabella "Warlock" indica quanti slot incantesimo`,
    spellProgression: "pact",
    spellList: { style: "h1", chapter: "INCANTESIMI DA WARLOCK" },
  },
  {
    slug: "artefice",
    label: "Artefice",
    privilegesAnchor: "L'artefice ottiene i seguenti privilegi di classe",
    privilegesAnchors: [
      "L'artefice ottiene i seguenti privilegi di classe",
      "Un artefice ottiene i seguenti privilegi di classe",
    ],
    privilegesMarkdownFile: "Tasha.md",
    supplementRulesSource: { markdownFile: "Tasha.md", manualBookKey: "tasha" },
    privilegesExcerptStopPattern: "^##\\s+SPECIALIZZAZIONI DA ARTEFICE\\s*$",
    privilegesMdStrips: [
      {
        afterLine: "# LISTA DEGLI INCANESIMI DA ARTEFICE",
        untilLine: "# INFONDERE NEGLI OGGETTI",
      },
    ],
    spellcastingAnchor: `La tabella "Artefice" indica quanti slot incantesimo`,
    spellProgression: "half_up",
    spellList: { style: "h1", chapter: "LISTA DEGLI INCANESIMI DA ARTEFICE" },
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
    case "half_up":
      return Math.min(5, Math.ceil(L / 4));
    case "pact":
      return Math.min(5, Math.ceil(L / 2));
    default:
      return -1;
  }
}
