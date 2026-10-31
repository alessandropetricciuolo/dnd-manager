import type { BuildChoiceSlot } from './build-choices-types';
import type { ArtificerEvidence } from './artificer-types';
import { artificerItems, artificerSpecialist, defaultArtificerChoices, INFUSION_RESISTANCES } from './artificer-catalog';
export function artificerBuildChoiceSlots(level:number,subclass:string|null,evidence:ArtificerEvidence):BuildChoiceSlot[]{
 const defaults=defaultArtificerChoices(level,subclass,evidence.infusions,evidence.knownLimit,evidence.itemLimit),items=artificerItems(level,subclass),armorer=level>=3&&artificerSpecialist(subclass)?.slug==='tce-artefice-armaiolo';
 const slot=(id:string,label:string,options:BuildChoiceSlot['options'],value:string,group='Artefice'):BuildChoiceSlot=>({id,label,group,options,value});
 const slots:BuildChoiceSlot[]=[slot('artificer-armor','Armatura indossata',[{value:'scaglie',label:'Armatura di scaglie'},{value:'pelli',label:'Armatura di pelli'},{value:'cuoio',label:'Armatura di cuoio'},...(armorer?[{value:'cotta',label:'Cotta di maglia'}]:[]),{value:'nessuna',label:'Nessuna armatura'}],defaults.armor!),slot('artificer-shield','Scudo impugnato',[{value:'no',label:'No (mani libere per balestra o focus)'},{value:'yes',label:'Sì (+2 CA; riporre per usare la balestra)'}],defaults.shield?'yes':'no')];
 if(armorer)slots.push(slot('artificer-model','Modello dell’armatura',[{value:'Guardiano',label:'Guardiano'},{value:'Infiltrato',label:'Infiltrato'}],defaults.armorModel!));
 const infusionOptions=evidence.infusions.filter(i=>i.level<=level).map(i=>({value:i.id,label:i.title,meta:i.replica&&!i.replicaBody?'Descrizione dell’oggetto non disponibile':`Livello ${i.level}${i.attunement?' · richiede sintonia':''}`,disabled:!!i.replica&&!i.replicaBody}));
 for(let i=0;i<evidence.knownLimit;i++)slots.push(slot(`artificer-known-${i+1}`,`Infusione conosciuta ${i+1} di ${evidence.knownLimit}`,infusionOptions,defaults.known![i],'Infusioni conosciute'));
 const pairOptions=evidence.infusions.filter(i=>i.level<=level&&(!i.replica||i.replicaBody)).flatMap(inf=>items.filter(item=>item.kinds.some(k=>inf.targets.includes(k))).map(item=>({value:inf.id+'::'+item.id,label:inf.title+' → '+item.label,requiresInfusion:inf.id,requiresAttunement:inf.attunement,disabled:!defaults.known!.includes(inf.id)})));
 const max=evidence.itemLimit+(armorer&&level>=9?2:0);
 for(let i=0;i<max;i++){const a=defaults.assignments![i];slots.push(slot(`artificer-active-${i+1}`,`Oggetto infuso ${i+1} (limite ${max}${armorer&&level>=9?', due posti riservati all’armatura':''})`,[{value:'',label:'Nessuna infusione'},...pairOptions],a?a.infusionId+'::'+a.itemId:'','Oggetti infusi'));
  slots.push(slot(`artificer-state-${i+1}`,`Utilizzo dell’oggetto ${i+1}`,[{value:'self',label:'Usato dal PG, senza sintonia'},{value:'attuned',label:'Usato dal PG, in sintonia'},{value:'carried',label:'Portato, non usato'},{value:'carried-attuned',label:'Portato e in sintonia, non usato'},{value:'other',label:'Assegnato ad altri (nessun bonus al PG)'}],a?.state??'self','Oggetti infusi'));
  slots.push(slot(`artificer-resistance-${i+1}`,`Resistenza dell’oggetto ${i+1} (solo Armatura Resistente)`,INFUSION_RESISTANCES.map(v=>({value:v,label:v})),a?.resistance??'fuoco','Oggetti infusi'));
 }
 return slots;
}
