import type { PrintFeature } from './manual-feature-text';
/** Reference: Chierico 5e v14 p.1. Missing restrictions/cooldown details completed from the PHB. */
export function clericReferenceCards(level:number,undeadCr:string|null):PrintFeature[]{
 const source='Scheda Chierico 5e v14 / pagina 1; condizioni complete: Manuale del Giocatore';
 const cards:Array<[string,number,string]>=[
  ['Incanalare Divinità: Scacciare Non Morti',2,'Puoi usare un’azione per brandire il tuo simbolo sacro e scacciare tutti i Non Morti che possono vederti o sentirti entro 9 metri dalla tua posizione. Se i Non Morti falliscono un tiro salvezza su Saggezza dovranno impiegare i loro turni per allontanarsi il più possibile da te. Possono solo eseguire l’azione di Scatto o tentare di liberarsi da effetti che li bloccano. Se non possono spostarsi gli è concesso usare Schivata. L’effetto dura 1 minuto o finché subiscono danni. Non possono effettuare reazioni né avvicinarsi volontariamente entro 9 metri da te.'],
  ['Distruggere Non Morti',5,`Quando un Non Morto fallisce un tiro salvezza contro la tua prova di Scacciare Non Morti, viene distrutto se il suo GS è pari o inferiore a una certa soglia.\n\nSoglia al tuo livello: GS ${undeadCr??'-'} o inferiore.`],
  ['Intervento Divino',10,'Puoi usare un’azione per chiedere aiuto alla tua divinità. Lancia un dado percentuale: se il risultato è pari o inferiore al tuo livello da Chierico, la divinità verrà in tuo soccorso. Il DM decide la natura dell’intervento. Se la divinità interviene devi attendere 7 giorni prima di riutilizzare il privilegio; altrimenti puoi riprovare dopo un riposo lungo.'+(level>=20?'\n\nLa tua richiesta ha automaticamente successo.':'')],
 ];return cards.filter(([,n])=>n<=level).map(([title,n,body])=>({title,level:n,body,source}));
}
