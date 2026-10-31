import { matchSupplementSubclass, supplementSubclassesForClass } from '@/lib/character-subclass-catalog';
export const BARBARIAN_PATH_FEATURES:Record<string,Array<[string,number]>>={
  'phb-barbaro-berserker':[['FRENESIA',3],['IRA INCONTENIBILE',6],['PRESENZA INTIMIDATORIA',10],['RITORSIONE',14]],
  'phb-barbaro-totemico':[['CERCATORE DI SPIRITI',3],['SPIRITO TOTEMICO',3],['ASPETTO DELLA BESTIA',6],['VIANDANTE SPIRITUALE',10],['SINTONIA TOTEMICA',14]],
  'xge-barbaro-guardiano-ancestrale':[['PROTETTORI ANCESTRALI',3],['SPIRITI PROTETTORI',6],['CONSULTARE GLI SPIRITI',10],['ANTENATI VENDICATIVI',14]],
  'xge-barbaro-araldo-tempesta':[['AURA TEMPESTOSA',3],['ANIMA TEMPESTOSA',6],['TEMPESTA PROTETTRICE',10],['TEMPESTA FURIBONDA',14]],
  'xge-barbaro-zelota':[['FURIA DIVINA',3],['CUERRIERO DEGLI DÈI',3],['CONCENTRAZIONE FANATICA',6],['PRESENZA ZELANTE',10],['IRA IMPERITURA',14]],
  'tce-barbaro-bestia':[['FORMA DELLA BESTIA',3],['ANIMA BESTIALE',6],['FURIA CONTAGIOSA',10],['CHIAMATA ALLA CAGGIA',14]],
  'tce-barbaro-magia-selvaggia':[['CONSAPEVOLEZZA MAGICA',3],['IMPETO SELVAGGIO',3],['MAGIA CORROBORANTE',6],['REAZIONE INSTABILE',10],['IMPETO CONTROLLATO',14]],
};
export const BARBARIAN_CLASS_LEVELS:Record<string,number>={'IRA':1,'DIFESA SENZA ARMATURA':1,'ATTACCO IRRUENTO':2,'PERCEZIONE DEL PERICOLO':2,'AUMENTO DEI PUNTEGGI DI CARATTERISTICA':4,'ATTACCO EXTRA':5,'MOVIMENTO VELOCE':5,'ISTINTO FERINO':7,'CRITICO BRUTALE':9,'IRA IMPLACABILE':11,'IRA PERSISTENTE':15,'POTENZA INDOMABILE':18,'CAMPIONE PRIMORDIALE':20};
export const TOTEM_ANIMALS=['Orso','Aquila','Lupo'] as const;
export const STORM_ENVIRONMENTS=['Deserto','Mare','Tundra'] as const;
export type BarbarianChoices={totemSpirit?:typeof TOTEM_ANIMALS[number];totemAspect?:typeof TOTEM_ANIMALS[number];totemAttunement?:typeof TOTEM_ANIMALS[number];storm?:typeof STORM_ENVIRONMENTS[number];zealotDamage?:'Radiosi'|'Necrotici'};
export const supportedBarbarianPaths=()=>supplementSubclassesForClass('Barbaro').filter(p=>BARBARIAN_PATH_FEATURES[p.slug]);
export function barbarianPathFromLabel(label:string|null){const p=matchSupplementSubclass('Barbaro',label);return p&&BARBARIAN_PATH_FEATURES[p.slug]?p:null;}
