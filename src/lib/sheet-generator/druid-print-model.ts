import type { GeneratedCharacterSheet } from './types';
import type { PrintFeature } from './manual-feature-text';
import { druidCircleFromLabel, type DruidEvidence } from './druid-circles';

export function buildDruidPrintModel(original:GeneratedCharacterSheet,evidence:DruidEvidence){
 if(original.classLabel!=='Druido')throw new Error('Classe Druido richiesta.');
 const sheet=structuredClone(original),circle=druidCircleFromLabel(sheet.classSubclass);
 if(sheet.level>=2&&!circle)throw new Error('Circolo Druidico non selezionato o non catalogato.');
 if(sheet.level<2){sheet.classSubclass=null;sheet.subclassFeaturesMd=null;}
 const features=[...evidence.classFeatures,...evidence.circleFeatures].filter(f=>f.level<=sheet.level).map(f=>({...f}));
 if(!features.some(f=>f.title==='INCANTESIMI'))throw new Error('Incantesimi del Druido non risolti dai manuali.');
 sheet.spellcastingAbility='wis';sheet.spellcastingClass='Druido';sheet.spellAttackBonus=sheet.proficiencyBonus+sheet.abilityMods.wis;sheet.spellSaveDc=8+sheet.spellAttackBonus;
 sheet.spellSlots={...evidence.slots};sheet.cantripsKnown=Math.max(sheet.cantripsKnown,evidence.cantrips);sheet.spellsPrepared=Math.max(1,sheet.level+sheet.abilityMods.wis);
 return {sheet,features,circle,slots:evidence.slots,cantrips:evidence.cantrips};
}

export function druidReferenceCards(level:number,circleLabel:string|null):PrintFeature[]{
 const source='Scheda Druido 5e v14 / pagina 1';
  const moon=/circolo della luna/i.test(circleLabel??'');
 const maxCr=moon?(level>=6?Math.floor(level/3):1):level>=8?1:level>=4?0.5:0.25;
 const crLabel=maxCr===0.25?'1/4':maxCr===0.5?'1/2':String(maxCr);
 const movement=`Nuotare ${level>=4?'consentito':'non consentito'}; volare ${level>=8?'consentito':'non consentito'}`;
 const currentLimit=moon?`Circolo della Luna: GS massimo ${crLabel}, trasformazione con un’azione bonus. ${movement}.`:`GS massimo ${crLabel}; ${movement}.`;
 const cards:Array<[string,number,string]>=[
  ['Druidico',1,'Conosci la lingua segreta dei druidi. Puoi parlarla e usarla per lasciare messaggi nascosti. Chi conosce questa lingua può individuarli automaticamente; gli altri possono scoprirli con una prova di Saggezza (Percezione) con CD 15, ma non decifrarli senza magia.'],
  ['Forma Selvatica',2,`Puoi usarla ${level>=20?'senza limiti':'2 volte per riposo breve o lungo'}; dura al massimo ${Math.floor(level/2)} ore. Torni alla forma normale con un’azione bonus, se perdi i sensi, muori o scade la durata. Se scendi a 0 PF, torni alla forma normale e gli eventuali danni in eccesso si trasferiscono. Assumi solo forme di bestie che hai già visto, rispettando le restrizioni correnti: ${currentLimit} Prima del 18° livello non puoi lanciare incantesimi in forma bestiale. ${level>=18?'Dal 18° livello puoi lanciare incantesimi in forma bestiale secondo Incantesimi Bestiali.':''}`],
  ['Forma Selvatica Migliorata',4,'Dal 4° livello puoi assumere forme con velocità di nuoto. Dall’8° livello puoi assumere forme con velocità di volo. Restano valide le altre limitazioni della Forma Selvatica.'],
  ['Corpo Senza Tempo',18,'La magia primordiale che controlli rallenta l’invecchiamento: invecchi soltanto di 1 anno ogni 10 anni.'],
  ['Incantesimi Bestiali',18,'Puoi lanciare molti dei tuoi incantesimi da druido in qualsiasi forma assunta con Forma Selvatica. Puoi eseguire le componenti somatiche e verbali, ma non fornire componenti materiali.'],
  ['Arcidruido',20,'Puoi usare Forma Selvatica un numero illimitato di volte. Puoi ignorare le componenti verbali e somatiche dei tuoi incantesimi da druido e quelle materiali prive di costo e non consumate.'],
 ];
 return cards.filter(([,unlock])=>unlock<=level).map(([title,unlock,body])=>({title,level:unlock,body,source}));
}
