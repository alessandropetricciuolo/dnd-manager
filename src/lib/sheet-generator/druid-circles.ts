import { matchSupplementSubclass, supplementSubclassesForClass } from '@/lib/character-subclass-catalog';
import type { SubclassCatalogEntry } from '@/lib/character-subclass-catalog';
import type { PrintFeature } from './manual-feature-text';
export const DRUID_LAND_TERRAINS=['Artico','Costa','Deserto','Foresta','Montagna','Palude','Prateria','Underdark'] as const;
export type DruidChoices={landTerrain?:typeof DRUID_LAND_TERRAINS[number];landCantrip?:string};

export const DRUID_CLASS_LEVELS:Record<string,number>={
 'DRUIDICO':1,'INCANTESIMI':1,'FORMA SELVATICA':2,'CIRCOLO DRUIDICO':2,
 'AUMENTO DEI PUNTEGGI DI CARATTERISTICA':4,'CORPO SENZA TEMPO':18,'INCANTESIMI BESTIALI':18,'ARCIDRUIDO':20,
};
export const DRUID_CIRCLE_FEATURES:Record<string,Array<[string,number]>>={
 'phb-druido-terra':[['INCANTESIMI DEL CIRCOLO',2],['TRUCCHETTO BONUS',2],['RECUPERO NATURALE',2],['ANDATURA SUL TERRITORIO',6],['INTERDIZIONE DELLA NATURA',10],['RIFUGIO DELLA NATURA',14]],
 'phb-druido-luna':[['FORME DEL CIRCOLO',2],['FORMA SELVATICA DA COMBATTIMENTO',2],['COLPO PRIMORDIALE',6],['FORMA SELVATICA ELEMENTALE',10],['MILLE FORME',14]],
 'xge-druido-sogni':[['BALSAMO DELLA CORTE DELL’ESTATE',2],['FOCOLARE DELLA LUCE LUNARE E DELL’OMBRA',6],['SENTIERI NASCOSTI',10],['VIANDANTE DEI SOGNI',14]],
 'xge-druido-pastore':[['LINGUA DEI BOSCHI',2],['TOTEM SPIRITUALE',2],['EVOCATORE POSSENTE',6],['SPIRITO GUARDIANO',10],['EVOCazioni FEDELI'.toUpperCase(),14]],
 'tce-druido-fiamma':[['INCANTESIMI DEL CIRCOLO',2],['EVOCARE SPIRITO DELLA FIAMMA',2],['LEGAME MIGLIORATO',6],['FIAMME CAUTERIZZANTI',10],['RECUPERO ARDENTE',14]],
 'tce-druido-spore':[['INCANTESIMI DEL CIRCOLO',2],['ALONE DI SPORE',2],['ENTITÀ SIMBIOTICA',2],['INFESTAZIONE FUNGINA',6],['DIFFUSIONE DI SPORE',10],['CORPO FUNGINO',14]],
 'tce-druido-stelle':[['CARTA CELESTE',2],['FORMA SIDERALE',2],['PROFEZIA COSMICA',6],['COSTELLAZIONI SCINTILLANTI',10],['MANTO DI STELLE',14]],
};
export const supportedDruidCircles=()=>supplementSubclassesForClass('Druido').filter(c=>DRUID_CIRCLE_FEATURES[c.slug]);
export const druidCircleFromLabel=(label:string|null|undefined):SubclassCatalogEntry|null=>{if(!label)return null;const c=matchSupplementSubclass('Druido',label);return c&&DRUID_CIRCLE_FEATURES[c.slug]?c:null;};
export type DruidEvidence={classFeatures:PrintFeature[];circleFeatures:PrintFeature[];slots:import('./types').GeneratedCharacterSheet['spellSlots'];cantrips:number;grantedSpells:import('./types').GeneratedSpell[];landTerrain?:typeof DRUID_LAND_TERRAINS[number]};
