import type { PrintFeature } from './manual-feature-text';

/**
 * Transcribed from the reference sheet Mago 5e, p. 1.
 * Standard core class features on the right column.
 */
export function wizardReferenceCards(level: number): PrintFeature[] {
  const source = 'Scheda Mago 5e / pagina 1';

  const cards: Array<[string, number, string]> = [
    [
      'Recupero Arcano',
      1,
      'Una volta al giorno, quando completi un riposo breve, puoi scegliere quali slot incantesimo recuperare. ' +
        'Questi slot possono avere un livello totale pari o inferiore alla metà del tuo livello da mago (arrotondato per eccesso) ' +
        'e nessuno slot può essere di 6° livello o superiore.',
    ],
    [
      'Maestria negli Incantesimi',
      18,
      'Scegli un incantesimo da mago di 1° livello e uno di 2° livello contenuti nel tuo libro degli incantesimi. ' +
        'Puoi lanciare quegli incantesimi al loro livello più basso senza spendere uno slot incantesimo quando li hai preparati. ' +
        'Dedicando 8 ore allo studio puoi sostituire uno o entrambi gli incantesimi scelti.',
    ],
    [
      'Incantesimi Personali',
      20,
      'Scegli due incantesimi da mago di 3° livello contenuti nel tuo libro degli incantesimi come incantesimi personali. ' +
        'Sono sempre preparati e non contano nel limite degli incantesimi preparati. ' +
        'Puoi lanciare ciascuno di essi una volta al 3° livello senza spendere uno slot; recuperi questo uso dopo un riposo breve o lungo.',
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
