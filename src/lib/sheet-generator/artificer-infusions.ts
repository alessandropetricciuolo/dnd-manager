import type { AbilityKey, GeneratedCharacterSheet, SkillKey } from './types';
import type { ArtificerChoices, ArtificerEvidence, ArtificerState } from './artificer-types';
import { artificerItems, artificerSpecialist, defaultArtificerChoices, INFUSION_RESISTANCES } from './artificer-catalog';
const sign=(n:number)=>`${n>=0?'+':''}${n}`;
const abilitySkills:Record<AbilityKey,SkillKey[]>={str:['athletics'],dex:['acrobatics','sleight_of_hand','stealth'],con:[],int:['arcana','history','investigation','nature','religion'],wis:['animal_handling','insight','medicine','perception','survival'],cha:['deception','intimidation','performance','persuasion']};
const key=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function applyArtificerInfusions(original:GeneratedCharacterSheet,evidence:ArtificerEvidence,overrides:ArtificerChoices={}):GeneratedCharacterSheet{
 if(original.classLabel!=='Artefice')throw new Error('Le infusioni richiedono la classe Artefice.');
 if(original.artificer)throw new Error('Le infusioni devono essere applicate ai dati di base, una sola volta.');
 const sheet=structuredClone(original),level=sheet.level,specialist=level>=3?artificerSpecialist(sheet.classSubclass):null;
 const defaults=defaultArtificerChoices(level,sheet.classSubclass,evidence.infusions,evidence.knownLimit,evidence.itemLimit);
 const choices={...defaults,...overrides},knownIds=choices.known!,assignments=choices.assignments!.map(a=>({...a,resistance:a.infusionId==='resistant'?a.resistance:undefined}));
 const armorer=specialist?.slug==='tce-artefice-armaiolo',smith=specialist?.slug==='tce-artefice-fabbro-battaglia';
 if(level<3){sheet.classSubclass=null;sheet.subclassFeaturesMd=null;}
 if(!['scaglie','pelli','cuoio','cotta','nessuna'].includes(choices.armor!))throw new Error('Armatura non prevista dal generatore.');
 if(typeof choices.shield!=='boolean')throw new Error('Scelta dello scudo non valida.');
 if(choices.armorModel&&!['Guardiano','Infiltrato'].includes(choices.armorModel))throw new Error('Modello di armatura non valido.');
 const extra=armorer&&level>=9?2:0,attunementLimit=level>=18?6:level>=14?5:level>=10?4:3;
 const items=artificerItems(level,sheet.classSubclass,sheet.weaponRows),known=evidence.infusions.filter(i=>knownIds.includes(i.id));
 if(knownIds.length!==evidence.knownLimit||new Set(knownIds).size!==knownIds.length||known.length!==knownIds.length||known.some(i=>i.level>level))throw new Error('Infusioni conosciute non valide per il livello: scegli il numero previsto di infusioni distinte.');
 if(known.some(i=>i.replica&&!i.replicaBody))throw new Error('Descrizione di un oggetto replicato non disponibile nel manuale.');
 if(assignments.length>evidence.itemLimit+extra)throw new Error('Troppi oggetti infusi per il livello.');
 if(new Set(assignments.map(a=>a.itemId)).size!==assignments.length)throw new Error('Un oggetto può ricevere una sola infusione.');
 if(new Set(assignments.map(a=>a.infusionId)).size!==assignments.length)throw new Error('Ogni infusione può essere attiva su un solo oggetto.');
 if(extra&&assignments.filter(a=>!items.find(i=>i.id===a.itemId)?.armorPart).length>evidence.itemLimit)throw new Error('I due oggetti aggiuntivi dell’Armaiolo devono essere parti dell’armatura arcana.');
 const attuned=assignments.filter(a=>a.state==='attuned'||a.state==='carried-attuned');
 if(attuned.length>attunementLimit)throw new Error('Superato il limite di oggetti in sintonia.');
 for(const a of assignments){const inf=known.find(i=>i.id===a.infusionId),item=items.find(i=>i.id===a.itemId);
  if(!inf||!item||!item.kinds.some(k=>inf.targets.includes(k)))throw new Error('Infusione assegnata a un oggetto non compatibile o non conosciuta.');
  if(!['self','attuned','carried','carried-attuned','other'].includes(a.state))throw new Error('Stato dell’oggetto infuso non valido.');
  if((a.state==='attuned'||a.state==='carried-attuned')&&!inf.attunement)throw new Error('Questo oggetto non richiede sintonia.');
  if(a.infusionId==='resistant'&&!INFUSION_RESISTANCES.some(v=>v===a.resistance))throw new Error('Scegli il tipo di resistenza dell’armatura.');
  if(item.id==='armor'&&choices.armor==='nessuna')throw new Error('Non puoi infondere un’armatura assente.');
 }
 if(choices.armor==='cotta'&&!armorer)throw new Error('La cotta di maglia richiede la competenza dell’Armaiolo.');
 if(choices.armorModel&&!armorer)throw new Error('Il modello di armatura richiede l’Armaiolo dal livello 3.');
 const active=assignments.filter(a=>a.state==='self'||a.state==='attuned').filter(a=>!known.find(i=>i.id===a.infusionId)!.attunement||a.state==='attuned');
 const notes:string[]=[];
 const isActive=(id:string)=>active.some(a=>a.infusionId===id);
 const replicas=active.flatMap(a=>{const inf=known.find(i=>i.id===a.infusionId)!;return inf.replica?[inf]:[];});
 const setAbility=(ability:AbilityKey,score:number)=>{if(!Number.isInteger(score)||score<1)throw new Error('Punteggio dell’oggetto non risolto dal manuale.');sheet.abilities[ability]=Math.max(sheet.abilities[ability],score);};
 for(const inf of replicas){const name=key(inf.replica!);if(name.includes('amuleto della salute'))setAbility('con',Number(inf.replicaBody!.match(/pari a (\d+)/i)?.[1]));
  if(name.includes('fascia dell'))setAbility('int',Number(inf.replicaBody!.match(/pari a (\d+)/i)?.[1]));
  if(name.includes('guanti del potere'))setAbility('str',Number(inf.replicaBody!.match(/pari a (\d+)/i)?.[1]));
  if(name.includes('cintura della forza')){const row=inf.replicaBody!.match(/<td>\s*(?:Gigant[ei] delle )?colline\s*<\/td>\s*<td>\s*(\d+)/i);setAbility('str',Number(row?.[1]));}
 }
 for(const ability of Object.keys(abilitySkills) as AbilityKey[]){const old=sheet.abilityMods[ability],mod=Math.floor((sheet.abilities[ability]-10)/2),delta=mod-old;sheet.abilityMods[ability]=mod;sheet.savingThrows[ability].value+=delta;for(const skill of abilitySkills[ability])sheet.skills[skill].value+=delta;if(ability==='con')sheet.hpMax+=delta*level;if(ability==='dex')sheet.initiative+=delta;}
 const armor=choices.armor??'scaglie',shield=!!choices.shield;
 const armorAC=armor==='cotta'?16:armor==='scaglie'?14+Math.min(sheet.abilityMods.dex,2):armor==='pelli'?12+Math.min(sheet.abilityMods.dex,2):armor==='cuoio'?11+sheet.abilityMods.dex:10+sheet.abilityMods.dex;
 sheet.armorClass=armorAC+(shield?2:0);
 if(armorer)sheet.armorProficiencies=[...new Set([...sheet.armorProficiencies,'Armature pesanti'])];
 if(smith)sheet.weaponProficiencies=[...new Set([...sheet.weaponProficiencies,'Armi da guerra'])];
 const tool=specialist?.slug==='tce-artefice-alchimista'?'Scorte da alchimista':specialist?.slug==='tce-artefice-artigliere'?'Strumenti da intagliatore':specialist?'Strumenti da fabbro':null;
 if(tool)sheet.toolProficiencies=[...new Set([...sheet.toolProficiencies,tool])];
 sheet.spellAttackBonus=sheet.proficiencyBonus+sheet.abilityMods.int;sheet.spellSaveDc=8+sheet.proficiencyBonus+sheet.abilityMods.int;
 sheet.spellsPrepared=Math.max(1,Math.floor(level/2)+sheet.abilityMods.int);sheet.cantripsKnown=evidence.cantrips;sheet.spellSlots={...evidence.slots};
 const armorModel=armorer?(choices.armorModel??'Guardiano'):undefined;
 if(armorer&&armor==='nessuna')throw new Error('Il modello dell’Armaiolo richiede un’armatura indossata.');
 if(armorModel){const infiltrator=armorModel==='Infiltrato';sheet.weaponRows.push({name:infiltrator?'Lanciatore di Fulmini':'Guanti del Tuono',toHit:'',damage:infiltrator?'1d6+INT':'1d8+INT',type:infiltrator?'fulmine':'tuono',itemId:'arcane-weapon'});if(infiltrator)notes.push('Infiltrato: +1,5 m di velocità; il vantaggio a Furtività si annulla con lo svantaggio dell’armatura, se presente.');}
 for(let index=0;index<sheet.weaponRows.length;index++){
  const row=sheet.weaponRows[index];
  const special=row.itemId==='arcane-weapon'||(armorer&&(row.name.includes('Fulmini')||row.name.includes('Tuono')));
  const itemId=row.itemId??(special?'arcane-weapon':index===0?'crossbow':'hammer');
  const infused=active.find(a=>a.itemId===itemId),inf=known.find(i=>i.id===infused?.infusionId);
  let bonus=0;if(inf&&['weapon','radiant','repeating','returning'].includes(inf.id))bonus=inf.id==='weapon'&&level>=10?2:1;
  const physical=special?(armorModel==='Infiltrato'?'dex':'str'):/DES/.test(row.damage)?'dex':'str';
  const useInt=(special||smith&&!!inf)&&sheet.abilityMods.int>=sheet.abilityMods[physical];
  const mod=useInt?sheet.abilityMods.int:sheet.abilityMods[physical],ability=useInt?'INT':physical==='dex'?'DES':'FOR';
  row.toHit=sign(sheet.proficiencyBonus+mod+bonus);row.damage=row.damage.replace(/(?:FOR|DES|INT)/g,ability)+(bonus?'+'+bonus:'');if(inf)row.name+=bonus?` +${bonus}`:` (magica)`;
 }
 const statBonus=level>=10?2:1;
 for(const a of active){const inf=known.find(i=>i.id===a.infusionId)!,item=items.find(i=>i.id===a.itemId)!;
  if(inf.id==='defense'&&(item.id==='armor'||item.id==='shield'&&shield))sheet.armorClass+=statBonus;
  if(inf.id==='repulsion'&&shield)sheet.armorClass+=1;
  if(inf.id==='focus')sheet.spellAttackBonus+=statBonus; // Does not increase spell save DC.
  if(inf.id==='propulsion'){
   notes.push('Armatura a Propulsione Arcana: +1,5 m di velocità; guanti magici disponibili quando la mano è libera.');
   sheet.weaponRows.push({name:'Guanti a Propulsione Arcana',toHit:sign(sheet.proficiencyBonus+(smith?Math.max(sheet.abilityMods.int,sheet.abilityMods.str):sheet.abilityMods.str)),damage:'1d8+'+(smith&&sheet.abilityMods.int>=sheet.abilityMods.str?'INT':'FOR'),type:'forza'});
  }
  if(inf.id==='awareness')notes.push('Elmo della Consapevolezza: vantaggio all’iniziativa; non puoi essere sorpreso salvo incapacità (nessun bonus numerico fisso).');
  if(inf.id==='resistant')notes.push('Armatura Resistente: resistenza ai danni da '+a.resistance+'.');
  if(inf.id==='repeating')notes.push('Colpo Ripetuto: ignora ricarica e crea munizioni; la balestra leggera richiede ancora due mani.');
  if(item.costNote)notes.push(item.costNote);
 }
 for(const inf of replicas){const name=key(inf.replica!);
  if(/mantello della protezione|anello di protezione/.test(name)){sheet.armorClass+=1;for(const save of Object.values(sheet.savingThrows))save.value+=1;}
  if(name.includes('bracciali della difesa')&&armor==='nessuna'&&!shield)sheet.armorClass+=2;
  if(name.includes('guanti ladreschi'))sheet.skills.sleight_of_hand.value+=5;
  if(name.includes('bracciali dell')){sheet.weaponProficiencies=[...new Set([...sheet.weaponProficiencies,'Arco corto','Arco lungo'])];notes.push('Bracciali dell’Arciere: +2 danni solo con arco lungo o corto; nessun bonus alla balestra.');}
  notes.push(`${inf.replica}: condizioni e capacità complete nella descrizione dell’oggetto (nessuna attivazione temporanea presunta).`);
 }
 if(level>=20)for(const save of Object.values(sheet.savingThrows))save.value+=attuned.length;
 const move=Number(sheet.speed.match(/^[\d,.]+/)?.[0].replace(',','.')??NaN);
 if(!Number.isFinite(move))throw new Error('Velocità di base non riconosciuta.');
 let speed=move+(armorModel==='Infiltrato'?1.5:0)+(isActive('propulsion')?1.5:0);
 if(replicas.some(i=>key(i.replica!).includes('stivali molleggiati')))speed=Math.max(speed,9);
 sheet.speed=`${speed} m`;
 if(replicas.some(i=>key(i.replica!).includes('stivali alati')))sheet.speed+=` / volare ${speed} m (max 4 ore)`;
 if(replicas.some(i=>key(i.replica!).includes('mantello della manta')))sheet.speed+=' / nuotare 18 m (cappuccio alzato)';
 sheet.passivePerception=10+sheet.skills.perception.value;
 sheet.inventory=sheet.inventory.filter(i=>!/^Armatura:|^Scudo:/i.test(i));
 sheet.inventory.unshift(...assignments.map(a=>`${known.find(i=>i.id===a.infusionId)!.title} -> ${items.find(i=>i.id===a.itemId)!.label} (${a.state==='other'?'ad altri':a.state==='attuned'?'usato, in sintonia':a.state==='self'?'usato':a.state==='carried-attuned'?'portato, in sintonia':'portato'})`));
 sheet.inventory.push(`Armatura: ${armor==='nessuna'?'nessuna':armor==='scaglie'?'armatura di scaglie':armor==='pelli'?'armatura di pelli':armor==='cuoio'?'armatura di cuoio':'cotta di maglia'}`,`Scudo: ${shield?'impugnato':'non impugnato'}`,'Balestra leggera; martello leggero; bacchetta non magica; strumenti da artefice');
 const state:ArtificerState={knownLimit:evidence.knownLimit,itemLimit:evidence.itemLimit,armorBonusSlots:extra,attunementLimit,known:knownIds.map(id=>known.find(i=>i.id===id)!),assignments:assignments.map(a=>({...a,title:known.find(i=>i.id===a.infusionId)!.title,itemLabel:items.find(i=>i.id===a.itemId)!.label,requiresAttunement:known.find(i=>i.id===a.infusionId)!.attunement,source:known.find(i=>i.id===a.infusionId)!.source})),armorModel,notes,features:[...evidence.classFeatures,...evidence.specialistFeatures]};
 sheet.artificer=state;
 sheet.classFeaturesMd+='\n\n## Infusioni selezionate\n'+state.assignments.map(a=>`- ${a.title}: ${a.itemLabel} (${a.state})`).join('\n')+'\n\n'+state.known.map(i=>`### ${i.title}\n${i.body}\n${i.replicaBody??''}`).join('\n\n');
 return sheet;
}
