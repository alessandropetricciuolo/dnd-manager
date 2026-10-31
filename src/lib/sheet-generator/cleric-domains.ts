import { matchSupplementSubclass, supplementSubclassesForClass } from '@/lib/character-subclass-catalog';
import type { SkillKey } from './types';
export const CLERIC_DOMAIN_FEATURES:Record<string,Array<[string,number]>>={
 'phb-chierico-conoscenza':[['BENEDIZIONI DELLA CONOSCENZA',1],['INCANALARE DIVINITÀ: CONOSCENZE SECOLARI',2],['INCANALARE DIVINITÀ: LETTURA DEL PENSIERO',6],['INCANTESIMI POTENTI',8],['VISIONI DEL PASSATO',17]],
 'phb-chierico-guerra':[['COMPETENZE BONUS',1],['SACERDOTE DI GUERRA',1],['INCANALARE DIVINITÀ: COLPO GUIDATO',2],['INCANALARE DIVINITÀ: BENEDIZIONE DEL DIO DELLA GUERRA',6],['COLPO DIVINO',8],['AVATAR DELLA BATTAGLIA',17]],
 'phb-chierico-inganno':[["BENEDIZIONE DELL'INGANNATORE",1],['INCANALARE DIVINITÀ: INVOCARE DUPLICATO',2],['INCANALARE DIVINITÀ: MANTO DI OMBRE',6],['COLPO DIVINO',8],['DUPLICATO MIGLIORATO',17]],
 'phb-chierico-luce':[['TRUCCHETTO BONUS',1],['LAMPO DI INTERDIZIONE',1],["INCANALARE DIVINITÀ: FULGORE DELL'ALBA",2],['LAMPO MIGLIORATO',6],['INCANTESIMI POTENTI',8],['CORONA DI LUCE',17]],
 'phb-chierico-natura':[['ACCOLITO DELLA NATURA',1],['COMPETENZA BONUS',1],['INCANALARE DIVINITÀ: CHARME SU ANIMALI E VEGETALI',2],['MITIGARE ELEMENTI',6],['COLPO DIVINO',8],['MAESTRO DELLA NATURA',17]],
 'phb-chierico-tempesta':[['COMPETENZE BONUS',1],['COLLERA DELLA TEMPESTA',1],['INCANALARE DIVINITÀ: COLLERA DISTRUTTIVA',2],['COLPO DEL TUONO E DEL FULMINE',6],['COLPO DIVINO',8],['NATO DALLA TEMPESTA',17]],
 'phb-chierico-vita':[['COMPETENZA BONUS',1],['DISCEPOLO DELLA VITA',1],['INCANALARE DIVINITÀ: PRESERVARE VITA',2],['GUARITORE BENEDETTO',6],['COLPO DIVINO',8],['GUARIGIONE SUPREMA',17]],
 'xge-chierico-forgia':[['COMPETENZE BONUS',1],['BENEDIZIONE DELLA FORGIA',1],["INCANALARE DIVINITÀ: BENEDIZIONE DELL'ARTIGIANO",2],['ANIMA DELLA FORGIA',6],['COLPO DIVINO',8],['SANTO DELLA FORGIA E DEL FUOCO',17]],
 'xge-chierico-tomba':[['CERCHIO DI MORTALITÀ',1],['OCCHI DELLA TOMBA',1],['INCANALARE DIVINITÀ: VERSO LA TOMBA',2],['SENTINELLA ALLA PORTA DELLA MORTE',6],['INCANTESIMI POTENTI',8],['CUSTODE DELLE ANIME',17]],
 'tce-chierico-crepuscolo':[['COMPETENZE BONUS',1],['OCCHI DELLA NOTTE',1],['BENEDIZIONE VIGILE',1],['INCANALARE DIVINITÀ: SANTUARIO DEL CREPUSCOLO',2],['PASSI NELLA NOTTE',6],['COLPO DIVINO',8],['SUDARIO DEL CREPUSCOLO',17]],
 'tce-chierico-ordine':[['COMPETENZE BONUS',1],["VOCE DELL'AUTORITÀ",1],["INCANALARE DIVINITÀ: PRETESA DELL'ORDINE",2],['INCARNAZIONE DELLA LEGGE',6],['COLPO DIVINO',8],["IRA DELL'ORDINE",17]],
 'tce-chierico-pace':[['STRUMENTO DI PACE',1],['LEGAME INCORAGGIANTE',1],['INCANALARE DIVINITÀ: BALSAMO DELLA PACE',2],['LEGAME PROTETTIVO',6],['INCANTESIMI POTENTI',8],['LEGAME ESPANSIVO',17]],
};
export const CLERIC_CLASS_LEVELS:Record<string,number>={'INCANTESIMI':1,'TRUCCHETTI':1,'PREPARARE E LANCIARE INCANTESIMI':1,'CARATTERISTICA DA INCANTATORE':1,'CELEBRARE RITUALI':1,'FOCUS DA INCANTATORE':1,'DOMINIO DIVINO':1,'INCANTESIMI DI DOMINIO':1,'INCANALARE DIVINITÀ':2,'INCANALARE DIVINITÀ: SCACCIARE NON MORTI':2,'AUMENTO DEI PUNTEGGI DI CARATTERISTICA':4,'DISTRUGGERE NON MORTI':5,'INTERVENTO DIVINO':10};
export const CLERIC_SKILL_CHOICES:Record<string,SkillKey[]>={
 'phb-chierico-conoscenza':['arcana','nature','religion','history'],
 'phb-chierico-natura':['animal_handling','nature','survival'],
 'tce-chierico-ordine':['intimidation','persuasion'],
 'tce-chierico-pace':['insight','performance','persuasion'],
};
export const DRUID_CANTRIPS=['Artificio Druidico','Frusta di Spine','Guida','Produrre Fiamma','Randello Incantato','Resistenza','Riparare','Spruzzo Velenoso'] as const;
export type ClericChoices={skills?:SkillKey[];languages?:string[];druidCantrip?:string};
export const supportedClericDomains=()=>supplementSubclassesForClass('Chierico').filter(d=>CLERIC_DOMAIN_FEATURES[d.slug]);
export function clericDomainFromLabel(label:string|null){const d=matchSupplementSubclass('Chierico',label);return d&&CLERIC_DOMAIN_FEATURES[d.slug]?d:null;}
