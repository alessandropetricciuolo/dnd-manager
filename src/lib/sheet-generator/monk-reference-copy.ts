import type { PrintFeature } from './manual-feature-text';

/**
 * Transcribed from the reference sheet Monaco 5e, p. 1.
 * Standard core class features on the right column.
 */
export function monkReferenceCards(level: number): PrintFeature[] {
  const source = 'Scheda Monaco 5e / pagina 1';

  const cards: Array<[string, number, string]> = [
    [
      'Caduta Lenta',
      4,
      'Puoi usare la tua reazione quando cadi per ridurre i danni da caduta fino a 5 volte il tuo livello da monaco.',
    ],
    [
      'Attacco Extra',
      5,
      'Quando effettui l’azione di Attacco nel tuo turno, puoi attaccare 2 volte anziché una.',
    ],
    [
      'Colpo Stordente',
      5,
      'Quando colpisci una creatura con un attacco con un’arma da mischia, puoi spendere 1 punto Ki: ' +
        'il bersaglio deve superare un tiro salvezza su Costituzione o rimanere stordito fino alla fine del tuo prossimo turno.',
    ],
    [
      'Colpi Ki Potenziati',
      6,
      'I tuoi colpi senz’armi sono considerati magici ai fini di oltrepassare resistenza e immunità ad attacchi non magici.',
    ],
    [
      'Elusione',
      7,
      'Quando effettui un tiro salvezza su Destrezza per dimezzare i danni, se superi il tiro non subisci alcun danno, ' +
        'se fallisci subisci solo la metà dei danni.',
    ],
    [
      'Mente Lucida',
      7,
      'Puoi usare la tua azione per porre termine a un effetto su te stesso che ti rende affascinato o spaventato.',
    ],
    [
      'Purezza del Corpo',
      10,
      'La tua padronanza del ki ti rende immune alle malattie e ai veleni.',
    ],
    [
      'Lingua del Sole e della Luna',
      13,
      'Comprendi tutti i linguaggi parlati e qualsiasi creatura in grado di capire un linguaggio comprende le tue parole.',
    ],
    [
      'Anima Adamantina',
      14,
      'Ottieni competenza in tutti i tiri salvezza. Inoltre, quando fallisci un tiro salvezza, puoi spendere 1 punto Ki per ripeterlo.',
    ],
    [
      'Corpo Senza Tempo',
      15,
      'Non subisci gli effetti della vecchiaia, non puoi invecchiare magicamente e non hai bisogno di cibo o acqua. Puoi sempre morire di vecchiaia.',
    ],
    [
      'Corpo Vuoto',
      18,
      'Con un’azione e 4 punti Ki diventi invisibile per 1 minuto (resistenza a tutti i danni tranne forza). ' +
        'Con 8 punti Ki lanci Proiezione Astrale per te stesso senza componenti materiali.',
    ],
    [
      'Perfezione Interiore',
      20,
      'Quando tiri per l’Iniziativa e non ti rimane alcun punto Ki, recuperi 4 punti Ki.',
    ],
  ];

  return cards
    .filter(([, unlock]) => unlock <= level)
    .map(([title, lvl, body]) => ({
      title,
      level: lvl,
      body,
      source,
    }));
}
