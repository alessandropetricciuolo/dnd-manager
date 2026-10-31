import type { GeneratedCharacterSheet } from './types';
import { artificerSpecialist } from './artificer-catalog';
export function buildArtificerPrintModel(original:GeneratedCharacterSheet){
 if(original.classLabel!=='Artefice'||!original.artificer)throw new Error('Dati e infusioni dell’Artefice non risolti dal motore.');
 const sheet=structuredClone(original),state=sheet.artificer!;
 const states:Record<string,string>={self:'usato dal PG',attuned:'usato dal PG, in sintonia',carried:'portato, non usato','carried-attuned':'portato, in sintonia, non usato',other:'assegnato ad altri'};
 const features=[...state.features.filter(f=>f.level<=sheet.level),
  {title:'INFUSIONI E OGGETTI ASSEGNATI',level:2,source:'Scelte confermate del generatore; regole Tasha',body:`Infusioni conosciute: ${state.known.length}/${state.knownLimit}. Oggetti infusi: ${state.assignments.length}/${state.itemLimit}${state.armorBonusSlots?` + ${state.armorBonusSlots} riservati all’armatura arcana`:''}. Sintonia: massimo ${state.attunementLimit}.\n\n`+state.assignments.map(a=>`${a.title} -> ${a.itemLabel}: ${states[a.state]}${a.resistance?' / resistenza: '+a.resistance:''}`).join('\n')+'\n\n'+state.notes.join('\n')},
  ...state.known.map(i=>({title:i.title,level:i.level,source:i.source,body:i.body+(i.replicaBody?'\n\nDESCRIZIONE DELL’OGGETTO REPLICATO\n'+i.replicaBody:'')})),
 ].filter(f=>f.level<=sheet.level);
 return {sheet,features,specialist:artificerSpecialist(sheet.classSubclass),state};
}

export function artificerInfusionManualSections(sheet:GeneratedCharacterSheet){
 const state=sheet.artificer;if(!state?.known.length)return [];
 const labels:Record<string,string>={self:'usato dal PG',attuned:'usato, in sintonia',carried:'portato, non usato','carried-attuned':'portato, in sintonia',other:'assegnato ad altri'};
 return [{title:'Artefice: infusioni e oggetti assegnati',body:state.assignments.map(a=>`${a.title} -> ${a.itemLabel} (${labels[a.state]})${a.resistance?' / resistenza: '+a.resistance:''}`).join('\n')+'\n\n'+state.notes.join('\n')},...state.known.map(i=>({title:i.title,body:`Fonte: ${i.source}\n\n${i.body}\n\n${i.replicaBody??''}`}))];
}
