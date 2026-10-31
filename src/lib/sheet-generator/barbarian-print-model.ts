import type { GeneratedCharacterSheet } from './types';
import { barbarianPathFromLabel, type BarbarianChoices } from './barbarian-paths';
import type { PrintFeature } from './manual-feature-text';
export type BarbarianEvidence={classFeatures:PrintFeature[];pathFeatures:PrintFeature[];rage:{uses:number|null;damage:number}};

export function buildBarbarianPrintModel(original:GeneratedCharacterSheet,evidence:BarbarianEvidence,choices:BarbarianChoices={}){
  if(original.classLabel!=='Barbaro')throw new Error('Classe Barbaro richiesta.');
  const sheet=structuredClone(original),path=barbarianPathFromLabel(sheet.classSubclass);
  if(sheet.classSubclass&&!path)throw new Error('Cammino non catalogato nei manuali.');
  if(sheet.level<3){sheet.classSubclass=null;sheet.subclassFeaturesMd=null;}
  const features=[...evidence.classFeatures,...evidence.pathFeatures].filter(f=>f.level<=sheet.level).map(f=>({...f}));
  if(!features.some(f=>f.title==='IRA'))throw new Error('Regola Ira non risolta dal manuale.');
  if(sheet.level>=20){
    for(const key of ['str','con'] as const){const old=sheet.abilityMods[key];sheet.abilities[key]=Math.min(24,sheet.abilities[key]+4);sheet.abilityMods[key]=Math.floor((sheet.abilities[key]-10)/2);const delta=sheet.abilityMods[key]-old;sheet.savingThrows[key].value+=delta;
      if(key==='str'){sheet.skills.athletics.value+=delta;for(const attack of sheet.weaponRows){const n=Number(attack.toHit);if(Number.isFinite(n))attack.toHit=`${n+delta>=0?'+':''}${n+delta}`;}}
      if(key==='con'){sheet.hpMax+=delta*sheet.level;sheet.armorClass+=delta;}
    }
  }
  if(sheet.level>=5){const speed=sheet.speed.match(/^([\d,.]+)\s*m$/);if(!speed)throw new Error('Velocità base non riconosciuta: verifica Movimento Veloce.');sheet.speed=`${Number(speed[1].replace(',','.'))+3} m`;}
  const select=(title:string,choice:string)=>{const f=features.find(f=>f.title===title);if(!f)return;const parts=f.body.split(/(?=\*\*[^*]+\.\*\*)/);const selected=parts.find(p=>p.startsWith(`**${choice}.**`));if(!selected)throw new Error(`Opzione ${choice} non trovata per ${title}.`);f.body=parts[0]+'\n\n'+selected;f.title+=` - ${choice}`;};
  if(path?.slug==='phb-barbaro-totemico'&&sheet.level>=3){select('SPIRITO TOTEMICO',choices.totemSpirit??'Orso');if(sheet.level>=6)select('ASPETTO DELLA BESTIA',choices.totemAspect??'Orso');if(sheet.level>=14)select('SINTONIA TOTEMICA',choices.totemAttunement??'Orso');}
  else if(choices.totemSpirit||choices.totemAspect||choices.totemAttunement)throw new Error('Le scelte totemiche richiedono il Cammino Totemico.');
  if(path?.slug==='xge-barbaro-araldo-tempesta'&&sheet.level>=3){for(const title of ['AURA TEMPESTOSA','ANIMA TEMPESTOSA','TEMPESTA FURIBONDA'])select(title,choices.storm??'Deserto');}
  else if(choices.storm)throw new Error('L’ambiente richiede il Cammino dell’Araldo della Tempesta.');
  if(path?.slug==='xge-barbaro-zelota'&&sheet.level>=3){const f=features.find(f=>f.title==='FURIA DIVINA');if(f)f.body+=`\n\nTipo di danni scelto: ${choices.zealotDamage??'Radiosi'}.`;}
  else if(choices.zealotDamage)throw new Error('Il tipo di danno divino richiede il Cammino dello Zelota.');
  return {sheet,features,path,rage:evidence.rage,brutalDice:sheet.level>=17?3:sheet.level>=13?2:sheet.level>=9?1:0};
}
