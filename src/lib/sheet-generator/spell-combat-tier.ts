/**
 * Punteggi di forza "orientamento combattimento" per la selezione incantesimi in modalità
 * power player. È una sintesi approssimativa (non PHB ufficiale): nomi in italiano come nelle
 * liste del manuale; tier ispirati a consenso comunitario (tavoli ottimizzazione, discussioni su
 * incantesimi da prendere sempre / quasi sempre). Gli incantesimi non in mappa hanno priorità più
 * bassa ma restano selezionabili se servono a riempire gli slot.
 */

export function normalizeSpellNameForTier(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

const BANDS: Array<{ score: number; names: readonly string[] }> = [
  {
    score: 100,
    names: [
      "Scudo",
      "Controincantesimo",
      "Dissolvi Magie",
      "Palla di Fuoco",
      "Deflagrazione Occulta",
      "Guardiani Spirituali",
      "Cerchio Magico",
      "Velocità",
      "Muro di Forza",
      "Mano di Bigby",
      "Trama Ipnotica",
      "Parola del Potere Uccidere",
      "Parola del Potere Stordire",
      "Fermare il Tempo",
      "Dito della Morte",
      "Parola del Potere Guarire",
      "Desiderio",
    ],
  },
  {
    score: 96,
    names: [
      "Metamorfosi",
      "Banimento",
      "Libertà di Movimento",
      "Morte Apparente",
      "Invisibilità Superiore",
      "Santificare",
      "Piaga degli Insetti",
      "Esilio",
      "Controllare Persone",
      "Dominare Bestia",
      "Dominare Persone",
      "Dominare Mostri",
      "Banchetto degli Eroi",
      "Lentezza",
      "Folgore",
      "Fulmine",
      "Luce Diurna",
      "Antipatia/Simpatia",
      "Veggenza",
      "Simulacro",
    ],
  },
  {
    score: 92,
    names: [
      "Inviare",
      "Faro di Speranza",
      "Preghiera di Guarigione",
      "Animare Morti",
      "Globo di Invulnerabilità",
      "Sfera Elastica",
      "Teletrasporto",
      "Cacciare Memorie",
      "Resurrezione",
      "Parola del Ritiro",
      "Onda Sinistra di Abi-Dalzim",
      "Gabbia di Forza",
      "Forma Eterea",
      "Buco Portatile",
      "Portale Dimensionale",
      "Scrutare",
      "Contagio",
      "Parola Guaritrice di Massa",
      "Ristorare Superiore",
      "Legame Planare",
    ],
  },
  {
    score: 88,
    names: [
      "Sonno",
      "Armatura Magica",
      "Benedizione",
      "Scudo della Fede",
      "Arma Spirituale",
      "Fiamma Sacra",
      "Dardo Tracciante",
      "Dardo di Fuoco",
      "Fuoco Fatato",
      "Silenzio",
      "Tenebre",
      "Oscurità",
      "Blocca Persone",
      "Passo Velato",
      "Suggestione",
      "Immagine Speculare",
      "Nube Maleodorante",
      "Paura",
      "Volare",
      "Forma Gassosa",
      "Confusione",
      "Lingua del Sole e della Luna",
      "Guardiano della Fede",
      "Barriera Vitale",
      "Campo Antievocazione",
      "Campo Antimagia",
    ],
  },
  {
    score: 84,
    names: [
      "Nube di Pugnali",
      "Lama Infuocata",
      "Armatura di Agathys",
      "Braccia di Hadar",
      "Fame di Hadar",
      "Tocco del Vampiro",
      "Intimorire Infernale",
      "Mano della Strabordanza",
      "Freccia Acida di Melf",
      "Frantumare",
      "Alluvione",
      "Folata di Vento",
      "Raggio Rovente",
      "Sfera Infuocata",
      "Scassinare",
      "Invocare Fulmine",
      "Cono di Freddo",
      "Terra Strisciante",
      "Colpo Infuocato",
      "Gelo di Stallo",
      "Onda Tonante",
      "Arma Elementale",
      "Spiriti Curativi",
    ],
  },
  {
    score: 80,
    names: [
      "Parlare con i Morti",
      "Chiaroveggenza",
      "Individuazione del Magico",
      "Sfera di Cristallo",
      "Glifo di Interdizione",
      "Zona di Verità",
      "Anticipare",
      "Vincolo di Interdizione",
      "Cecità/Sordità",
      "Ragnatela",
      "Patata Bollente",
      "Corona di Follia",
      "Mente da Comandante",
      "Colpo Occulto",
      "Presagio",
      "Guida",
      "Anatema",
      "Infliggi Ferite",
      "Santuario",
    ],
  },
  {
    score: 72,
    names: [
      "Stretta Folgorante",
      "Interdizione alle Lame",
      "Tocco Gelido",
      "Fiotto Acido",
      "Spruzzo Velenoso",
      "Raggio di Gelo",
      "Resistenza",
      "Salvare i Morenti",
      "Cura Ferite",
      "Parola Guaritrice",
      "Allarme",
      "Trova Famiglio",
      "Servitore Inosservato",
      "Nube di Nebbia",
      "Passo Veloce",
      "Charme su Persone",
      "Mani Brucianti",
      "Dardo Incantato",
      "Dardo Stregato",
      "Comando",
      "Protezione dal Bene e dal Male",
      "Ritirata Rapida",
      "Levitazione",
      "Vita Falsata",
      "Immagine Maggiore",
      "Alterare Se Stesso",
      "Ingrandire/Ridurre",
      "Caratteristica Potenziata",
    ],
  },
];

function buildScoreMap(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const band of BANDS) {
    for (const n of band.names) {
      const k = normalizeSpellNameForTier(n);
      const prev = out[k];
      if (prev == null || band.score > prev) out[k] = band.score;
    }
  }
  return out;
}

const SCORES = buildScoreMap();

const DEFAULT_SCORE = 36;

/** Punteggio più alto = incantesimo preferito in modalità power player (combattimento / controllo). */
export function getSpellCombatTierScore(spellName: string): number {
  const key = normalizeSpellNameForTier(spellName);
  return SCORES[key] ?? DEFAULT_SCORE;
}
