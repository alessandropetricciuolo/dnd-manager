// Testo da public/manuals/manuale_giocatore.md, Appendice A, pp. 290–292.
// La voce Pietrificato prosegue dopo il riquadro Indebolimento.
export const COMBAT_CONDITIONS = [
  {
    "id": "accecato",
    "label": "Accecato",
    "page": 290,
    "paragraphs": [
      "Una creatura accecata non è in grado di vedere e fallisce automaticamente qualsiasi prova di caratteristica che richieda l'uso della vista.",
      "I tiri per colpire contro la creatura dispongono di vantaggio, mentre i tiri per colpire della creatura subiscono svantaggio."
    ]
  },
  {
    "id": "affascinato",
    "label": "Affascinato",
    "page": 290,
    "paragraphs": [
      "Una creatura affascinata non può attaccare o bersagliare colui che l'ha affascinata con capacità o effetti magici dannosi.",
      "Colui che ha affascinato la creatura dispone di vantaggio a qualsiasi prova di caratteristica effettuata per interagire socialmente con essa."
    ]
  },
  {
    "id": "afferrato",
    "label": "Afferrato",
    "page": 290,
    "paragraphs": [
      "La velocità di una creatura afferrata diventa 0 e non può beneficiare di alcun bonus alla velocità.",
      "La condizione termina se il lottatore che ha afferrato la creatura è incapacitato (vedi la relativa condizione).",
      "La condizione termina anche se un effetto rimuove la creatura afferrata dalla portata del lottatore che l'ha afferrata o dall'effetto afferrante, come per esempio quando una creatura viene scagliata via dall'incantesimo onda tonante."
    ]
  },
  {
    "id": "assordato",
    "label": "Assordato",
    "page": 290,
    "paragraphs": [
      "Una creatura assordata non è in grado di sentire e fallisce automaticamente qualsiasi prova di caratteristica che richieda l'uso dell'udito."
    ]
  },
  {
    "id": "avvelenato",
    "label": "Avvelenato",
    "page": 290,
    "paragraphs": [
      "Una creatura avvelenata subisce svantaggio ai tiri per colpire e alle prove di caratteristica."
    ]
  },
  {
    "id": "incapacitato",
    "label": "Incapacitato",
    "page": 291,
    "paragraphs": [
      "Una creatura incapacitata non può effettuare azioni o reazioni."
    ]
  },
  {
    "id": "indebolimento",
    "label": "Indebolimento",
    "page": 291,
    "paragraphs": [
      "Alcune capacità speciali e pericoli ambientali, come la fame e gli effetti a lungo termine delle temperature gelide o roventi, possono indurre una condizione speciale chiamata indebolimento. L'indebolimento è misurato in sei livelli. Un effetto può imporre a una creatura uno o più livelli di indebolimento, come specificato nella descrizione dell'effetto.",
      "1. Svantaggio alle prove di caratteristica\n2. Velocità dimezzata\n3. Svantaggio ai tiri per colpire e ai tiri salvezza\n4. Massimo dei punti ferita dimezzato\n5. Velocità ridotta a 0\n6. Morte",
      "Se una creatura già sotto l'effetto di indebolimento subisce un ulteriore effetto di indebolimento, il suo attuale livello di indebolimento aumenta dell'ammontare specificato nella descrizione dell'effetto.",
      "Una creatura subisce l'effetto del suo attuale livello di indebolimento nonché quelli relativi a tutti i livelli inferiori. Per esempio, se una creatura subisce un livello 2 di indebolimento, la sua velocità è dimezzata e le sue prove di caratteristica subiscono svantaggio.",
      "Un effetto che rimuove l'indebolimento riduce il suo livello come specificato nella descrizione dell'effetto; se il livello di indebolimento di una creatura scende a meno di 1, tutti gli effetti di indebolimento terminano per quella creatura.",
      "Completando un riposo lungo, una creatura riduce di 1 il suo livello di indebolimento, purché abbia anche avuto modo di mangiare e bere qualcosa."
    ]
  },
  {
    "id": "invisibile",
    "label": "Invisibile",
    "page": 291,
    "paragraphs": [
      "Una creatura invisibile è impossibile da vedere senza l'aiuto della magia o di sensi speciali. Agli effetti del nascondersi, una creatura invisibile è considerata pesantemente oscurata. L'ubicazione della creatura può essere intuita dai rumori che emette o dalle tracce che lascia.",
      "I tiri per colpire contro la creatura subiscono svantaggio, mentre i tiri per colpire della creatura ottengono vantaggio."
    ]
  },
  {
    "id": "paralizzato",
    "label": "Paralizzato",
    "page": 291,
    "paragraphs": [
      "Una creatura paralizzata è incapacitata (vedi la relativa condizione) e non può muoversi o parlare.",
      "La creatura fallisce automaticamente i tiri salvezza su Forza e Destrezza.",
      "I tiri per colpire contro la creatura ottengono vantaggio.",
      "Ogni attacco che colpisce la creatura è un colpo critico se l'attaccante è situato entro 1,5 metri dalla creatura."
    ]
  },
  {
    "id": "pietrificato",
    "label": "Pietrificato",
    "page": 291,
    "paragraphs": [
      "Una creatura pietrificata viene trasformata, assieme a ogni oggetto non magico che stia trasportando o indossando, in una sostanza solida inanimata (solitamente la pietra). La creatura cessa di invecchiare e il suo peso viene decuplicato.",
      "La creatura è incapacitata (vedi la relativa condizione), non può muoversi o parlare e non è consapevole di ciò che accade attorno a lei.",
      "I tiri per colpire contro la creatura ottengono vantaggio.",
      "La creatura fallisce automaticamente i tiri salvezza su Forza e Destrezza.",
      "La creatura dispone di resistenza a tutti i danni.",
      "La creatura è immune ai veleni e alle malattie, ma gli eventuali veleni o malattie già presenti nel suo sistema vengono solo sospesi, non neutralizzati."
    ]
  },
  {
    "id": "privo-di-sensi",
    "label": "Privo di sensi",
    "page": 292,
    "paragraphs": [
      "Una creatura priva di sensi è incapacitata (vedi la relativa condizione), non può muoversi o parlare e non è consapevole di ciò che accade attorno a lei.",
      "La creatura lascia cadere tutto ciò che impugnava e cade a terra prona.",
      "La creatura fallisce automaticamente i tiri salvezza su Forza e Destrezza.",
      "I tiri per colpire contro la creatura ottengono vantaggio.",
      "Ogni attacco che colpisce la creatura è un colpo critico se l'attaccante è situato entro 1,5 metri dalla creatura."
    ]
  },
  {
    "id": "prono",
    "label": "Prono",
    "page": 292,
    "paragraphs": [
      "L'unica opzione di movimento di una creatura prona è strisciare, a meno che non si rialzi in piedi, ponendo in quel modo fine alla sua condizione.",
      "La creatura subisce svantaggio ai tiri per colpire.",
      "Un tiro per colpire contro la creatura ottiene vantaggio se l'attaccante si trova entro 1,5 metri dalla creatura. Altrimenti, il tiro per colpire subisce svantaggio."
    ]
  },
  {
    "id": "spaventato",
    "label": "Spaventato",
    "page": 292,
    "paragraphs": [
      "Una creatura spaventata subisce svantaggio alle prove di caratteristica e ai tiri per colpire finché la fonte della sua paura rimane entro linea di vista.",
      "La creatura non può muoversi per avvicinarsi volontariamente alla fonte della sua paura."
    ]
  },
  {
    "id": "stordito",
    "label": "Stordito",
    "page": 292,
    "paragraphs": [
      "Una creatura stordita è incapacitata (vedi la relativa condizione), non può muoversi e può parlare soltanto a fatica.",
      "La creatura fallisce automaticamente i tiri salvezza su Forza e Destrezza.",
      "I tiri per colpire contro la creatura ottengono vantaggio."
    ]
  },
  {
    "id": "trattenuto",
    "label": "Trattenuto",
    "page": 292,
    "paragraphs": [
      "La velocità di una creatura trattenuta diventa 0 e non può beneficiare di alcun bonus alla velocità.",
      "I tiri per colpire contro la creatura ottengono vantaggio, mentre i tiri per colpire della creatura subiscono svantaggio.",
      "La creatura subisce svantaggio ai tiri salvezza su Destrezza."
    ]
  }
] as const;

export type CombatConditionId = (typeof COMBAT_CONDITIONS)[number]["id"];

export function normalizeCombatConditions(value: unknown): CombatConditionId[] {
  if (!Array.isArray(value)) return [];
  return COMBAT_CONDITIONS.filter((condition) => value.includes(condition.id)).map((condition) => condition.id);
}
