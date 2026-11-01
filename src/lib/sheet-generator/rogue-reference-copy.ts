import type { PrintFeature } from './manual-feature-text';

/**
 * Transcribed from the reference sheet Ladro 5e, p. 1.
 * Standard core class features on the right and center columns.
 */
export function rogueReferenceCards(level: number): PrintFeature[] {
  const source = 'Scheda Ladro 5e / pagina 1';

  const cards: Array<[string, number, string]> = [
    [
      'Maestria',
      1,
      'Puoi scegliere competenza in 2 abilità oppure in un’abilità e gli arnesi da scasso. Ogni volta che effettui una prova di abilità nelle competenze scelte, raddoppi il bonus di competenza.' +
        (level >= 6 ? '\n\nAl 6° livello puoi scegliere altre due competenze con questo beneficio.' : ''),
    ],
    [
      'Azione Scaltra',
      2,
      'In ogni tuo turno puoi effettuare un’azione di Disimpegno, Nascondersi o Scatto come un’azione bonus.',
    ],
    [
      'Schivata Prodigiosa',
      5,
      'Quando vieni colpito da un attacco che puoi vedere, puoi usare la tua reazione per dimezzare i danni.',
    ],
    [
      'Elusione',
      7,
      'Quando effettui un tiro salvezza su Destrezza per dimezzare i danni, se superi il tiro non subisci alcun danno, se fallisci li dimezzi comunque.',
    ],
    [
      'Dote Affidabile',
      11,
      'Quando tiri 1d20 per effettuare una prova di abilità in cui sei competente, puoi considerare come un 10 i risultati sotto il 9.',
    ],
    [
      'Percezione Cieca',
      14,
      'Se puoi sentire, conosci l’ubicazione di tutte le creature invisibili o nascoste entro 3 metri da te.',
    ],
    [
      'Mente Sfuggente',
      15,
      'Ottieni competenza in tutti i tiri salvezza su Saggezza.',
    ],
    [
      'Inafferrabile',
      18,
      'Se non sei incapacitato, nessun tiro per colpire contro di te può disporre di vantaggio.',
    ],
    [
      'Colpo di Fortuna',
      20,
      'Una volta ogni riposo breve o lungo puoi trasformare un attacco fallito in un successo. In alternativa puoi trasformare il risultato di una prova di caratteristica fallita come un 20.',
    ],
  ];

  return cards
    .filter(([, unlock]) => unlock <= level)
    .map(([title, unlock, body]) => ({ title, level: unlock, body, source }));
}

export const ROGUE_SNEAK_ATTACK_RULE =
  'Una volta per turno puoi aggiungere i danni da Attacco Furtivo al tuo attacco. Puoi usare il beneficio solo se equipaggi un’arma accurata o a distanza e devi avere vantaggio al tiro per colpire. Se un altro nemico del bersaglio si trova a 1,5 metri da lui e non è incapacitato, non hai bisogno di avere vantaggio. Se i tuoi tiri hanno svantaggio non puoi usare questo privilegio.';

export const ROGUE_THIEVES_CANT_RULE =
  'Utilizzando gesti, dialetti e parole in codice puoi inserire un messaggio nascosto in un discorso. Per inserire il messaggio serve 4 volte il tempo che servirebbe normalmente per esprimere il concetto direttamente. Le altre persone devono conoscere il gergo. Inoltre puoi capire simboli, segnali o altro che indichino bottini, pericoli o personaggi che possono aiutarti lasciati da altri ladri.';
