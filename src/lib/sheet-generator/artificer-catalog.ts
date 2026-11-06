import { matchSupplementSubclass, supplementSubclassesForClass } from '@/lib/character-subclass-catalog';
import type { ArtificerItem, ArtificerInfusion, ArtificerChoices, ArtificerAssignment, ArtificerItemKind } from './artificer-types';
import { findWeaponDefinition } from './weapon-catalog';
export const ARTIFICER_CLASS_LEVELS:Record<string,number>={'INVENZIONE MAGICA':1,'INCANTESIMI':1,'STRUMENTI NECESSARI':1,'TRUCCHETTI (INCANTESIMI DI LIVELLO 0)':1,'PREPARARE E LANCIARE INCANTESIMI':1,'CARATTERISTICA DA INCANTATORE':1,'CELEBRARE RITUALI':1,'INFONDERE NEGLI OGGETTI':2,'INFUSIONI CONOSCIUTE':2,'INFONDERE UN OGGETTO':2,'SPECIALIZZAZIONE DA ARTEFICE':3,'LO STRUMENTO PIÙ ADATTO':3,'AUMENTO DEI PUNTEGGI DI CARATTERISTICA':4,'MAESTRIA NEGLI STRUMENTI':6,'LAMPO DI GENIO':7,'ADEPTO DEGLI OGGETTI MAGICI':10,"OGGETTO CHE CUSTODISCE L'INCANTE SIMO":11,'SAPIENTE DEGLI OGGETTI MAGICI':14,'MAESTRO DEGLI OGGETTI MAGICI':18,"ANIMA DELL'ARTIFICIO":20};
export const ARTIFICER_SPECIALIST_FEATURES:Record<string,Array<[string,number]>>={
 'tce-artefice-alchimista':[['COMPETENZA NEGLI STRUMENTI',3],['ELISIR SPERIMENTALE',3],['ALCHEMICO SAPIENTE',5],['REAGENTI RISTORATIVI',9],['MAESTRIA NELLA CHIMICA',15]],
 'tce-artefice-armaiolo':[['STRUMENTI DEL MESTIERE',3],['ARMATURA ARCANA',3],['MODELLO DI ARMATURA',3],['ATTACCO EXTRA',5],["MODIFICHE ALL'ARMATURA",9],['ARMATURA PERFEZIONATA',15]],
 'tce-artefice-artigliere':[['COMPETENZA NEGLI STRUMENTI',3],['CANNONE OCCULTO',3],['ARMA DA FUOCO ARCANA',5],['CANNONE ESPLOSIVO',9],['POSIZIONE FORTIFICATA',15]],
 'tce-artefice-fabbro-battaglia':[['COMPETENZA NEGLI STRUMENTI',3],['PRONTO PER LA BATTAGLIA',3],["DIFENSORE D'ACCIAIO",3],['ATTACCO EXTRA',5],['SCOSSA ARCANA',9],['DIFENSORE MIGLIORATO',15]],
};
export const INFUSION_SPECS:Array<[string,string,ArtificerInfusion['targets']]>=[
 ['spell-ring','ANELLO RICARICA INCANTESIMI',['ring']],['weapon','ARMA MIGLIORATA',['weapon']],['radiant','ARMA SPLENDENTE',['weapon']],['propulsion','ARMATURA A PROPULSIONE ARCANA',['armor']],['strength-armor','ARMATURA DELLA FORZA MAGICA',['armor']],['resistant','ARMATURA RESISTENTE',['armor']],['repeating','COLPO RIPETUTO',['ammunition']],['defense','DIFESA MIGLIORATA',['armor','shield']],['awareness','ELMO DELLA CONSAPEVOLEZZA',['helmet']],['focus','FOCUS ARCANO MIGLIORATO',['focus']],['mind','MENTE ACUTA',['armor','robe']],['returning',"RITORNO DELL'ARMA",['thrown']],['repulsion','SCUDO DELLA REPULSIONE',['shield']],['homunculus','SERVO OMUNCOLO',['crystal']],['winding','STIVALI DEL SENTIERO TORTUOSO',['boots']],
];
export const INFUSION_RESISTANCES=['acido','freddo','fuoco','forza','fulmine','necrotico','veleno','psichico','radioso','tuono'] as const;
export const artificerSpecialist=(label:string|null)=>matchSupplementSubclass('Artefice',label);
export const supportedArtificerSpecialists=()=>supplementSubclassesForClass('Artefice').filter(s=>ARTIFICER_SPECIALIST_FEATURES[s.slug]);
export function artificerItems(
  level: number,
  subclass: string | null,
  customWeapons?: Array<{ id?: string; itemId?: string; weaponId?: string; name?: string }>
): ArtificerItem[] {
  const armorer = level >= 9 && artificerSpecialist(subclass)?.slug === 'tce-artefice-armaiolo';
  const weaponItems: ArtificerItem[] = [];

  if (customWeapons && customWeapons.length > 0) {
    for (let i = 0; i < customWeapons.length; i++) {
      const w = customWeapons[i];
      const itemId =
        w.itemId ||
        w.id ||
        (w.weaponId === 'balestra-leggera' && i === 0
          ? 'crossbow'
          : w.weaponId === 'martello-leggero' && i === 1
          ? 'hammer'
          : `weapon-${i + 1}`);
      const def = w.weaponId ? findWeaponDefinition(w.weaponId) : undefined;
      const label = w.name || def?.name || `Arma ${i + 1}`;
      const kinds: ArtificerItemKind[] = ['weapon'];
      if (def) {
        if (def.category.endsWith('-ranged') || def.properties.includes('ammunition')) {
          kinds.push('ammunition');
        }
        if (def.properties.includes('thrown')) {
          kinds.push('thrown');
        }
      } else {
        if (itemId === 'crossbow' || /balestra|arco/i.test(label)) kinds.push('ammunition');
        if (itemId === 'hammer' || /martello|pugnale|giavellotto/i.test(label)) kinds.push('thrown');
      }
      weaponItems.push({ id: itemId, label, kinds, weaponIndex: i });
    }
  } else {
    weaponItems.push(
      { id: 'crossbow', label: 'Balestra leggera', kinds: ['weapon', 'ammunition'], weaponIndex: 0 },
      { id: 'hammer', label: 'Martello leggero', kinds: ['weapon', 'thrown'], weaponIndex: 1 }
    );
  }

  const items: ArtificerItem[] = [
    { id: 'armor', label: 'Armatura indossata', kinds: ['armor'], armorPart: armorer },
    { id: 'shield', label: 'Scudo', kinds: ['shield'] },
    ...weaponItems,
    { id: 'focus', label: 'Bacchetta non magica', kinds: ['focus'] },
    { id: 'robe', label: 'Veste', kinds: ['robe'] },
    { id: 'helmet', label: armorer ? 'Elmo dell’armatura arcana' : 'Elmo', kinds: ['helmet'], armorPart: armorer },
    { id: 'boots', label: armorer ? 'Stivali dell’armatura arcana' : 'Stivali', kinds: ['boots'], armorPart: armorer },
    ...(armorer ? [{ id: 'arcane-weapon', label: 'Arma speciale dell’armatura', kinds: ['weapon'] as ArtificerItemKind[], armorPart: true }] : []),
    { id: 'ring', label: 'Anello', kinds: ['ring'] },
    { id: 'crystal', label: 'Gemma per Servo Omuncolo (100 mo)', kinds: ['crystal'], costNote: 'Richiede una gemma o un cristallo da almeno 100 mo: acquisto da verificare con il DM.' },
    ...Array.from({ length: 8 }, (_, i) => ({ id: `replica-${i + 1}`, label: `Oggetto da replicare ${i + 1}`, kinds: ['replica'] as ArtificerItemKind[] })),
  ];
  return items;
}
export function defaultArtificerChoices(level:number,subclass:string|null,infusions:ArtificerInfusion[],knownLimit:number,itemLimit:number):ArtificerChoices{
 const armorer=level>=3&&artificerSpecialist(subclass)?.slug==='tce-artefice-armaiolo',smith=level>=3&&artificerSpecialist(subclass)?.slug==='tce-artefice-fabbro-battaglia';
 const priority=smith?['weapon','defense','repulsion','mind','focus','awareness','spell-ring','returning','strength-armor','winding','resistant','repeating']:['defense','repeating','focus','mind','awareness','spell-ring','winding','weapon','returning','repulsion','strength-armor','resistant'];
 const available=infusions.filter(i=>i.level<=level);
 const known=[...priority.map(id=>available.find(i=>i.id===id)).filter(Boolean),...available].filter((i,index,all)=>all.findIndex(v=>v!.id===i!.id)===index).slice(0,knownLimit).map(i=>i!.id);
 const assignments:ArtificerAssignment[]=[],items=artificerItems(level,subclass),used=new Set<string>();let attuned=0;
 const cap=level>=18?6:level>=14?5:level>=10?4:3;
 for(const id of known){if(assignments.length>=itemLimit+(armorer&&level>=9?2:0))break;const inf=available.find(i=>i.id===id)!;
  // Do not choose expensive components or replicated equipment implicitly.
  if(id==='homunculus'||inf.replica)continue;
  const preferred=id==='weapon'&&armorer&&level>=9?'arcane-weapon':id==='weapon'&&smith?'hammer':null;
  const item=(preferred?items.find(i=>i.id===preferred&&!used.has(i.id)):null)??items.find(i=>!used.has(i.id)&&i.kinds.some(k=>inf.targets.includes(k))&&(i.id!=='shield'||smith||armorer));
  if(!item||inf.attunement&&attuned>=cap)continue;
  const nonArmor=assignments.filter(a=>!items.find(i=>i.id===a.itemId)?.armorPart).length;
  if(armorer&&level>=9&&!item.armorPart&&nonArmor>=itemLimit)continue;
  used.add(item.id);if(inf.attunement)attuned++;
  assignments.push({infusionId:id,itemId:item.id,state:inf.attunement?'attuned':'self',...(id==='resistant'?{resistance:'fuoco'}:{})});
 }
 return {known,assignments,armor:'scaglie',shield:!!smith||armorer, ...(armorer?{armorModel:'Guardiano' as const}:{})};
}
