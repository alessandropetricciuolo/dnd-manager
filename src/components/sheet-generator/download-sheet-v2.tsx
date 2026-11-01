"use client";

import { useState } from "react";
import type { GeneratedCharacterSheet, SkillKey } from "@/lib/sheet-generator/types";
import { SKILL_LABELS } from "@/lib/sheet-generator/bard-print-model";
import { BARD_FIGHTING_STYLES, type BardFightingStyle } from "@/lib/sheet-generator/bard-colleges";

import { TOTEM_ANIMALS, STORM_ENVIRONMENTS, barbarianPathFromLabel, type BarbarianChoices } from '@/lib/sheet-generator/barbarian-paths';

import { CLERIC_SKILL_CHOICES, DRUID_CANTRIPS, clericDomainFromLabel, type ClericChoices } from '@/lib/sheet-generator/cleric-domains';
import { CLERIC_BONUS_LANGUAGES } from '@/lib/sheet-generator/cleric-print-model';
import { DRUID_LAND_TERRAINS, druidCircleFromLabel, type DruidChoices } from '@/lib/sheet-generator/druid-circles';
import {
  FIGHTER_FIGHTING_STYLES,
  ARCANE_ARCHER_CANTRIPS,
  ARCANE_ARCHER_SKILLS,
  CAVALIER_SKILLS,
  SAMURAI_SKILLS,
  fighterArchetypeFromLabel,
  type FighterChoices,
} from '@/lib/sheet-generator/fighter-archetypes';
import type { PhbFightingStyle } from '@/lib/sheet-generator/class-choice-catalog';
import {
  rogueArchetypeFromLabel,
  MASTERMIND_GAMING_SETS,
  type RogueChoices,
} from '@/lib/sheet-generator/rogue-archetypes';
import {
  wizardTraditionFromLabel,
  BLADESINGER_WEAPONS,
  type WizardChoices,
} from '@/lib/sheet-generator/wizard-traditions';
import {
  monkTraditionFromLabel,
  KENSEI_MELEE_WEAPONS,
  KENSEI_RANGED_WEAPONS,
  type MonkChoices,
} from '@/lib/sheet-generator/monk-traditions';
import {
  PALADIN_FIGHTING_STYLES,
  type PaladinChoices,
  type PaladinFightingStyle,
} from '@/lib/sheet-generator/paladin-oaths';

export function DownloadSheetV2({ sheet, input }: { sheet: GeneratedCharacterSheet; input: Record<string, string> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [bonusSkills, setBonusSkills] = useState<SkillKey[] | null>(null);
  const [fightingStyle,setFightingStyle]=useState<BardFightingStyle>('Duellare');
  const [barbarianChoices,setBarbarianChoices]=useState<BarbarianChoices>({});
  const [clericSkills,setClericSkills]=useState<SkillKey[]|null>(null);
  const [clericLanguages,setClericLanguages]=useState<string[]|null>(null);
  const [druidTerrain,setDruidTerrain]=useState<DruidChoices['landTerrain']>('Foresta');
  const [druidCantrip,setDruidCantrip]=useState<string|null>(null);
  const [fighterChoices, setFighterChoices] = useState<FighterChoices>({});
  const [rogueChoices, setRogueChoices] = useState<RogueChoices>({});
  const [wizardChoices, setWizardChoices] = useState<WizardChoices>({});
  const [monkChoices, setMonkChoices] = useState<MonkChoices>({});
  const [paladinChoices, setPaladinChoices] = useState<PaladinChoices>({});
  const fighterArchetype = sheet.classLabel === 'Guerriero' && sheet.level >= 3 ? fighterArchetypeFromLabel(sheet.classSubclass) : null;
  const rogueArchetype = sheet.classLabel === 'Ladro' && sheet.level >= 3 ? rogueArchetypeFromLabel(sheet.classSubclass) : null;
  const wizardTradition = sheet.classLabel === 'Mago' && sheet.level >= 2 ? wizardTraditionFromLabel(sheet.classSubclass) : null;
  const monkTradition = sheet.classLabel === 'Monaco' && sheet.level >= 3 ? monkTraditionFromLabel(sheet.classSubclass) : null;
  const isChampion10 = fighterArchetype?.slug === 'phb-guerriero-campione' && sheet.level >= 10;
  const fighterStyle = fighterChoices.fightingStyle ?? 'Duellare';
  const fighterSecondStyle = fighterChoices.secondFightingStyle ?? (fighterStyle === 'Difesa' ? 'Tiro' : 'Difesa');
  const domain=sheet.classLabel==='Chierico'?clericDomainFromLabel(sheet.classSubclass):null;
  const clericPool=domain?CLERIC_SKILL_CHOICES[domain.slug]:undefined;
  const knowledge=domain?.slug==='phb-chierico-conoscenza',nature=domain?.slug==='phb-chierico-natura';
  const clericCount=knowledge?2:1;
  const chosenClericSkills=clericSkills??[...(clericPool??[])].sort((a,b)=>Number(sheet.skills[a].proficient)-Number(sheet.skills[b].proficient)).slice(0,clericCount);
  const availableLanguages=CLERIC_BONUS_LANGUAGES.filter(l=>!sheet.languages.includes(l));
  const chosenLanguages=clericLanguages??availableLanguages.slice(0,2);
  const availableDruidCantrips=DRUID_CANTRIPS.filter(n=>!sheet.spells.some(s=>s.name.toLocaleLowerCase('it')===n.toLocaleLowerCase('it')));
  const chosenDruidCantrip=druidCantrip??availableDruidCantrips[0];
  const clericChoices:ClericChoices={...(clericPool?{skills:chosenClericSkills}:{}),...(knowledge?{languages:chosenLanguages}:{}),...(nature?{druidCantrip:chosenDruidCantrip}:{})};
  const invalidCleric=!!domain&&((!!clericPool&&chosenClericSkills.length!==clericCount)||(knowledge&&new Set(chosenLanguages).size!==2));
  const path=sheet.classLabel==='Barbaro'&&sheet.level>=3?barbarianPathFromLabel(sheet.classSubclass):null;
  const druidCircle=sheet.classLabel==='Druido'&&sheet.level>=2?druidCircleFromLabel(sheet.classSubclass):null;
  const availableLandCantrips=DRUID_CANTRIPS.filter(n=>!sheet.spells.some(s=>s.name.toLocaleLowerCase('it')===n.toLocaleLowerCase('it')));
  const swords=sheet.classLabel==='Bardo'&&sheet.level>=3&&/spade/i.test(sheet.classSubclass??'');
  const lore = sheet.classLabel==='Bardo' && sheet.level >= 3 && /sapienza/i.test(sheet.classSubclass ?? "");
  const available = (Object.keys(sheet.skills) as SkillKey[]).filter((k) => !sheet.skills[k].proficient);
  const chosen = bonusSkills ?? available.slice(0, 3);
  const pathChoices:BarbarianChoices={};
  if(path?.slug==='phb-barbaro-totemico'){
    pathChoices.totemSpirit=barbarianChoices.totemSpirit??'Orso';
    if(sheet.level>=6)pathChoices.totemAspect=barbarianChoices.totemAspect??'Orso';
    if(sheet.level>=14)pathChoices.totemAttunement=barbarianChoices.totemAttunement??'Orso';
  }
  if(path?.slug==='xge-barbaro-araldo-tempesta')pathChoices.storm=barbarianChoices.storm??'Deserto';
  if(path?.slug==='xge-barbaro-zelota')pathChoices.zealotDamage=barbarianChoices.zealotDamage??'Radiosi';


  const isFighter = sheet.classLabel === 'Guerriero';
  const isRogue = sheet.classLabel === 'Ladro';
  const isWizard = sheet.classLabel === 'Mago';
  const isMonk = sheet.classLabel === 'Monaco';
  const isPaladin = sheet.classLabel === 'Paladino';
  const finalFighterChoices: FighterChoices = {
    fightingStyle: fighterStyle as PhbFightingStyle,
    ...(isChampion10 ? { secondFightingStyle: fighterSecondStyle as PhbFightingStyle } : {}),
    ...fighterChoices,
  };

  async function download() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/sheet-pdf-v2", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input, bonusSkills: lore ? chosen : [], ...(swords?{fightingStyle}:{}), ...(path?{barbarianChoices:pathChoices}:{}),...(domain?{clericChoices}:{}),...(druidCircle?.slug==='phb-druido-terra'?{druidChoices:{landTerrain:druidTerrain??'Foresta',landCantrip:druidCantrip??availableLandCantrips[0]}}:{}), ...(isFighter?{fighterChoices:finalFighterChoices}:{}), ...(isRogue?{rogueChoices}:{}), ...(isWizard?{wizardChoices}:{}), ...(isMonk?{monkChoices}:{}), ...(isPaladin?{paladinChoices}:{}) }),
      });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error ?? "Esportazione non riuscita."); }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a"); link.href = url; link.download = `${sheet.characterName || "scheda"}-v2.pdf`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e) { setError(e instanceof Error ? e.message : "Errore esportazione."); }
    finally { setBusy(false); }
  }

  return <section className="my-5 space-y-3 rounded-lg border border-barber-gold/40 p-4" aria-label="Esportazione scheda V2">
    <h2 className="font-semibold text-barber-gold">Scheda fantasy V2</h2>
    {lore && <fieldset disabled={busy}>
      <legend className="mb-2 text-sm">Collegio della Sapienza: scegli tre competenze aggiuntive ({chosen.length}/3)</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{available.map((key) => <label key={key} className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={chosen.includes(key)} onChange={(e) => setBonusSkills(e.target.checked ? [...chosen, key] : chosen.filter((v) => v !== key))} disabled={!chosen.includes(key) && chosen.length >= 3} />
        {SKILL_LABELS[key]}
      </label>)}</div>
    </fieldset>}
    {swords&&<label className="block text-sm">Stile di combattimento
      <select className="mt-2 block w-full rounded border border-barber-gold/40 bg-barber-dark p-2" value={fightingStyle} disabled={busy} onChange={e=>setFightingStyle(e.target.value as BardFightingStyle)}>
        {BARD_FIGHTING_STYLES.map(style=><option key={style}>{style}</option>)}
      </select>
    </label>}
    {path && <fieldset disabled={busy} className="space-y-3">
      <legend className="text-sm">Scelte del cammino</legend>
      {([
        ...(path.slug==='phb-barbaro-totemico'?[['totemSpirit','Spirito Totemico (livello 3)',TOTEM_ANIMALS,'Orso'],...(sheet.level>=6?[['totemAspect','Aspetto della Bestia (livello 6)',TOTEM_ANIMALS,'Orso']]:[]),...(sheet.level>=14?[['totemAttunement','Sintonia Totemica (livello 14)',TOTEM_ANIMALS,'Orso']]:[])]:[]),
        ...(path.slug==='xge-barbaro-araldo-tempesta'?[['storm','Ambiente della tempesta',STORM_ENVIRONMENTS,'Deserto']]:[]),
        ...(path.slug==='xge-barbaro-zelota'?[['zealotDamage','Danni di Furia Divina',['Radiosi','Necrotici'],'Radiosi']]:[]),
      ] as Array<[keyof BarbarianChoices,string,readonly string[],string]>).map(([key,label,values,fallback])=><label key={key} className="block text-sm">{label}
        <select className="mt-2 block w-full rounded border border-barber-gold/40 bg-barber-dark p-2" value={barbarianChoices[key]??fallback} onChange={e=>setBarbarianChoices({...barbarianChoices,[key]:e.target.value})}>
          {values.map(value=><option key={value}>{value}</option>)}
        </select>
      </label>)}
      {path.slug==='tce-barbaro-bestia'&&<p className="text-sm">Le forme della Bestia si scelgono durante il gioco: la scheda riporta tutte le opzioni.</p>}
    </fieldset>}
    {domain && <fieldset disabled={busy} className="space-y-3">
      <legend className="text-sm">Dominio Divino: {domain.label}</legend>
      {clericPool&&<fieldset><legend className="mb-2 text-sm">Abilità del dominio: scegli {clericCount} ({chosenClericSkills.length}/{clericCount})</legend>
        <div className="grid grid-cols-2 gap-2">{clericPool.map(key=><label key={key} className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={chosenClericSkills.includes(key)} disabled={!chosenClericSkills.includes(key)&&chosenClericSkills.length>=clericCount} onChange={e=>setClericSkills(e.target.checked?[...chosenClericSkills,key]:chosenClericSkills.filter(s=>s!==key))}/>{SKILL_LABELS[key]}{knowledge?' (doppia competenza)':''}
        </label>)}</div>
      </fieldset>}
      {knowledge&&[0,1].map(i=><label key={i} className="block text-sm">Linguaggio aggiuntivo {i+1}
        <select className="mt-2 block w-full rounded border border-barber-gold/40 bg-barber-dark p-2" value={chosenLanguages[i]} onChange={e=>setClericLanguages(chosenLanguages.map((l,j)=>i===j?e.target.value:l))}>
          {availableLanguages.map(l=><option key={l} disabled={chosenLanguages[1-i]===l}>{l}</option>)}
        </select>
      </label>)}
      {nature&&<label className="block text-sm">Trucchetto aggiuntivo da druido
        <select className="mt-2 block w-full rounded border border-barber-gold/40 bg-barber-dark p-2" value={chosenDruidCantrip} onChange={e=>setDruidCantrip(e.target.value)}>
          {availableDruidCantrips.map(n=><option key={n}>{n}</option>)}
        </select>
      </label>}
      <p className="text-sm text-barber-paper/70">Gli incantesimi di dominio saranno aggiunti come sempre preparati, senza consumare le scelte giornaliere.</p>
    </fieldset>}
    {druidCircle?.slug==='phb-druido-terra'&&<label className="block text-sm">Terreno del Circolo della Terra
      <select className="mt-2 block w-full rounded border border-barber-gold/40 bg-barber-dark p-2" value={druidTerrain??'Foresta'} disabled={busy} onChange={e=>setDruidTerrain(e.target.value as DruidChoices['landTerrain'])}>
        {DRUID_LAND_TERRAINS.map(terrain=><option key={terrain}>{terrain}</option>)}
      </select>
    </label>}
    {druidCircle?.slug==='phb-druido-terra'&&<label className="block text-sm">Trucchetto aggiuntivo del Circolo della Terra
      <select className="mt-2 block w-full rounded border border-barber-gold/40 bg-barber-dark p-2" value={druidCantrip??availableLandCantrips[0]} disabled={busy||!availableLandCantrips.length} onChange={e=>setDruidCantrip(e.target.value)}>
        {availableLandCantrips.map(name=><option key={name}>{name}</option>)}
      </select>
    </label>}
    {isFighter && <fieldset disabled={busy} className="space-y-3">
      <legend className="text-sm font-medium text-barber-gold">Opzioni Guerriero</legend>
      <label className="block text-sm">Stile di combattimento
        <select className="mt-2 block w-full rounded border border-barber-gold/40 bg-barber-dark p-2" value={fighterStyle} onChange={e=>setFighterChoices({...fighterChoices, fightingStyle: e.target.value as PhbFightingStyle})}>
          {FIGHTER_FIGHTING_STYLES.map(style=><option key={style}>{style}</option>)}
        </select>
      </label>
      {isChampion10 && <label className="block text-sm">Stile di combattimento aggiuntivo (Campione 10°)
        <select className="mt-2 block w-full rounded border border-barber-gold/40 bg-barber-dark p-2" value={fighterSecondStyle} onChange={e=>setFighterChoices({...fighterChoices, secondFightingStyle: e.target.value as PhbFightingStyle})}>
          {FIGHTER_FIGHTING_STYLES.filter(s=>s!==fighterStyle).map(style=><option key={style}>{style}</option>)}
        </select>
      </label>}
      {fighterArchetype?.slug==='xge-guerriero-arciere-arcano' && <div className="space-y-3">
        <label className="block text-sm">Abilità delle Conoscenze dell’Arciere Arcano
          <select className="mt-2 block w-full rounded border border-barber-gold/40 bg-barber-dark p-2" value={fighterChoices.arcaneArcherSkill??'arcana'} onChange={e=>setFighterChoices({...fighterChoices, arcaneArcherSkill: e.target.value as 'arcana'|'nature'})}>
            {ARCANE_ARCHER_SKILLS.map(k=><option key={k} value={k}>{SKILL_LABELS[k]}</option>)}
          </select>
        </label>
        <label className="block text-sm">Trucchetto delle Conoscenze dell’Arciere Arcano
          <select className="mt-2 block w-full rounded border border-barber-gold/40 bg-barber-dark p-2" value={fighterChoices.arcaneArcherCantrip??'Prestidigitazione'} onChange={e=>setFighterChoices({...fighterChoices, arcaneArcherCantrip: e.target.value as typeof ARCANE_ARCHER_CANTRIPS[number]})}>
            {ARCANE_ARCHER_CANTRIPS.map(c=><option key={c}>{c}</option>)}
          </select>
        </label>
      </div>}
      {fighterArchetype?.slug==='xge-guerriero-cavaliere-errante' && <label className="block text-sm">Competenza bonus (Cavaliere Errante)
        <select className="mt-2 block w-full rounded border border-barber-gold/40 bg-barber-dark p-2" value={fighterChoices.cavalierSkill??'animal_handling'} onChange={e=>setFighterChoices({...fighterChoices, cavalierSkill: e.target.value as SkillKey})}>
          {CAVALIER_SKILLS.map(k=><option key={k} value={k}>{SKILL_LABELS[k]}</option>)}
        </select>
      </label>}
      {fighterArchetype?.slug==='xge-guerriero-samurai' && <div className="space-y-3">
        <label className="block text-sm">Competenza bonus (Samurai)
          <select className="mt-2 block w-full rounded border border-barber-gold/40 bg-barber-dark p-2" value={fighterChoices.samuraiSkill??'history'} onChange={e=>setFighterChoices({...fighterChoices, samuraiSkill: e.target.value as SkillKey})}>
            {SAMURAI_SKILLS.map(k=><option key={k} value={k}>{SKILL_LABELS[k]}</option>)}
          </select>
        </label>
        {sheet.level>=7 && sheet.savingThrows.wis.proficient && <label className="block text-sm">Tiro salvezza aggiuntivo (Cortigiano Elegante)
          <select className="mt-2 block w-full rounded border border-barber-gold/40 bg-barber-dark p-2" value={fighterChoices.samuraiSave??'int'} onChange={e=>setFighterChoices({...fighterChoices, samuraiSave: e.target.value as 'int'|'cha'})}>
            <option value="int">Intelligenza</option>
            <option value="cha">Carisma</option>
          </select>
        </label>}
      </div>}
    </fieldset>}
    {isRogue && rogueArchetype && <fieldset disabled={busy} className="space-y-3">
      <legend className="text-sm font-medium text-barber-gold">Archetipo Ladresco: {rogueArchetype.label}</legend>
      {rogueArchetype.slug === 'xge-ladro-pianificatore' && <label className="block text-sm">Competenza set di gioco (Maestro di Intrighi)
        <select className="mt-2 block w-full rounded border border-barber-gold/40 bg-barber-dark p-2" value={rogueChoices.mastermindGamingSet ?? 'Set di dadi'} onChange={e => setRogueChoices({ ...rogueChoices, mastermindGamingSet: e.target.value as typeof MASTERMIND_GAMING_SETS[number] })}>
          {MASTERMIND_GAMING_SETS.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      </label>}
      {rogueArchetype.slug === 'tce-ladro-fantasma' && available.length > 0 && <label className="block text-sm">Competenza temporanea (Sussurri dei Morti)
        <select className="mt-2 block w-full rounded border border-barber-gold/40 bg-barber-dark p-2" value={rogueChoices.phantomWhispersSkill ?? available[0]} onChange={e => setRogueChoices({ ...rogueChoices, phantomWhispersSkill: e.target.value as SkillKey })}>
          {available.map(k => <option key={k} value={k}>{SKILL_LABELS[k]}</option>)}
        </select>
      </label>}
    </fieldset>}
    {isWizard && wizardTradition && wizardTradition.slug === 'tce-mago-canto-lama' && <fieldset disabled={busy} className="space-y-3">
      <legend className="text-sm font-medium text-barber-gold">Tradizione Arcana: {wizardTradition.label}</legend>
      <label className="block text-sm">Arma da mischia ad una mano (Arte della Guerra e del Canto)
        <select className="mt-2 block w-full rounded border border-barber-gold/40 bg-barber-dark p-2" value={wizardChoices.bladesingerWeapon ?? 'Stocco'} onChange={e => setWizardChoices({ ...wizardChoices, bladesingerWeapon: e.target.value })}>
          {BLADESINGER_WEAPONS.map(w => <option key={w} value={w}>{w}</option>)}
        </select>
      </label>
    </fieldset>}
    {isMonk && monkTradition && monkTradition.slug === 'xge-monaco-kensei' && <fieldset disabled={busy} className="space-y-3">
      <legend className="text-sm font-medium text-barber-gold">Tradizione Monastica: {monkTradition.label}</legend>
      <label className="block text-sm">Arma Kensei da mischia
        <select className="mt-2 block w-full rounded border border-barber-gold/40 bg-barber-dark p-2" value={monkChoices.kenseiMeleeWeapon ?? 'Spada lunga'} onChange={e => setMonkChoices({ ...monkChoices, kenseiMeleeWeapon: e.target.value })}>
          {KENSEI_MELEE_WEAPONS.map(w => <option key={w} value={w}>{w}</option>)}
        </select>
      </label>
      <label className="block text-sm">Arma Kensei a distanza
        <select className="mt-2 block w-full rounded border border-barber-gold/40 bg-barber-dark p-2" value={monkChoices.kenseiRangedWeapon ?? 'Arco lungo'} onChange={e => setMonkChoices({ ...monkChoices, kenseiRangedWeapon: e.target.value })}>
          {KENSEI_RANGED_WEAPONS.map(w => <option key={w} value={w}>{w}</option>)}
        </select>
      </label>
    </fieldset>}
    {isPaladin && sheet.level >= 2 && <fieldset disabled={busy} className="space-y-3">
      <legend className="text-sm font-medium text-barber-gold">Stile di Combattimento del Paladino</legend>
      <label className="block text-sm">Scegli lo stile di combattimento
        <select className="mt-2 block w-full rounded border border-barber-gold/40 bg-barber-dark p-2" value={paladinChoices.fightingStyle ?? 'Difesa'} onChange={e => setPaladinChoices({ ...paladinChoices, fightingStyle: e.target.value as PaladinFightingStyle })}>
          {PALADIN_FIGHTING_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>
    </fieldset>}
    <p className="text-sm text-barber-paper/70">PDF completo con risorse, capacità del livello attuale, dotazione e tabella degli incantesimi.</p>
    <button type="button" onClick={download} disabled={busy || invalidCleric || (lore && chosen.length !== 3)} className="rounded-md bg-barber-red px-5 py-3 text-sm font-medium text-barber-paper disabled:opacity-60">
      {busy ? "Preparazione della scheda V2…" : "Genera scheda V2"}
    </button>
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
  </section>;
}
