import type { PrintFeature } from './manual-feature-text';

/**
 * Transcribed from the reference sheet Paladino 5e, p. 1.
 * Standard core class features on the right column.
 */
export function paladinReferenceCards(level: number): PrintFeature[] {
  const source = 'Scheda Paladino 5e / pagina 1';

  const cards: Array<[string, number, string]> = [
    [
      'Stile di Combattimento',
      2,
      'Adotti un particolare stile di combattimento in cui specializzarti scegliendo tra Combattere con Armi Possenti, Difesa, Duellare o Protezione.',
    ],
    [
      'Punizione Divina',
      2,
      'Quando colpisci con un’arma da mischia puoi spendere uno slot incantesimo per infliggere danni radiosi extra. ' +
        'Il 1° livello offre +2d8 ai danni e aumenta di 1d8 ogni slot fino a 5d8 di danno. I non morti e gli immondi subiscono 1d8 di danno extra.',
    ],
    [
      'Salute Divina',
      3,
      'Sei immune alle malattie grazie alla magia divina.',
    ],
    [
      'Attacco Extra',
      5,
      'Quando effettui l’azione di Attacco nel tuo turno, puoi attaccare 2 volte anziché una.',
    ],
    [
      'Aura di Protezione',
      6,
      'Quando sei cosciente e devi effettuare un tiro salvezza, ottieni un bonus pari al tuo modificatore di Carisma (minimo +1). ' +
        'Anche le creature tue amiche entro 3m da te godono del bonus. Al 18° livello il raggio dell’aura aumenta a 9m.',
    ],
    [
      'Aura di Coraggio',
      10,
      'Finché sei cosciente tu e le creature tue amiche entro 3m non potete essere spaventati. Al 18° livello il raggio dell’aura aumenta a 9m.',
    ],
    [
      'Punizione Divina Migliorata',
      11,
      'Ogni volta che colpisci con un’arma da mischia infliggi 1d8 danni radiosi extra. Non contano per i danni da Punizione Divina.',
    ],
    [
      'Tocco Purificatore',
      14,
      'Puoi toccare te stesso o una creatura consenziente con un’azione per porre fine all’effetto di un incantesimo. ' +
        'Puoi usare questa capacità un numero di volte pari al tuo modificatore di Carisma (minimo 1). Si ricarica con un riposo lungo.',
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
