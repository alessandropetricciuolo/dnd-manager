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

export function isCanonicalCombatConditionId(value: unknown): value is CombatConditionId {
  return typeof value === "string" && COMBAT_CONDITIONS.some((c) => c.id === value);
}

export type CombatStatusCategory = "condition" | "buff" | "tactical" | "custom";

export type CombatStatusDefinition = {
  id: string;
  label: string;
  category: CombatStatusCategory;
  icon: string;
  colorClass: string;
  summary: string;
  paragraphs?: readonly string[];
  page?: number;
  requiresConcentration?: boolean;
  defaultDurationTurns?: number | null;
  defaultTickOn?: "turn_start" | "turn_end";
  breaksConcentration?: boolean;
  acModifierFlat?: number;
  coverBonus?: 2 | 5;
  acFormulaHint?: string;
  isSingleUse?: boolean;
};

const CANONICAL_ICONS_META: Record<
  CombatConditionId,
  { icon: string; colorClass: string; summary: string; breaksConcentration?: boolean }
> = {
  accecato: {
    icon: "👁️",
    colorClass: "text-zinc-300 border-zinc-500/40 bg-zinc-900/80",
    summary: "Fallisce prove basate sulla vista; attacchi contro hanno vantaggio, i suoi attacchi hanno svantaggio.",
  },
  affascinato: {
    icon: "✨",
    colorClass: "text-pink-300 border-pink-500/40 bg-pink-950/60",
    summary: "Non può attaccare chi l'ha affascinato; l'ammaliatore ha vantaggio alle prove sociali.",
  },
  afferrato: {
    icon: "✊",
    colorClass: "text-amber-300 border-amber-500/40 bg-amber-950/60",
    summary: "Velocità ridotta a 0. Termina se il lottatore è incapacitato o la creatura viene allontanata.",
  },
  assordato: {
    icon: "👂",
    colorClass: "text-zinc-300 border-zinc-500/40 bg-zinc-900/80",
    summary: "Non sente e fallisce automaticamente qualsiasi prova basata sull'udito.",
  },
  avvelenato: {
    icon: "🧪",
    colorClass: "text-emerald-300 border-emerald-500/40 bg-emerald-950/60",
    summary: "Svantaggio ai tiri per colpire e alle prove di caratteristica.",
  },
  incapacitato: {
    icon: "⚡",
    colorClass: "text-purple-300 border-purple-500/40 bg-purple-950/60",
    summary: "Non può effettuare azioni o reazioni. Interrompe la concentrazione.",
    breaksConcentration: true,
  },
  indebolimento: {
    icon: "⏳",
    colorClass: "text-amber-400 border-amber-600/40 bg-amber-950/60",
    summary: "Misurato in 6 livelli cumulativi (da svantaggio alle prove fino alla morte al 6° livello).",
  },
  invisibile: {
    icon: "👻",
    colorClass: "text-sky-300 border-sky-500/40 bg-sky-950/60",
    summary: "Impossibile da vedere senza magia; i suoi attacchi hanno vantaggio, gli attacchi contro hanno svantaggio.",
  },
  paralizzato: {
    icon: "❄️",
    colorClass: "text-cyan-300 border-cyan-500/40 bg-cyan-950/60",
    summary: "Incapacitato, non si muove/parla, fallisce TS FOR/DES, attacchi contro hanno vantaggio (critico entro 1,5m).",
    breaksConcentration: true,
  },
  pietrificato: {
    icon: "🗿",
    colorClass: "text-stone-300 border-stone-500/40 bg-stone-900/80",
    summary: "Incapacitato, trasformato in pietra, resistenza a tutti i danni, fallisce TS FOR/DES.",
    breaksConcentration: true,
  },
  "privo-di-sensi": {
    icon: "💤",
    colorClass: "text-indigo-300 border-indigo-500/40 bg-indigo-950/60",
    summary: "Incapacitato, cade prono, lascia ciò che impugna, fallisce TS FOR/DES, critico automatico entro 1,5m.",
    breaksConcentration: true,
  },
  prono: {
    icon: "⬇️",
    colorClass: "text-orange-300 border-orange-500/40 bg-orange-950/60",
    summary: "Si muove solo strisciando; svantaggio ai suoi attacchi; attacchi contro hanno vantaggio entro 1,5m (altrimenti svantaggio).",
  },
  spaventato: {
    icon: "😱",
    colorClass: "text-rose-300 border-rose-500/40 bg-rose-950/60",
    summary: "Svantaggio a prove e attacchi finché vede la fonte della paura; non può avvicinarsi volontariamente.",
  },
  stordito: {
    icon: "💫",
    colorClass: "text-yellow-300 border-yellow-500/40 bg-yellow-950/60",
    summary: "Incapacitato, non può muoversi, parla a fatica, fallisce TS FOR/DES, attacchi contro hanno vantaggio.",
    breaksConcentration: true,
  },
  trattenuto: {
    icon: "⛓️",
    colorClass: "text-stone-300 border-stone-500/40 bg-stone-900/80",
    summary: "Velocità 0, attacchi contro hanno vantaggio, suoi attacchi con svantaggio, svantaggio ai TS su Destrezza.",
  },
};

export const EXTRA_COMBAT_STATUSES: readonly CombatStatusDefinition[] = [
  // Condizioni / Debuff Magici
  {
    id: "anatema",
    label: "Anatema",
    category: "condition",
    icon: "🩸",
    colorClass: "text-rose-300 border-rose-500/40 bg-rose-950/60",
    summary: "Sottrae 1d4 dai tiri per colpire e dai tiri salvezza effettuati prima del termine dell'incantesimo.",
    requiresConcentration: true,
    defaultDurationTurns: 10,
    defaultTickOn: "turn_end",
  },
  {
    id: "lentezza",
    label: "Lentezza",
    category: "condition",
    icon: "🐢",
    colorClass: "text-rose-300 border-rose-500/40 bg-rose-950/60",
    summary: "Velocità dimezzata, -2 alla CA e ai TS su DES, niente reazioni, solo un'azione o un'azione bonus per turno.",
    requiresConcentration: true,
    defaultDurationTurns: 10,
    defaultTickOn: "turn_end",
    acModifierFlat: -2,
  },
  {
    id: "luminescenza",
    label: "Luminescenza",
    category: "condition",
    icon: "🌟",
    colorClass: "text-rose-300 border-rose-500/40 bg-rose-950/60",
    summary: "I tiri per colpire contro la creatura dispongono di vantaggio e la creatura non può beneficiare dell'invisibilità.",
    requiresConcentration: true,
    defaultDurationTurns: 10,
    defaultTickOn: "turn_end",
  },
  {
    id: "sortilegio",
    label: "Sortilegio",
    category: "condition",
    icon: "🔮",
    colorClass: "text-rose-300 border-rose-500/40 bg-rose-950/60",
    summary: "Subisce 1d6 danni necrotici extra dagli attacchi dell'incantatore e svantaggio alle prove di una caratteristica scelta.",
    requiresConcentration: true,
    defaultDurationTurns: 10,
    defaultTickOn: "turn_end",
  },
  {
    id: "marchio-del-cacciatore",
    label: "Marchio del Cacciatore",
    category: "condition",
    icon: "🎯",
    colorClass: "text-rose-300 border-rose-500/40 bg-rose-950/60",
    summary: "Subisce 1d6 danni extra dagli attacchi con arma del ranger; vantaggio alle prove di Percezione/Sopravvivenza per trovarlo.",
    requiresConcentration: true,
    defaultDurationTurns: 10,
    defaultTickOn: "turn_end",
  },

  // Buff Benefici
  {
    id: "benedizione",
    label: "Benedizione",
    category: "buff",
    icon: "🙏",
    colorClass: "text-emerald-300 border-emerald-500/40 bg-emerald-950/60",
    summary: "Aggiunge +1d4 ai tiri per colpire e ai tiri salvezza.",
    requiresConcentration: true,
    defaultDurationTurns: 10,
    defaultTickOn: "turn_end",
  },
  {
    id: "ispirazione-bardica",
    label: "Ispirazione Bardica",
    category: "buff",
    icon: "🎵",
    colorClass: "text-emerald-300 border-emerald-500/40 bg-emerald-950/60",
    summary: "Può aggiungere 1 dado di Ispirazione Bardica a una prova di caratteristica, tiro per colpire o tiro salvezza.",
    requiresConcentration: false,
    defaultDurationTurns: 10,
    defaultTickOn: "turn_end",
    isSingleUse: true,
  },
  {
    id: "guida",
    label: "Guida",
    category: "buff",
    icon: "🧭",
    colorClass: "text-emerald-300 border-emerald-500/40 bg-emerald-950/60",
    summary: "Aggiunge +1d4 a una prova di caratteristica a sua scelta prima del termine dell'incantesimo.",
    requiresConcentration: true,
    defaultDurationTurns: 10,
    defaultTickOn: "turn_end",
    isSingleUse: true,
  },
  {
    id: "scudo-della-fede",
    label: "Scudo della Fede",
    category: "buff",
    icon: "🛡️",
    colorClass: "text-emerald-300 border-emerald-500/40 bg-emerald-950/60",
    summary: "Un campo scintillante circonda la creatura conferendole un bonus di +2 alla CA.",
    requiresConcentration: true,
    defaultDurationTurns: 10,
    defaultTickOn: "turn_end",
    acModifierFlat: 2,
  },
  {
    id: "velocita",
    label: "Velocità",
    category: "buff",
    icon: "⚡",
    colorClass: "text-emerald-300 border-emerald-500/40 bg-emerald-950/60",
    summary: "Velocità raddoppiata, +2 alla CA, vantaggio ai TS su DES e un'azione aggiuntiva (1 attacco, Scatto, Disimpegno, Nascondersi, Oggetto).",
    requiresConcentration: true,
    defaultDurationTurns: 10,
    defaultTickOn: "turn_end",
    acModifierFlat: 2,
  },
  {
    id: "ira",
    label: "Ira",
    category: "buff",
    icon: "💢",
    colorClass: "text-emerald-300 border-emerald-500/40 bg-emerald-950/60",
    summary: "Vantaggio a prove e TS su FOR, bonus ai danni in mischia su FOR, resistenza ai danni contundenti, perforanti e taglienti.",
    requiresConcentration: false,
    defaultDurationTurns: 10,
    defaultTickOn: "turn_end",
  },
  {
    id: "eroismo",
    label: "Eroismo",
    category: "buff",
    icon: "🦁",
    colorClass: "text-emerald-300 border-emerald-500/40 bg-emerald-950/60",
    summary: "Immune alla condizione spaventato e ottiene PF temporanei pari al modificatore di incantamento all'inizio di ogni suo turno.",
    requiresConcentration: true,
    defaultDurationTurns: 10,
    defaultTickOn: "turn_start",
  },
  {
    id: "aiuto",
    label: "Aiuto",
    category: "buff",
    icon: "❤️‍🩹",
    colorClass: "text-emerald-300 border-emerald-500/40 bg-emerald-950/60",
    summary: "I punti ferita massimi e attuali del bersaglio aumentano di 5 (o più con slot superiori) per la durata dell'incantesimo.",
    requiresConcentration: false,
    defaultDurationTurns: null,
    defaultTickOn: "turn_end",
    isSingleUse: true,
  },
  {
    id: "santuario",
    label: "Santuario",
    category: "buff",
    icon: "🕊️",
    colorClass: "text-emerald-300 border-emerald-500/40 bg-emerald-950/60",
    summary: "Chiunque tenti di attaccare o bersagliare la creatura con un incantesimo dannoso deve prima superare un TS su Saggezza.",
    requiresConcentration: false,
    defaultDurationTurns: 10,
    defaultTickOn: "turn_end",
  },
  {
    id: "scudo",
    label: "Scudo (+5 CA)",
    category: "buff",
    icon: "💠",
    colorClass: "text-emerald-300 border-emerald-500/40 bg-emerald-950/60",
    summary: "+5 alla CA (incluso contro l'attacco innescante) e nessun danno da Dardo Incantato fino all'inizio del suo prossimo turno.",
    requiresConcentration: false,
    defaultDurationTurns: 1,
    defaultTickOn: "turn_start",
    acModifierFlat: 5,
  },
  {
    id: "favore-divino",
    label: "Favore Divino",
    category: "buff",
    icon: "⚔️",
    colorClass: "text-emerald-300 border-emerald-500/40 bg-emerald-950/60",
    summary: "Gli attacchi con arma infliggono 1d4 danni radiosi extra.",
    requiresConcentration: true,
    defaultDurationTurns: 10,
    defaultTickOn: "turn_end",
  },
  {
    id: "volare",
    label: "Volare",
    category: "buff",
    icon: "🪽",
    colorClass: "text-emerald-300 border-emerald-500/40 bg-emerald-950/60",
    summary: "Il bersaglio ottiene una velocità di volare di 18 metri per la durata dell'incantesimo.",
    requiresConcentration: true,
    defaultDurationTurns: 10,
    defaultTickOn: "turn_end",
  },
  {
    id: "immagine-speculare",
    label: "Immagine Speculare",
    category: "buff",
    icon: "👥",
    colorClass: "text-emerald-300 border-emerald-500/40 bg-emerald-950/60",
    summary: "Tre duplicati illusori deviano gli attacchi diretti all'incantatore finché non vengono distrutti.",
    requiresConcentration: false,
    defaultDurationTurns: 10,
    defaultTickOn: "turn_end",
  },
  {
    id: "armatura-magica",
    label: "Armatura Magica",
    category: "buff",
    icon: "🧥",
    colorClass: "text-emerald-300 border-emerald-500/40 bg-emerald-950/60",
    summary: "Formula CA base = 13 + modificatore di Destrezza (solo se la creatura non indossa armature; non cumulabile con calcolo CA armatura).",
    requiresConcentration: false,
    defaultDurationTurns: null,
    defaultTickOn: "turn_end",
    acFormulaHint: "CA base 13 + DES (senza armatura)",
  },

  // Stati Tattici
  {
    id: "schivata",
    label: "Schivata",
    category: "tactical",
    icon: "💨",
    colorClass: "text-sky-300 border-sky-500/40 bg-sky-950/60",
    summary: "Fino all'inizio del suo prossimo turno, gli attacchi contro la creatura hanno svantaggio (se vede l'attaccante) e ha vantaggio ai TS su DES.",
    requiresConcentration: false,
    defaultDurationTurns: 1,
    defaultTickOn: "turn_start",
  },
  {
    id: "disimpegno",
    label: "Disimpegno",
    category: "tactical",
    icon: "🦶",
    colorClass: "text-sky-300 border-sky-500/40 bg-sky-950/60",
    summary: "Il movimento della creatura non provoca attacchi di opportunità per il resto del turno.",
    requiresConcentration: false,
    defaultDurationTurns: 1,
    defaultTickOn: "turn_end",
  },
  {
    id: "copertura-mezza",
    label: "Copertura Mezza (+2 CA)",
    category: "tactical",
    icon: "🧱",
    colorClass: "text-sky-300 border-sky-500/40 bg-sky-950/60",
    summary: "Bonus di +2 alla CA e ai tiri salvezza su Destrezza (non si somma con copertura a tre quarti).",
    requiresConcentration: false,
    defaultDurationTurns: null,
    defaultTickOn: "turn_end",
    coverBonus: 2,
  },
  {
    id: "copertura-tre-quarti",
    label: "Copertura Tre Quarti (+5 CA)",
    category: "tactical",
    icon: "🏰",
    colorClass: "text-sky-300 border-sky-500/40 bg-sky-950/60",
    summary: "Bonus di +5 alla CA e ai tiri salvezza su Destrezza (sostituisce la mezza copertura).",
    requiresConcentration: false,
    defaultDurationTurns: null,
    defaultTickOn: "turn_end",
    coverBonus: 5,
  },
] as const;

export const COMBAT_STATUS_CATALOG: readonly CombatStatusDefinition[] = [
  ...COMBAT_CONDITIONS.map((c): CombatStatusDefinition => {
    const meta = CANONICAL_ICONS_META[c.id];
    return {
      id: c.id,
      label: c.label,
      category: "condition",
      icon: meta.icon,
      colorClass: meta.colorClass,
      summary: meta.summary,
      paragraphs: c.paragraphs,
      page: c.page,
      breaksConcentration: meta.breaksConcentration,
    };
  }),
  ...EXTRA_COMBAT_STATUSES,
];

const STATUS_DEFINITION_MAP = new Map<string, CombatStatusDefinition>(
  COMBAT_STATUS_CATALOG.map((def) => [def.id, def])
);

export function getCombatStatusDefinition(statusId: string): CombatStatusDefinition | undefined {
  const normalized = statusId === "privo_di_sensi" ? "privo-di-sensi" : statusId;
  return STATUS_DEFINITION_MAP.get(normalized);
}

export function doesStatusBreakConcentration(statusId: string): boolean {
  const def = getCombatStatusDefinition(statusId);
  return Boolean(def?.breaksConcentration);
}

export function isSingleUseStatus(statusId: string): boolean {
  const def = getCombatStatusDefinition(statusId);
  return Boolean(
    def?.isSingleUse ||
      statusId === "ispirazione-bardica" ||
      statusId === "guida" ||
      statusId === "aiuto"
  );
}

export function slugifyCustomStatus(label: string): string {
  const clean = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9àèéìòù_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `custom:${clean || "stato"}`;
}


