import type { PrintFeature } from './manual-feature-text';

/**
 * Transcribed from the reference sheet Paladino 5e, p. 1.
 * Standard core class features on the right column.
 */
const PALADIN_FIGHTING_STYLE_DESCRIPTIONS: Record<string, string> = {
  Difesa: 'Finché indossi un’armatura, ottieni un bonus di +1 alla Classe Armatura.',
  Duellare:
    'Quando impugni un’arma da mischia in una mano e nessun’altra arma, ottieni un bonus di +2 ai tiri per i danni con quell’arma.',
  'Combattere con Armi Possenti':
    'Quando ottieni 1 o 2 a un dado per i danni di un attacco effettuato con un’arma da mischia impugnata a due mani (con proprietà a due mani o versatile), puoi ritirare il dado e devi usare il nuovo risultato.',
  Protezione:
    'Quando una creatura che vedi attacca un bersaglio diverso da te entro 1,5 m da te, puoi usare la reazione (se impugni uno scudo) per imporre svantaggio al tiro per colpire.',
};

export function paladinReferenceCards(level: number, fightingStyle?: string): PrintFeature[] {
  const source = 'Scheda Paladino 5e / pagina 1';
  const auraRadius = level >= 18 ? '9 m' : '3 m';
  const styleText =
    fightingStyle && PALADIN_FIGHTING_STYLE_DESCRIPTIONS[fightingStyle]
      ? `${fightingStyle}: ${PALADIN_FIGHTING_STYLE_DESCRIPTIONS[fightingStyle]}`
      : 'Adotti uno stile di combattimento specializzato (Difesa, Duellare, Combattere con Armi Possenti o Protezione).';

  const cards: Array<[string, number, string]> = [
    ['Stile di Combattimento', 2, styleText],
    [
      'Punizione Divina',
      2,
      'Quando colpisci con un’arma da mischia puoi spendere uno slot incantesimo per infliggere danni radiosi extra: +2d8 con uno slot di 1° livello, più +1d8 per ogni livello di slot sopra il 1° (massimo 5d8). +1d8 extra contro non morti o immondi (massimo 6d8).',
    ],
    ['Salute Divina', 3, 'Sei immune alle malattie grazie alla magia divina.'],
    [
      'Attacco Extra',
      5,
      'Quando effettui l’azione di Attacco nel tuo turno, puoi attaccare 2 volte anziché una.',
    ],
    [
      'Aura di Protezione',
      6,
      `Quando sei cosciente e tu o una creatura amica entro ${auraRadius} da te dovete effettuare un tiro salvezza, ottenete un bonus pari al tuo modificatore di Carisma (minimo +1).`,
    ],
    [
      'Aura di Coraggio',
      10,
      `Finché sei cosciente, tu e le creature amiche entro ${auraRadius} da te non potete essere spaventati.`,
    ],
    [
      'Punizione Divina Migliorata',
      11,
      'Ogni volta che colpisci con un’arma da mischia infliggi 1d8 danni radiosi extra.',
    ],
    [
      'Tocco Purificatore',
      14,
      'Con un’azione tocchi te stesso o una creatura consenziente per porre fine a un incantesimo su di essa. Usi: modificatore di Carisma (minimo 1) per riposo lungo.',
    ],
  ];

  return cards
    .filter(([, unlock]) => unlock <= level)
    .map(([title, unlock, body]) => ({
      title,
      level: unlock,
      body,
      source,
    }));
}
