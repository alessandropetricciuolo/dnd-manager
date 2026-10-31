import type { PrintFeature } from './manual-feature-text';
/** Transcribed from Barbaro 5e v14.pdf p.1. Rage's armor/termination clauses corrected from PHB by user approval. */
export function barbarianReferenceCards(level:number):PrintFeature[]{
  const source='Scheda Barbaro 5e v14 / pagina 1';
  const cards:Array<[string,number,string]>=[
    ['Ira',1,"Puoi entrare in ira come azione bonus. Finché sei in ira, se non indossi un’armatura pesante, guadagni i seguenti benefici:\n- Hai vantaggio sulle prove e i tiri salvezza basati sulla Forza;\n- Quando effettui un attacco con un’arma da mischia usando il bonus di Forza, aggiungi danni pari all’ammontare al bonus dei danni da Ira;\n- Guadagni Resistenza ai danni Contundenti, Taglienti e Perforanti;\nNon puoi lanciare Incantesimi o Concentrarti durante l’Ira. L’Ira dura 1 minuto. Finisce prima se diventi Incosciente o se finisci il tuo turno senza aver attaccato una creatura ostile dal tuo ultimo turno e senza aver subito danni da allora. Puoi finire la tua Ira con un’azione Bonus."],
    ['Difesa Senz’Armatura',1,'Finché non indossi armature la tua CA è pari a 10 + modificatore di Destrezza + modificatore di Costituzione. Puoi usare uno scudo.'],
    ['Attacco Irruento',2,'Prima di effettuare il tuo primo attacco puoi decidere di ottenere vantaggio a tutti i tiri per colpire in mischia basati su Forza in questo turno. Se lo fai, fino al tuo prossimo turno tutti i tiri per colpire contro di te avranno Vantaggio.'],
    ['Senso del Pericolo',2,'Hai vantaggio ai tiri salvezza su Destrezza contro effetti che puoi vedere, come Trappole o Magie. Per usare questo beneficio, non puoi essere Accecato, Assordato o Incapacitato.'],
    ['Attacco Extra',5,'Se effettui l’azione di attacco, puoi attaccare 2 volte.'],
    ['Movimento Veloce',5,'Se non indossi armature pesanti, la tua velocità aumenta di 3 metri.'],
    ['Istinto Ferino',7,'Hai vantaggio alle prove di Iniziative. Se vieni sorpreso ma non sei Incapacitato puoi agire normalmente, ma solo se entri in Ira prima di ogni altra azione.'],
    ['Critico Brutale',9,'Quando effettui un colpo critico con un attacco in mischia puoi aggiungere un dado extra dell’arma ai danni.'+(level>=13?'\n\nAggiungi 2 dadi.':'')+(level>=17?'\n\nAggiungi 3 dadi.':'')],
    ['Ira Implacabile',11,'Quando sei in Ira e vai a 0 Punti Ferita, puoi effettuare un tiro salvezza su Costituzione con CD 10. Se non muori sul colpo e il tiro è superato, rimani invece a 1 PF. La CD aumenta di 5 ad ogni utilizzo di questo beneficio e viene ripristinata quando completi un Riposo Breve o Lungo.'],
    ['Ira Persistente',15,'La tua Ira è così feroce che termina prematuramente solo se lo vuoi o se cadi Privo di Sensi.'],
    ['Potenza Indomabile',18,'Se il totale di una prova di Forza è inferiore al tuo Punteggio di Forza, puoi sostituire il tuo punteggio al risultato.'],
    ['Campione Primordiale',20,'Aggiungi 4 punti ai tuoi Punteggi di Forza e Costituzione. Il massimo dei tuoi Punteggi in quelle caratteristiche è 24.'],
  ];
  if(level>=15)cards[0][2]=cards[0][2].replace(' o se finisci il tuo turno senza aver attaccato una creatura ostile dal tuo ultimo turno e senza aver subito danni da allora','');
  return cards.filter(([,unlock])=>unlock<=level).map(([title,unlock,body])=>({title,level:unlock,body,source}));
}
