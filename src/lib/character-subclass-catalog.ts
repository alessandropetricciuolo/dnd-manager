/**
 * Sottoclassi catalogate (PHB + Guida di Xanathar + Calderone di Tasha).
 * Non sono classi in `CLASS_OPTIONS`: qui servono ancore ingest (`section_heading`) + manuale.
 * Altre sottoclassi: voce “Altro” e testo libero.
 */

import type { ClassSupplementRulesSource } from "@/lib/character-build-catalog";
import { PHB_BOOK_KEY, PHB_MD_FILE } from "@/lib/character-build-catalog";
import type { WikiManualBookKey } from "@/lib/manual-book-catalog";

export type SubclassCatalogEntry = {
  slug: string;
  parentClassLabel: string;
  /** Testo salvato in `class_subclass` e mostrato in scheda */
  label: string;
  /** `metadata.section_heading` probabile (maiuscolo, come in snapshot). Ordine di prova. */
  sectionHeadings: string[];
  supplementRulesSource: ClassSupplementRulesSource;
  /** Se gli heading non bastano (OCR senza #), ricerca contenuto nel manuale indicato */
  contentIlikeFallback?: string;
};

const XGE: ClassSupplementRulesSource = {
  markdownFile: "xanathar.md",
  manualBookKey: "xanathar" as WikiManualBookKey,
};

const TCE: ClassSupplementRulesSource = {
  markdownFile: "Tasha.md",
  manualBookKey: "tasha" as WikiManualBookKey,
};

const PHB: ClassSupplementRulesSource = {
  markdownFile: PHB_MD_FILE,
  manualBookKey: PHB_BOOK_KEY as WikiManualBookKey,
};

function H(...s: string[]): string[] {
  return s.map((x) => x.toUpperCase());
}

const PHB_SUBCLASS_OPTIONS: SubclassCatalogEntry[] = [
  {
    slug: "phb-barbaro-berserker",
    parentClassLabel: "Barbaro",
    label: "Cammino del Berserker",
    sectionHeadings: H("CAMMINO DEL BERSERKER"),
    supplementRulesSource: PHB,
  },
  {
    slug: "phb-barbaro-totemico",
    parentClassLabel: "Barbaro",
    label: "Cammino del Combattente Totemico",
    sectionHeadings: H("CAMMINO DEL COMBATTENTE TOTEMICO"),
    supplementRulesSource: PHB,
  },
  {
    slug: "phb-bardo-sapienza",
    parentClassLabel: "Bardo",
    label: "Collegio della Sapienza",
    sectionHeadings: H("COLLEGIO DELLA SAPIENZA"),
    supplementRulesSource: PHB,
  },
  {
    slug: "phb-bardo-valore",
    parentClassLabel: "Bardo",
    label: "Collegio del Valore",
    sectionHeadings: H("COLLEGIO DEL VALORE"),
    supplementRulesSource: PHB,
  },
  {
    slug: "phb-chierico-conoscenza",
    parentClassLabel: "Chierico",
    label: "Dominio della Conoscenza",
    sectionHeadings: H("DOMINIO DELLA CONOSCENZA"),
    supplementRulesSource: PHB,
  },
  {
    slug: "phb-chierico-guerra",
    parentClassLabel: "Chierico",
    label: "Dominio della Guerra",
    sectionHeadings: H("DOMINIO DELLA GUERRA"),
    supplementRulesSource: PHB,
  },
  {
    slug: "phb-chierico-inganno",
    parentClassLabel: "Chierico",
    label: "Dominio dell'Inganno",
    sectionHeadings: H("DOMINIO DELL'INGANNO"),
    supplementRulesSource: PHB,
  },
  {
    slug: "phb-chierico-luce",
    parentClassLabel: "Chierico",
    label: "Dominio della Luce",
    sectionHeadings: H("DOMINIO DELLA LUCE"),
    supplementRulesSource: PHB,
  },
  {
    slug: "phb-chierico-natura",
    parentClassLabel: "Chierico",
    label: "Dominio della Natura",
    sectionHeadings: H("DOMINIO DELLA NATURA"),
    supplementRulesSource: PHB,
  },
  {
    slug: "phb-chierico-tempesta",
    parentClassLabel: "Chierico",
    label: "Dominio della Tempesta",
    sectionHeadings: H("DOMINIO DELLA TEMPESTA"),
    supplementRulesSource: PHB,
  },
  {
    slug: "phb-chierico-vita",
    parentClassLabel: "Chierico",
    label: "Dominio della Vita",
    sectionHeadings: H("DOMINIO DELLA VITA"),
    supplementRulesSource: PHB,
  },
  {
    slug: "phb-druido-terra",
    parentClassLabel: "Druido",
    label: "Circolo della Terra",
    sectionHeadings: H("CIRCOLO DELLA TERRA"),
    supplementRulesSource: PHB,
  },
  {
    slug: "phb-druido-luna",
    parentClassLabel: "Druido",
    label: "Circolo della Luna",
    sectionHeadings: H("CIRCOLO DELLA LUNA"),
    supplementRulesSource: PHB,
  },
  {
    slug: "phb-guerriero-campione",
    parentClassLabel: "Guerriero",
    label: "Campione",
    sectionHeadings: H("CAMPIONE"),
    contentIlikeFallback: `%L'archetipo del Campione%`,
    supplementRulesSource: PHB,
  },
  {
    slug: "phb-guerriero-maestro-battaglia",
    parentClassLabel: "Guerriero",
    label: "Maestro di Battaglia",
    sectionHeadings: H("MAESTRO DI BATTAGLIA"),
    supplementRulesSource: PHB,
  },
  {
    slug: "phb-guerriero-cavaliere-mistico",
    parentClassLabel: "Guerriero",
    label: "Cavaliere Mistico",
    sectionHeadings: H("CAVALIERE MISTICO"),
    supplementRulesSource: PHB,
  },
  {
    slug: "phb-ladro-furfante",
    parentClassLabel: "Ladro",
    label: "Furfante",
    sectionHeadings: H("FURFANTE"),
    supplementRulesSource: PHB,
  },
  {
    slug: "phb-ladro-assassino",
    parentClassLabel: "Ladro",
    label: "Assassino",
    sectionHeadings: H("ASSASSINO"),
    supplementRulesSource: PHB,
  },
  {
    slug: "phb-ladro-mistificatore-arcano",
    parentClassLabel: "Ladro",
    label: "Mistificatore Arcano",
    sectionHeadings: H("MISTIFICATORE ARCANO"),
    supplementRulesSource: PHB,
  },
  {
    slug: "phb-mago-abiurazione",
    parentClassLabel: "Mago",
    label: "Scuola di Abiurazione",
    sectionHeadings: H("SCUOLA DI ABIURAZIONE"),
    supplementRulesSource: PHB,
  },
  {
    slug: "phb-mago-ammaliamento",
    parentClassLabel: "Mago",
    label: "Scuola di Ammaliamento",
    sectionHeadings: H("SCUOLA DI AMMALIAMENTO"),
    supplementRulesSource: PHB,
  },
  {
    slug: "phb-mago-divinazione",
    parentClassLabel: "Mago",
    label: "Scuola di Divinazione",
    sectionHeadings: H("SCUOLA DI DIVINAZIONE"),
    supplementRulesSource: PHB,
  },
  {
    slug: "phb-mago-evocazione",
    parentClassLabel: "Mago",
    label: "Scuola di Evocazione",
    sectionHeadings: H("SCUOLA DI EVOCAZIONE"),
    supplementRulesSource: PHB,
  },
  {
    slug: "phb-mago-illusione",
    parentClassLabel: "Mago",
    label: "Scuola di Illusione",
    sectionHeadings: H("SCUOLA DI ILLUSIONE"),
    supplementRulesSource: PHB,
  },
  {
    slug: "phb-mago-invocazione",
    parentClassLabel: "Mago",
    label: "Scuola di Invocazione",
    sectionHeadings: H("SCUOLA DI INVOCAZIONE"),
    supplementRulesSource: PHB,
  },
  {
    slug: "phb-mago-necromanzia",
    parentClassLabel: "Mago",
    label: "Scuola di Necromanzia",
    sectionHeadings: H("SCUOLA DI NECROMANZIA"),
    supplementRulesSource: PHB,
  },
  {
    slug: "phb-mago-trasmutazione",
    parentClassLabel: "Mago",
    label: "Scuola di Trasmutazione",
    sectionHeadings: H("SCUOLA DI TRASMUTAZIONE"),
    supplementRulesSource: PHB,
  },
  {
    slug: "phb-monaco-mano-aperta",
    parentClassLabel: "Monaco",
    label: "Via della Mano Aperta",
    sectionHeadings: H("VIA DELLA MANO APERTA"),
    supplementRulesSource: PHB,
  },
  {
    slug: "phb-monaco-ombra",
    parentClassLabel: "Monaco",
    label: "Via dell'Ombra",
    sectionHeadings: H("VIA DELL'OMBRA"),
    supplementRulesSource: PHB,
  },
  {
    slug: "phb-monaco-quattro-elementi",
    parentClassLabel: "Monaco",
    label: "Via dei Quattro Elementi",
    sectionHeadings: H("VIA DEI QUATTRO ELEMENTI"),
    supplementRulesSource: PHB,
  },
  {
    slug: "phb-paladino-devozione",
    parentClassLabel: "Paladino",
    label: "Giuramento di Devozione",
    sectionHeadings: H("GIURAMENTO DI DEVOZIONE"),
    supplementRulesSource: PHB,
  },
  {
    slug: "phb-paladino-antichi",
    parentClassLabel: "Paladino",
    label: "Giuramento degli Antichi",
    sectionHeadings: H("GIURAMENTO DEGLI ANTICHI"),
    supplementRulesSource: PHB,
  },
  {
    slug: "phb-paladino-vendetta",
    parentClassLabel: "Paladino",
    label: "Giuramento di Vendetta",
    sectionHeadings: H("GIURAMENTO DI VENDETTA"),
    supplementRulesSource: PHB,
  },
  {
    slug: "phb-ranger-cacciatore",
    parentClassLabel: "Ranger",
    label: "Cacciatore",
    sectionHeadings: H("CACCIATORE", "PREDA DEL CACCIATORE"),
    supplementRulesSource: PHB,
  },
  {
    slug: "phb-ranger-signore-bestie",
    parentClassLabel: "Ranger",
    label: "Signore delle Bestie",
    sectionHeadings: H("SIGNORE DELLE BESTIE"),
    supplementRulesSource: PHB,
  },
  {
    slug: "phb-stregone-draconico",
    parentClassLabel: "Stregone",
    label: "Discendenza draconica",
    sectionHeadings: H("DISCENDENZA DRACONICA"),
    supplementRulesSource: PHB,
  },
  {
    slug: "phb-stregone-magia-selvaggia",
    parentClassLabel: "Stregone",
    label: "Magia selvaggia",
    sectionHeadings: H("MAGIA SELVAGGIA"),
    supplementRulesSource: PHB,
  },
  {
    slug: "phb-warlock-fatato",
    parentClassLabel: "Warlock",
    label: "Il Signore Fatato",
    sectionHeadings: H("IL SIGNORE FATATO"),
    supplementRulesSource: PHB,
  },
  {
    slug: "phb-warlock-immondo",
    parentClassLabel: "Warlock",
    label: "L'Immondo",
    sectionHeadings: H("L'IMMONDO", "IMMONDO"),
    supplementRulesSource: PHB,
  },
  {
    slug: "phb-warlock-grande-antico",
    parentClassLabel: "Warlock",
    label: "Il Grande Antico",
    sectionHeadings: H("IL GRANDE ANTICO", "GRANDE ANTICO"),
    supplementRulesSource: PHB,
  },
];

const XGE_TCE_SUBCLASS_OPTIONS: SubclassCatalogEntry[] = [
  // —— Xanathar (tabella Sottoclassi) ——
  {
    slug: "xge-barbaro-guardiano-ancestrale",
    parentClassLabel: "Barbaro",
    label: "Cammino del Guardiano Ancestrale",
    sectionHeadings: H("CAMMINO DEL GUARDIANO ANCESTRALE"),
    supplementRulesSource: XGE,
  },
  {
    slug: "xge-barbaro-araldo-tempesta",
    parentClassLabel: "Barbaro",
    label: "Cammino dell'Araldo della Tempesta",
    sectionHeadings: H("CAMMINO DELL'ARALDO DELLA TEMPESTA"),
    supplementRulesSource: XGE,
  },
  {
    slug: "xge-barbaro-zelota",
    parentClassLabel: "Barbaro",
    label: "Cammino dello Zelota",
    sectionHeadings: H("CAMMINO DELLO ZELOTA"),
    supplementRulesSource: XGE,
  },
  {
    slug: "xge-bardo-sussurri",
    parentClassLabel: "Bardo",
    label: "Collegio dei Sussurri",
    sectionHeadings: H("COLLEGIO DEI SUSSURRI"),
    supplementRulesSource: XGE,
  },
  {
    slug: "xge-bardo-incanto",
    parentClassLabel: "Bardo",
    label: "Collegio dell'Incanto",
    sectionHeadings: H("COLLEGIO DELL'INCANTO"),
    supplementRulesSource: XGE,
  },
  {
    slug: "xge-bardo-spade",
    parentClassLabel: "Bardo",
    label: "Collegio delle Spade",
    sectionHeadings: H("COLLEGIO DELLE SPADE"),
    supplementRulesSource: XGE,
  },
  {
    slug: "xge-chierico-forgia",
    parentClassLabel: "Chierico",
    label: "Dominio della Forgia",
    sectionHeadings: H("DOMINIO DELLA FORGIA"),
    supplementRulesSource: XGE,
  },
  {
    slug: "xge-chierico-tomba",
    parentClassLabel: "Chierico",
    label: "Dominio della Tomba",
    sectionHeadings: H("DOMINIO DELLA TOMBA"),
    supplementRulesSource: XGE,
  },
  {
    slug: "xge-druido-sogni",
    parentClassLabel: "Druido",
    label: "Circolo dei Sogni",
    sectionHeadings: H("CIRCOLO DEI SOGNI"),
    supplementRulesSource: XGE,
  },
  {
    slug: "xge-druido-pastore",
    parentClassLabel: "Druido",
    label: "Circolo del Pastore",
    sectionHeadings: H("CIRCOLO DEL PASTORE"),
    supplementRulesSource: XGE,
  },
  {
    slug: "xge-guerriero-arciere-arcano",
    parentClassLabel: "Guerriero",
    label: "Arciere Arcano",
    sectionHeadings: H("ARCIERE ARCANO"),
    supplementRulesSource: XGE,
  },
  {
    slug: "xge-guerriero-cavaliere-errante",
    parentClassLabel: "Guerriero",
    label: "Cavaliere Errante",
    sectionHeadings: H("CAVALIERE ERRANTE"),
    supplementRulesSource: XGE,
  },
  {
    slug: "xge-guerriero-samurai",
    parentClassLabel: "Guerriero",
    label: "Samurai",
    sectionHeadings: H("SAMURAI"),
    supplementRulesSource: XGE,
  },
  {
    slug: "xge-ladro-esploratore",
    parentClassLabel: "Ladro",
    label: "Esploratore",
    sectionHeadings: H("ESPLORATORE", "PRIVILEGI DELL'ESPLORATORE"),
    supplementRulesSource: XGE,
  },
  {
    slug: "xge-ladro-indagatore",
    parentClassLabel: "Ladro",
    label: "Indagatore",
    sectionHeadings: H("INDAGATORE"),
    supplementRulesSource: XGE,
  },
  {
    slug: "xge-ladro-pianificatore",
    parentClassLabel: "Ladro",
    label: "Pianificatore",
    sectionHeadings: H("PIANIFICATORE"),
    supplementRulesSource: XGE,
  },
  {
    slug: "xge-ladro-spadaccino",
    parentClassLabel: "Ladro",
    label: "Spadaccino",
    sectionHeadings: H("SPADACCINO", "SCHERMAGLIATORE"),
    supplementRulesSource: XGE,
  },
  {
    slug: "xge-mago-guerra",
    parentClassLabel: "Mago",
    label: "Magia della Guerra",
    sectionHeadings: H("MAGIA DELLA GUERRA"),
    supplementRulesSource: XGE,
  },
  {
    slug: "xge-monaco-kensei",
    parentClassLabel: "Monaco",
    label: "Via del Kensei",
    sectionHeadings: H("VIA DEL KENSEI"),
    supplementRulesSource: XGE,
  },
  {
    slug: "xge-monaco-maestro-ubriaco",
    parentClassLabel: "Monaco",
    label: "Via del Maestro Ubriaco",
    sectionHeadings: H("VIA DEL MAESTRO UBRIACO"),
    supplementRulesSource: XGE,
  },
  {
    slug: "xge-monaco-anima-solare",
    parentClassLabel: "Monaco",
    label: "Via dell'Anima Solare",
    sectionHeadings: H("VIA DELL'ANIMA SOLARE"),
    supplementRulesSource: XGE,
  },
  {
    slug: "xge-paladino-conquista",
    parentClassLabel: "Paladino",
    label: "Giuramento di Conquista",
    sectionHeadings: H("GIURAMENTO DI CONQUISTA"),
    supplementRulesSource: XGE,
  },
  {
    slug: "xge-paladino-redenzione",
    parentClassLabel: "Paladino",
    label: "Giuramento di Redenzione",
    sectionHeadings: H("GIURAMENTO DI REDENZIONE"),
    supplementRulesSource: XGE,
  },
  {
    slug: "xge-ranger-tenebre",
    parentClassLabel: "Ranger",
    label: "Cacciatore delle Tenebre",
    sectionHeadings: H("CACCIATORE DELLE TENEBRE"),
    supplementRulesSource: XGE,
  },
  {
    slug: "xge-ranger-uccisore-mostri",
    parentClassLabel: "Ranger",
    label: "Uccisore di Mostri",
    sectionHeadings: H("UCCISORE DI MOSTRI"),
    supplementRulesSource: XGE,
  },
  {
    slug: "xge-ranger-viandante-orizzonte",
    parentClassLabel: "Ranger",
    label: "Viandante dell'Orizzonte",
    sectionHeadings: H("VIANDANTE DELL'ORIZZONTE"),
    supplementRulesSource: XGE,
  },
  {
    slug: "xge-stregone-anima-divina",
    parentClassLabel: "Stregone",
    label: "Anima Divina",
    sectionHeadings: H("ANIMA DIVINA"),
    supplementRulesSource: XGE,
  },
  {
    slug: "xge-stregone-magia-ombre",
    parentClassLabel: "Stregone",
    label: "Magia delle Ombre",
    sectionHeadings: H("MAGIA DELLE OMBRE"),
    supplementRulesSource: XGE,
  },
  {
    slug: "xge-stregone-tempesta",
    parentClassLabel: "Stregone",
    label: "Stregoneria della Tempesta",
    sectionHeadings: H("STREGONERIA DELLA TEMPESTA"),
    supplementRulesSource: XGE,
  },
  {
    slug: "xge-warlock-celestiale",
    parentClassLabel: "Warlock",
    label: "Il Celestiale",
    sectionHeadings: H("IL CELESTIALE", "CELESTIALE"),
    supplementRulesSource: XGE,
  },
  {
    slug: "xge-warlock-lama-sortilegio",
    parentClassLabel: "Warlock",
    label: "La Lama del Sortilegio",
    sectionHeadings: H("LA LAMA DEL SORTILEGIO", "LAMA DEL SORTILEGIO"),
    supplementRulesSource: XGE,
  },

  // —— Tasha: Artefice ——
  {
    slug: "tce-artefice-alchimista",
    parentClassLabel: "Artefice",
    label: "Alchimista",
    sectionHeadings: H("ALCHIMISTA"),
    supplementRulesSource: TCE,
  },
  {
    slug: "tce-artefice-armaiolo",
    parentClassLabel: "Artefice",
    label: "Armaiolo",
    sectionHeadings: H("ARMAIOLO"),
    contentIlikeFallback: "%specializzato come armaiolo%",
    supplementRulesSource: TCE,
  },
  {
    slug: "tce-artefice-artigliere",
    parentClassLabel: "Artefice",
    label: "Artigliere",
    sectionHeadings: H("ARTIGLIERE"),
    supplementRulesSource: TCE,
  },
  {
    slug: "tce-artefice-fabbro-battaglia",
    parentClassLabel: "Artefice",
    label: "Fabbro da battaglia",
    sectionHeadings: H("FABBRO DA BATTAGLIA"),
    supplementRulesSource: TCE,
  },

  // —— Tasha: opzioni di classe ——
  {
    slug: "tce-barbaro-bestia",
    parentClassLabel: "Barbaro",
    label: "Cammino della Bestia",
    sectionHeadings: H("CAMMINO DELLA BESTIA"),
    supplementRulesSource: TCE,
  },
  {
    slug: "tce-barbaro-magia-selvaggia",
    parentClassLabel: "Barbaro",
    label: "Cammino della Magia Selvaggia",
    sectionHeadings: H("CAMMINO DELLA MAGIA SELVAGGIA"),
    supplementRulesSource: TCE,
  },
  {
    slug: "tce-bardo-eloquenza",
    parentClassLabel: "Bardo",
    label: "Collegio dell'Eloquenza",
    sectionHeadings: H("COLLEGIO DELL'ELOQUENZA"),
    supplementRulesSource: TCE,
  },
  {
    slug: "tce-bardo-creazione",
    parentClassLabel: "Bardo",
    label: "Collegio della Creazione",
    sectionHeadings: H("COLLEGIO DELLA CREAZIONE"),
    supplementRulesSource: TCE,
  },
  {
    slug: "tce-chierico-crepuscolo",
    parentClassLabel: "Chierico",
    label: "Dominio del Crepuscolo",
    sectionHeadings: H("DOMINIO DEL CREPUSCOLO"),
    supplementRulesSource: TCE,
  },
  {
    slug: "tce-chierico-ordine",
    parentClassLabel: "Chierico",
    label: "Dominio dell'Ordine",
    sectionHeadings: H("DOMINIO DELL'ORDINE"),
    contentIlikeFallback: "%Dominio dell'Ordine%",
    supplementRulesSource: TCE,
  },
  {
    slug: "tce-chierico-pace",
    parentClassLabel: "Chierico",
    label: "Dominio della Pace",
    sectionHeadings: H("DOMINIO DELLA PACE"),
    supplementRulesSource: TCE,
  },
  {
    slug: "tce-druido-fiamma",
    parentClassLabel: "Druido",
    label: "Circolo della Fiamma",
    sectionHeadings: H("CIRCOLO DELLA FIAMMA"),
    supplementRulesSource: TCE,
  },
  {
    slug: "tce-druido-spore",
    parentClassLabel: "Druido",
    label: "Circolo delle Spore",
    sectionHeadings: H("CIRCOLO DELLE SPORE"),
    supplementRulesSource: TCE,
  },
  {
    slug: "tce-druido-stelle",
    parentClassLabel: "Druido",
    label: "Circolo delle Stelle",
    sectionHeadings: H("CIRCOLO DELLE STELLE"),
    supplementRulesSource: TCE,
  },
  {
    slug: "tce-guerriero-runico",
    parentClassLabel: "Guerriero",
    label: "Cavaliere Runico",
    sectionHeadings: H("CAVALIERE RUNICO"),
    supplementRulesSource: TCE,
  },
  {
    slug: "tce-guerriero-psionico",
    parentClassLabel: "Guerriero",
    label: "Guerriero Psionico",
    sectionHeadings: H("GUERRIERO PSIONICO"),
    supplementRulesSource: TCE,
  },
  {
    slug: "tce-ladro-fantasma",
    parentClassLabel: "Ladro",
    label: "Fantasma",
    sectionHeadings: H("FANTASMA"),
    supplementRulesSource: TCE,
  },
  {
    slug: "tce-ladro-lama-spirituale",
    parentClassLabel: "Ladro",
    label: "Lama Spirituale",
    sectionHeadings: H("LAMA SPIRITUALE"),
    supplementRulesSource: TCE,
  },
  {
    slug: "tce-mago-canto-lama",
    parentClassLabel: "Mago",
    label: "Canto della Lama",
    sectionHeadings: H("CANTO DELLA LAMA"),
    supplementRulesSource: TCE,
  },
  {
    slug: "tce-mago-scribi",
    parentClassLabel: "Mago",
    label: "Ordine degli Scribi",
    sectionHeadings: H("ORDINE DEGLI SCRIBI"),
    supplementRulesSource: TCE,
  },
  {
    slug: "tce-monaco-se-astrale",
    parentClassLabel: "Monaco",
    label: "Via del Sé Astrale",
    sectionHeadings: H("VIA DEL SÉ ASTRALE", "VIA DEL SE ASTRALE"),
    supplementRulesSource: TCE,
  },
  {
    slug: "tce-monaco-misericordia",
    parentClassLabel: "Monaco",
    label: "Via della Misericordia",
    sectionHeadings: H("VIA DELLA MISERICORDIA"),
    supplementRulesSource: TCE,
  },
  {
    slug: "tce-paladino-gloria",
    parentClassLabel: "Paladino",
    label: "Giuramento di Gloria",
    sectionHeadings: H("GIURAMENTO DI GLORIA"),
    supplementRulesSource: TCE,
  },
  {
    slug: "tce-paladino-sentinelle",
    parentClassLabel: "Paladino",
    label: "Giuramento delle Sentinelle",
    sectionHeadings: H("GIURAMENTO DELLE SENTINELLE"),
    supplementRulesSource: TCE,
  },
  {
    slug: "tce-ranger-custode-sciami",
    parentClassLabel: "Ranger",
    label: "Custode degli Sciami",
    sectionHeadings: H("CUSTODE DEGLI SCIAMI"),
    supplementRulesSource: TCE,
  },
  {
    slug: "tce-ranger-viandante-fatato",
    parentClassLabel: "Ranger",
    label: "Viandante Fatato",
    sectionHeadings: H("VIANDANTE FATATO"),
    supplementRulesSource: TCE,
  },
  {
    slug: "tce-stregone-anima-meccanica",
    parentClassLabel: "Stregone",
    label: "Anima Meccanica",
    sectionHeadings: H("ANIMA MECCANICA"),
    supplementRulesSource: TCE,
  },
  {
    slug: "tce-stregone-mente-aberrante",
    parentClassLabel: "Stregone",
    label: "Mente Aberrante",
    sectionHeadings: H("MENTE ABERRANTE"),
    supplementRulesSource: TCE,
  },
  {
    slug: "tce-warlock-genio",
    parentClassLabel: "Warlock",
    label: "Il Genio",
    sectionHeadings: H("IL GENIO", "GENIO"),
    supplementRulesSource: TCE,
  },
  {
    slug: "tce-warlock-insondabile",
    parentClassLabel: "Warlock",
    label: "L'Insondabile",
    sectionHeadings: H("L'INSONDABILE", "INSONDABILE"),
    supplementRulesSource: TCE,
  },
];

/** Tutte le sottoclassi mappate: PHB, poi XGE e TCE. */
export const SUPPLEMENT_SUBCLASS_OPTIONS: SubclassCatalogEntry[] = [
  ...PHB_SUBCLASS_OPTIONS,
  ...XGE_TCE_SUBCLASS_OPTIONS,
];

/** Suffix breve per menu (es. scheda PG). */
export function subclassCatalogSourceSuffix(entry: SubclassCatalogEntry): string {
  const k = entry.supplementRulesSource.manualBookKey;
  if (k === "player_handbook") return "PHB";
  if (k === "xanathar") return "XGE";
  if (k === "tasha") return "TCE";
  return entry.supplementRulesSource.markdownFile.replace(/\.md$/i, "");
}

function normLabel(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Opzioni catalogate per la classe scelta (etichetta come in `CLASS_OPTIONS`). */
export function supplementSubclassesForClass(parentClassLabel: string | null | undefined): SubclassCatalogEntry[] {
  if (!parentClassLabel?.trim()) return [];
  const n = normLabel(parentClassLabel);
  return SUPPLEMENT_SUBCLASS_OPTIONS.filter((e) => normLabel(e.parentClassLabel) === n).sort((a, b) =>
    a.label.localeCompare(b.label, "it")
  );
}

/** Abbinamento tolerant per snapshot / preload form. */
export function matchSupplementSubclass(
  parentClassLabel: string | null | undefined,
  subclassLabel: string | null | undefined
): SubclassCatalogEntry | null {
  if (!parentClassLabel?.trim() || !subclassLabel?.trim()) return null;
  const pn = normLabel(parentClassLabel);
  const sn = normLabel(subclassLabel);
  const cands = SUPPLEMENT_SUBCLASS_OPTIONS.filter((e) => normLabel(e.parentClassLabel) === pn);
  for (const e of cands) {
    if (normLabel(e.label) === sn) return e;
  }
  for (const e of cands) {
    if (e.sectionHeadings.some((h) => normLabel(h) === sn)) return e;
  }
  return null;
}

export function supplementSubclassBySlug(slug: string | null | undefined): SubclassCatalogEntry | null {
  if (!slug?.trim()) return null;
  return SUPPLEMENT_SUBCLASS_OPTIONS.find((e) => e.slug === slug) ?? null;
}
