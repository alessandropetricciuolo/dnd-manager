import type {
  BuildChoiceSlot,
  CharacterBuildOverrides,
} from "@/lib/sheet-generator/build-choices-types";
import { filterWarlockInvocationsForLevel } from "@/lib/sheet-generator/class-choice-catalog";
import type { SkillKey } from "@/lib/sheet-generator/types";

export function overridesFromSlots(slots: BuildChoiceSlot[]): CharacterBuildOverrides {
  const overrides: CharacterBuildOverrides = {};
  const skills: SkillKey[] = [];
  const expertise: SkillKey[] = [];
  const cantrips: string[] = [];
  const spells: string[] = [];
  const invocations: string[] = [];
  const enemies: string[] = [];
  const terrains: string[] = [];

  for (const s of slots) {
    if (!s.value) continue;
    if (s.id.startsWith("skill-")) skills.push(s.value as SkillKey);
    else if (s.id.startsWith("expertise-") && s.value) expertise.push(s.value as SkillKey);
    else if (s.id.startsWith("cantrip-")) cantrips.push(s.value);
    else if (s.id.startsWith("spell-")) spells.push(s.value);
    else if (s.id === "racial-cantrip") overrides.racialCantrip = s.value;
    else if (s.id === "fighting-style") overrides.fightingStyle = s.value;
    else if (s.id === "second-fighting-style") overrides.secondFightingStyle = s.value;
    else if (s.id === "warlock-pact") overrides.warlockPact = s.value;
    else if (s.id.startsWith("invocation-")) invocations.push(s.value);
    else if (s.id.startsWith("favored-enemy-")) enemies.push(s.value);
    else if (s.id.startsWith("favored-terrain-")) terrains.push(s.value);
  }

  if(slots.some(s=>s.id.startsWith('artificer-'))){
    const value=(id:string)=>slots.find(s=>s.id===id)?.value;
    overrides.artificer={
      known:slots.filter(s=>s.id.startsWith('artificer-known-')).map(s=>s.value),
      assignments:slots.filter(s=>s.id.startsWith('artificer-active-')&&s.value).map(s=>{const [infusionId,itemId]=s.value.split('::'),n=s.id.replace('artificer-active-','');return {infusionId,itemId,state:value('artificer-state-'+n) as import('./artificer-types').ArtificerAssignment['state'],...(infusionId==='resistant'?{resistance:value('artificer-resistance-'+n)}:{})};}),
      armor:value('artificer-armor') as import('./artificer-types').ArtificerChoices['armor'],shield:value('artificer-shield')==='yes',
      ...(value('artificer-model')?{armorModel:value('artificer-model') as 'Guardiano'|'Infiltrato'}:{}),
    };
  }
  if (skills.length) overrides.classSkills = skills;
  if (expertise.length) overrides.expertiseSkills = expertise;
  if (cantrips.length) overrides.cantrips = cantrips;
  if (spells.length) overrides.spells = spells;
  if (invocations.length) overrides.warlockInvocations = invocations;
  if (enemies.length) overrides.favoredEnemies = enemies;
  if (terrains.length) overrides.favoredTerrains = terrains;
  return overrides;
}

/** Applica override utente agli slot (es. cambio patto → filtra suppliche). */
export function applySlotChange(
  slots: BuildChoiceSlot[],
  slotId: string,
  newValue: string,
  level: number
): BuildChoiceSlot[] {
  const next = slots.map((s) => {
    if(s.id===slotId)return {...s,value:newValue};
    if(slotId.startsWith('artificer-active-')&&s.id.startsWith('artificer-active-')&&newValue){const [inf,item]=newValue.split('::'),[otherInf,otherItem]=s.value.split('::');if(inf===otherInf||item===otherItem)return {...s,value:''};}
    return s;
  });

  if (slotId === "warlock-pact") {
    const invOptions = filterWarlockInvocationsForLevel(level, newValue).map((o) => ({
      value: o.name,
      label: o.name,
      meta: o.summary,
    }));
    return next.map((s) => {
      if (s.id.startsWith("invocation-")) {
        const stillValid = invOptions.some((o) => o.value === s.value);
        return {
          ...s,
          options: invOptions,
          value: stillValid ? s.value : invOptions[0]?.value ?? "",
        };
      }
      return s;
    });
  }

  if(slotId.startsWith('artificer-')){
    const known=new Set(next.filter(s=>s.id.startsWith('artificer-known-')).map(s=>s.value));
    return next.map(s=>{
      if(s.id.startsWith('artificer-active-')){const options=s.options.map(o=>({...o,disabled:o.requiresInfusion?!known.has(o.requiresInfusion):false}));const current=options.find(o=>o.value===s.value);return {...s,options,value:current&&!current.disabled?s.value:''};}
      if(s.id.startsWith('artificer-state-')&&slotId.startsWith('artificer-active-')&&s.id.replace('artificer-state-','')===slotId.replace('artificer-active-','')){const chosen=next.find(v=>v.id===slotId)?.options.find(o=>o.value===newValue);return {...s,value:chosen?.requiresAttunement?'attuned':'self'};}
      return s;
    });
  }
  return next;
}

export function slotsToOverrides(slots: BuildChoiceSlot[]): CharacterBuildOverrides {
  return overridesFromSlots(slots);
}
