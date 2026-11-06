"use client";

import { useState, useMemo } from "react";
import type { GeneratedCharacterSheet, SkillKey } from "@/lib/sheet-generator/types";
import type { CharacterBuildOverrides } from "@/lib/sheet-generator/build-choices-types";
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
  ARCANE_SHOT_OPTIONS,
  BATTLE_MASTER_MANEUVERS,
  RUNE_KNIGHT_RUNES,
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
import {
  RANGER_FIGHTING_STYLES,
  RANGER_BEAST_COMPANIONS,
  rangerArchetypeFromLabel,
  type RangerChoices,
  type RangerFightingStyle,
  type RangerBeastCompanion,
} from '@/lib/sheet-generator/ranger-archetypes';
import {
  sorcererOriginFromLabel,
  SORCERER_METAMAGIC_OPTIONS,
  DRACONIC_ANCESTRIES,
  metamagicCountForLevel,
  type SorcererChoices,
} from '@/lib/sheet-generator/sorcerer-origins';
import {
  warlockPatronFromLabel,
  WARLOCK_PACT_BOONS,
  GENIE_KINDS,
  type WarlockChoices,
  type WarlockPactBoon,
  type GenieKind,
} from '@/lib/sheet-generator/warlock-patrons';

export function DownloadSheetV2({
  sheet,
  input,
  onSaveToCharacter,
}: {
  sheet: GeneratedCharacterSheet;
  input: Record<string, string>;
  onSaveToCharacter?: (v2Payload: Record<string, unknown>) => Promise<void>;
}) {
  const overrides = useMemo<CharacterBuildOverrides>(() => {
    try {
      return input.buildOverridesJson ? JSON.parse(input.buildOverridesJson) : {};
    } catch {
      return {};
    }
  }, [input.buildOverridesJson]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [bonusSkills, setBonusSkills] = useState<SkillKey[] | null>(
    overrides.bonusSkills ?? overrides.bardBonusSkills ?? null
  );
  const [fightingStyle, setFightingStyle] = useState<BardFightingStyle>(
    (overrides.fightingStyle as BardFightingStyle) ?? 'Duellare'
  );
  const [barbarianChoices, setBarbarianChoices] = useState<BarbarianChoices>(overrides.barbarian ?? {});
  const [clericSkills, setClericSkills] = useState<SkillKey[] | null>(overrides.cleric?.skills ?? null);
  const [clericLanguages, setClericLanguages] = useState<string[] | null>(overrides.cleric?.languages ?? null);
  const [druidTerrain, setDruidTerrain] = useState<DruidChoices['landTerrain']>(
    overrides.druid?.landTerrain ?? 'Foresta'
  );
  const [druidCantrip, setDruidCantrip] = useState<string | null>(overrides.druid?.landCantrip ?? null);
  const [fighterChoices, setFighterChoices] = useState<FighterChoices>({
    ...(overrides.fightingStyle ? { fightingStyle: overrides.fightingStyle as PhbFightingStyle } : {}),
    ...(overrides.secondFightingStyle
      ? { secondFightingStyle: overrides.secondFightingStyle as PhbFightingStyle }
      : {}),
    ...overrides.fighter,
  });
  const [rogueChoices, setRogueChoices] = useState<RogueChoices>(overrides.rogue ?? {});
  const [wizardChoices, setWizardChoices] = useState<WizardChoices>(overrides.wizard ?? {});
  const [monkChoices, setMonkChoices] = useState<MonkChoices>(overrides.monk ?? {});
  const [paladinChoices, setPaladinChoices] = useState<PaladinChoices>({
    ...(overrides.fightingStyle ? { fightingStyle: overrides.fightingStyle as PaladinFightingStyle } : {}),
    ...overrides.paladin,
  });
  const [rangerChoices, setRangerChoices] = useState<RangerChoices>({
    ...(overrides.fightingStyle ? { fightingStyle: overrides.fightingStyle as RangerFightingStyle } : {}),
    ...overrides.ranger,
  });
  const [sorcererChoices, setSorcererChoices] = useState<SorcererChoices>(overrides.sorcerer ?? {});
  const [warlockChoices, setWarlockChoices] = useState<WarlockChoices>({
    pactBoon: (overrides.warlockPact as WarlockPactBoon) ?? 'Patto del Tomo',
    ...(overrides.warlockInvocations ? { invocations: overrides.warlockInvocations } : {}),
    genieKind: 'Dao',
    hexbladeWeapon: 'Spada lunga',
    ...overrides.warlock,
  });
  const fighterArchetype = sheet.classLabel === 'Guerriero' && sheet.level >= 3 ? fighterArchetypeFromLabel(sheet.classSubclass) : null;
  const rogueArchetype = sheet.classLabel === 'Ladro' && sheet.level >= 3 ? rogueArchetypeFromLabel(sheet.classSubclass) : null;
  const wizardTradition = sheet.classLabel === 'Mago' && sheet.level >= 2 ? wizardTraditionFromLabel(sheet.classSubclass) : null;
  const monkTradition = sheet.classLabel === 'Monaco' && sheet.level >= 3 ? monkTraditionFromLabel(sheet.classSubclass) : null;
  const isChampion10 = fighterArchetype?.slug === 'phb-guerriero-campione' && sheet.level >= 10;
  const fighterStyle = fighterChoices.fightingStyle ?? (overrides.fightingStyle as PhbFightingStyle) ?? 'Duellare';
  const fighterSecondStyle =
    fighterChoices.secondFightingStyle ??
    (overrides.secondFightingStyle as PhbFightingStyle) ??
    (fighterStyle === 'Difesa' ? 'Tiro' : 'Difesa');
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
  const isRanger = sheet.classLabel === 'Ranger';
  const isSorcerer = sheet.classLabel === 'Stregone';
  const sorcererOrigin = isSorcerer ? sorcererOriginFromLabel(sheet.classSubclass) : null;
  const metamagicCount = isSorcerer ? metamagicCountForLevel(sheet.level) : 0;
  const defaultMetamagics = metamagicCount > 0 ? SORCERER_METAMAGIC_OPTIONS.slice(0, metamagicCount).map((m) => m.name) : [];
  const chosenMetamagic: string[] = sorcererChoices.metamagic ?? overrides.sorcerer?.metamagic ?? defaultMetamagics;
  const isWarlock = sheet.classLabel === 'Warlock';
  const warlockPatron = isWarlock ? warlockPatronFromLabel(sheet.classSubclass) : null;

  const bmManeuverCount = sheet.level >= 15 ? 9 : sheet.level >= 10 ? 7 : sheet.level >= 7 ? 5 : 3;
  const chosenManeuvers: string[] = fighterChoices.maneuvers ?? overrides.fighter?.maneuvers ?? [...BATTLE_MASTER_MANEUVERS.slice(0, bmManeuverCount)];

  const runeCount = sheet.level >= 15 ? 5 : sheet.level >= 10 ? 4 : sheet.level >= 7 ? 3 : 2;
  const chosenRunes: string[] = fighterChoices.runes ?? overrides.fighter?.runes ?? [...RUNE_KNIGHT_RUNES.filter(r => !r.includes('Colline') || sheet.level >= 7).slice(0, runeCount)];

  const arcaneShotCount = sheet.level >= 18 ? 6 : sheet.level >= 15 ? 5 : sheet.level >= 10 ? 4 : sheet.level >= 7 ? 3 : 2;
  const chosenShots: string[] = fighterChoices.arcaneShots ?? overrides.fighter?.arcaneShots ?? [...ARCANE_SHOT_OPTIONS.slice(0, arcaneShotCount)];

  const finalFighterChoices: FighterChoices = {
    ...fighterChoices,
    fightingStyle: fighterStyle as PhbFightingStyle,
    ...(isChampion10 ? { secondFightingStyle: fighterSecondStyle as PhbFightingStyle } : {}),
  };

  const finalPaladinChoices: PaladinChoices = {
    ...paladinChoices,
    fightingStyle: (paladinChoices.fightingStyle ?? (overrides.fightingStyle as PaladinFightingStyle) ?? 'Difesa'),
  };

  const finalRangerChoices: RangerChoices = {
    ...rangerChoices,
    fightingStyle: (rangerChoices.fightingStyle ?? (overrides.fightingStyle as RangerFightingStyle) ?? 'Tiro'),
  };

  const finalSorcererChoices: SorcererChoices = {
    ...sorcererChoices,
    ...(metamagicCount > 0 ? { metamagic: chosenMetamagic } : {}),
  };

  function getV2Payload() {
    return {
      input,
      bonusSkills: lore ? chosen : [],
      ...(swords ? { fightingStyle: fightingStyle ?? (overrides.fightingStyle as BardFightingStyle) ?? 'Duellare' } : {}),
      ...(path ? { barbarianChoices: pathChoices } : {}),
      ...(domain ? { clericChoices } : {}),
      ...(druidCircle?.slug === 'phb-druido-terra'
        ? { druidChoices: { landTerrain: druidTerrain ?? 'Foresta', landCantrip: druidCantrip ?? availableLandCantrips[0] } }
        : {}),
      ...(isFighter ? { fighterChoices: finalFighterChoices } : {}),
      ...(isRogue ? { rogueChoices } : {}),
      ...(isWizard ? { wizardChoices } : {}),
      ...(isMonk ? { monkChoices } : {}),
      ...(isPaladin ? { paladinChoices: finalPaladinChoices } : {}),
      ...(isRanger ? { rangerChoices: finalRangerChoices } : {}),
      ...(isSorcerer ? { sorcererChoices: finalSorcererChoices } : {}),
      ...(isWarlock ? { warlockChoices } : {}),
    };
  }

  async function download() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/sheet-pdf-v2", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(getV2Payload()),
      });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error ?? "Esportazione non riuscita."); }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a"); link.href = url; link.download = `${sheet.characterName || "scheda"}-v2.pdf`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e) { setError(e instanceof Error ? e.message : "Errore esportazione."); }
    finally { setBusy(false); }
  }

  async function handleSaveToCharacter() {
    if (!onSaveToCharacter) return;
    setBusy(true);
    setError("");
    try {
      await onSaveToCharacter(getV2Payload());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore salvataggio scheda.");
    } finally {
      setBusy(false);
    }
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
      <label className="block text-sm" htmlFor="v2-fighter-fighting-style">Stile di combattimento
        <select id="v2-fighter-fighting-style" name="fighterFightingStyle" className="mt-2 block w-full rounded border border-barber-gold/40 bg-barber-dark p-2" value={fighterStyle} onChange={e=>setFighterChoices({...fighterChoices, fightingStyle: e.target.value as PhbFightingStyle})}>
          {FIGHTER_FIGHTING_STYLES.map(style=><option key={style}>{style}</option>)}
        </select>
      </label>
      {isChampion10 && <label className="block text-sm" htmlFor="v2-fighter-second-fighting-style">Stile di combattimento aggiuntivo (Campione 10°)
        <select id="v2-fighter-second-fighting-style" name="fighterSecondFightingStyle" className="mt-2 block w-full rounded border border-barber-gold/40 bg-barber-dark p-2" value={fighterSecondStyle} onChange={e=>setFighterChoices({...fighterChoices, secondFightingStyle: e.target.value as PhbFightingStyle})}>
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
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-barber-gold">Opzioni di Tiro Arcano: scegli {arcaneShotCount} ({chosenShots.length}/{arcaneShotCount})</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {ARCANE_SHOT_OPTIONS.map((shot) => (
              <label key={shot} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={chosenShots.includes(shot)}
                  disabled={!chosenShots.includes(shot) && chosenShots.length >= arcaneShotCount}
                  onChange={(e) => {
                    const next = e.target.checked ? [...chosenShots, shot] : chosenShots.filter((s: string) => s !== shot);
                    setFighterChoices({ ...fighterChoices, arcaneShots: next });
                  }}
                />
                {shot}
              </label>
            ))}
          </div>
        </fieldset>
      </div>}
      {fighterArchetype?.slug==='phb-guerriero-maestro-battaglia' && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-barber-gold">Manovre: scegli {bmManeuverCount} ({chosenManeuvers.length}/{bmManeuverCount})</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {BATTLE_MASTER_MANEUVERS.map((man) => (
              <label key={man} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={chosenManeuvers.includes(man)}
                  disabled={!chosenManeuvers.includes(man) && chosenManeuvers.length >= bmManeuverCount}
                  onChange={(e) => {
                    const next = e.target.checked ? [...chosenManeuvers, man] : chosenManeuvers.filter((m: string) => m !== man);
                    setFighterChoices({ ...fighterChoices, maneuvers: next });
                  }}
                />
                {man}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {fighterArchetype?.slug==='tce-guerriero-runico' && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-barber-gold">Rune da incidere: scegli {runeCount} ({chosenRunes.length}/{runeCount})</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {RUNE_KNIGHT_RUNES.filter(r => !r.includes('Colline') || sheet.level >= 7).map((rune) => (
              <label key={rune} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={chosenRunes.includes(rune)}
                  disabled={!chosenRunes.includes(rune) && chosenRunes.length >= runeCount}
                  onChange={(e) => {
                    const next = e.target.checked ? [...chosenRunes, rune] : chosenRunes.filter((r: string) => r !== rune);
                    setFighterChoices({ ...fighterChoices, runes: next });
                  }}
                />
                {rune}
              </label>
            ))}
          </div>
        </fieldset>
      )}
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
    {isRanger && sheet.level >= 2 && <fieldset disabled={busy} className="space-y-3">
      <legend className="text-sm font-medium text-barber-gold">Opzioni del Ranger</legend>
      <label className="block text-sm">Scegli lo stile di combattimento
        <select className="mt-2 block w-full rounded border border-barber-gold/40 bg-barber-dark p-2" value={rangerChoices.fightingStyle ?? 'Tiro'} onChange={e => setRangerChoices({ ...rangerChoices, fightingStyle: e.target.value as RangerFightingStyle })}>
          {RANGER_FIGHTING_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>
      {sheet.level >= 3 && rangerArchetypeFromLabel(sheet.classSubclass)?.slug === 'phb-ranger-signore-bestie' && <label className="block text-sm">Compagno del Signore delle Bestie (PHB Appendice D / Tasha)
        <select className="mt-2 block w-full rounded border border-barber-gold/40 bg-barber-dark p-2" value={rangerChoices.beastCompanion ?? 'Lupo'} onChange={e => setRangerChoices({ ...rangerChoices, beastCompanion: e.target.value as RangerBeastCompanion })}>
          {RANGER_BEAST_COMPANIONS.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
      </label>}
      {sheet.level >= 3 && rangerArchetypeFromLabel(sheet.classSubclass)?.slug === 'phb-ranger-cacciatore' && (
        <label className="block text-sm">Preda del Cacciatore (3° livello)
          <select
            className="mt-2 block w-full rounded border border-barber-gold/40 bg-barber-dark p-2"
            value={rangerChoices.hunterPrey ?? 'Sterminatore di Colossi'}
            onChange={(e) => setRangerChoices({ ...rangerChoices, hunterPrey: e.target.value as any })}
          >
            {["Devastatore dell'Orda", 'Sterminatore di Colossi', 'Uccisore di Giganti'].map((hp) => (
              <option key={hp} value={hp}>{hp}</option>
            ))}
          </select>
        </label>
      )}
    </fieldset>}
    {isSorcerer && <fieldset disabled={busy} className="space-y-3">
      <legend className="text-sm font-medium text-barber-gold">Opzioni dello Stregone</legend>
      {sheet.level >= 3 && metamagicCount > 0 && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-barber-gold">Metamagia: scegli {metamagicCount} opzioni ({chosenMetamagic.length}/{metamagicCount})</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {SORCERER_METAMAGIC_OPTIONS.map((mm) => (
              <label key={mm.name} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={chosenMetamagic.includes(mm.name)}
                  disabled={!chosenMetamagic.includes(mm.name) && chosenMetamagic.length >= metamagicCount}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...chosenMetamagic, mm.name]
                      : chosenMetamagic.filter((m: string) => m !== mm.name);
                    setSorcererChoices({ ...sorcererChoices, metamagic: next });
                  }}
                />
                {mm.name} ({mm.cost})
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {sorcererOrigin?.slug === 'phb-stregone-draconico' && <label className="block text-sm">Antenato Draconico
        <select className="mt-2 block w-full rounded border border-barber-gold/40 bg-barber-dark p-2" value={sorcererChoices.draconicAncestry ?? 'Rosso'} onChange={e => setSorcererChoices({ ...sorcererChoices, draconicAncestry: e.target.value })}>
          {Object.keys(DRACONIC_ANCESTRIES).map(name => <option key={name} value={name}>{name} ({DRACONIC_ANCESTRIES[name].damageType})</option>)}
        </select>
      </label>}
      {sorcererOrigin?.slug === 'xge-stregone-anima-divina' && <label className="block text-sm">Affinità Divina
        <select className="mt-2 block w-full rounded border border-barber-gold/40 bg-barber-dark p-2" value={sorcererChoices.divineAffinity ?? 'Bene'} onChange={e => setSorcererChoices({ ...sorcererChoices, divineAffinity: e.target.value as any })}>
          {['Bene', 'Male', 'Legge', 'Caos', 'Neutralità'].map(aff => <option key={aff} value={aff}>{aff}</option>)}
        </select>
      </label>}
    </fieldset>}
    {isWarlock && <fieldset disabled={busy} className="space-y-3">
      <legend className="text-sm font-medium text-barber-gold">Opzioni del Warlock</legend>
      {sheet.level >= 3 && <label className="block text-sm">Dono del Patto (3° livello)
        <select className="mt-2 block w-full rounded border border-barber-gold/40 bg-barber-dark p-2" value={warlockChoices.pactBoon ?? 'Patto del Tomo'} onChange={e => setWarlockChoices({ ...warlockChoices, pactBoon: e.target.value as WarlockPactBoon })}>
          {WARLOCK_PACT_BOONS.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
      </label>}
      {warlockPatron?.slug === 'tce-warlock-genio' && <label className="block text-sm">Tipo di Genio
        <select className="mt-2 block w-full rounded border border-barber-gold/40 bg-barber-dark p-2" value={warlockChoices.genieKind ?? 'Dao'} onChange={e => setWarlockChoices({ ...warlockChoices, genieKind: e.target.value as GenieKind })}>
          {GENIE_KINDS.map(k => <option key={k} value={k}>{k}</option>)}
        </select>
      </label>}
      {warlockPatron?.slug === 'xge-warlock-lama-sortilegio' && <label className="block text-sm">Arma del Sortilegio (usa Carisma per TpC e danni)
        <input className="mt-2 block w-full rounded border border-barber-gold/40 bg-barber-dark p-2" value={warlockChoices.hexbladeWeapon ?? 'Spada lunga'} onChange={e => setWarlockChoices({ ...warlockChoices, hexbladeWeapon: e.target.value })} placeholder="Es. Spada lunga, Stocco, Pugnale" />
      </label>}
    </fieldset>}
    <p className="text-sm text-barber-paper/70">PDF completo con risorse, capacità del livello attuale, dotazione e tabella degli incantesimi.</p>
    <div className="flex flex-wrap items-center gap-3 pt-2">
      <button
        type="button"
        id="v2-download-button"
        aria-label="Genera scheda V2"
        onClick={download}
        disabled={busy || invalidCleric || (lore && chosen.length !== 3)}
        className="rounded-md bg-barber-red px-5 py-3 text-sm font-medium text-barber-paper hover:bg-barber-red/90 disabled:opacity-60"
      >
        {busy ? "Preparazione della scheda V2…" : "Scarica scheda V2 (PDF)"}
      </button>
      {onSaveToCharacter && (
        <button
          type="button"
          id="v2-save-to-character-button"
          onClick={handleSaveToCharacter}
          disabled={busy || invalidCleric || (lore && chosen.length !== 3)}
          className="rounded-md border border-barber-gold/50 bg-barber-dark/80 px-5 py-3 text-sm font-medium text-barber-gold hover:bg-barber-gold/10 disabled:opacity-60"
        >
          {busy ? "Salvataggio..." : "Salva nella scheda del personaggio"}
        </button>
      )}
    </div>
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
  </section>;
}
