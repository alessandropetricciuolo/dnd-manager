import type { PrintFeature } from './manual-feature-text';
import type { PhbFightingStyle } from './class-choice-catalog';

export const FIGHTING_STYLE_DESCRIPTIONS: Record<PhbFightingStyle, string> = {
  'Combattere con Armi Possenti':
    'Quando ottieni un 1 o un 2 a un tiro per i danni di un attacco che hai effettuato con un’arma da mischia impugnata a due mani, puoi ripetere il tiro e devi usare il nuovo risultato. L’arma deve possedere la proprietà a due mani o versatile.',
  'Combattere con Due Armi':
    'Quando combatti con due armi, puoi aggiungere il tuo modificatore di caratteristica ai danni del secondo attacco.',
  'Difesa': 'Finché indossi un’armatura, ottieni un bonus di +1 alla CA.',
  'Duellare':
    'Quando impugni un’arma da mischia in una mano e non impugni altre armi, ottieni un bonus di +2 ai tiri per i danni di quell’arma.',
  'Protezione':
    'Quando una creatura visibile attacca un bersaglio diverso da te entro 1,5 metri, puoi usare la tua reazione per imporre svantaggio al tiro per colpire. Devi impugnare uno scudo.',
  'Tiro': 'Ottieni un bonus di +2 ai tiri per colpire che effettui con le armi a distanza.',
};

/**
 * Transcribed from the reference sheet Guerriero 5e, p. 1.
 * Standard core class features on the right column.
 */
export function fighterReferenceCards(
  level: number,
  style?: PhbFightingStyle,
  secondStyle?: PhbFightingStyle
): PrintFeature[] {
  const source = 'Scheda Guerriero 5e / pagina 1';
  const styleText = style
    ? `${style}: ${FIGHTING_STYLE_DESCRIPTIONS[style] ?? ''}${
        level >= 10 && secondStyle
          ? `\n\nSecondo stile (${secondStyle}): ${FIGHTING_STYLE_DESCRIPTIONS[secondStyle] ?? ''}`
          : ''
      }`
    : 'Adotti una particolare specializzazione nel tuo stile di combattimento.';

  const cards: Array<[string, number, string]> = [
    ['Stile di Combattimento', 1, styleText],
    [
      'Recuperare Energie',
      1,
      'Una volta ogni riposo breve o lungo, puoi usare un’azione bonus per recuperare un numero di punti ferita pari a 1d10 + il tuo livello da guerriero.',
    ],
    [
      'Azione Impetuosa',
      2,
      'Una volta ogni riposo breve o lungo, puoi effettuare un’azione oltre alla tua normale azione e alla tua possibile azione bonus.' +
        (level >= 17 ? '\n\nPuoi usare questo privilegio 2 volte prima del riposo, ma solo una volta per turno.' : ''),
    ],
    [
      'Attacco Extra',
      5,
      'Ogni volta che effettui l’azione di attacco, puoi eseguire un secondo attacco. Puoi spostarti tra un attacco e l’altro. Gli attacchi con armi secondarie non beneficiano di questo privilegio.' +
        (level >= 11 ? '\n\nPuoi fare 3 attacchi.' : '') +
        (level >= 20 ? '\n\nPuoi fare 4 attacchi.' : ''),
    ],
    [
      'Indomito',
      9,
      'Quando fallisci un tiro salvezza puoi ripetere il tiro. Puoi usare questo privilegio una volta ogni riposo lungo.' +
        (level >= 13 ? '\n\n2 volte ogni riposo.' : '') +
        (level >= 17 ? '\n\n3 volte ogni riposo.' : ''),
    ],
  ];

  return cards
    .filter(([, unlock]) => unlock <= level)
    .map(([title, unlock, body]) => ({ title, level: unlock, body, source }));
}
