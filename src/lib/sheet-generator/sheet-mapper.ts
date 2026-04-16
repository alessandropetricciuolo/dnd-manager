import type { GeneratedCharacterSheet, SkillKey } from "@/lib/sheet-generator/types";

function fmt(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

const SKILL_TO_FIELD: Record<SkillKey, string> = {
  acrobatics: "ACRO",
  animal_handling: "ANIM",
  arcana: "ARC",
  athletics: "ATH",
  deception: "DEC",
  history: "HIST",
  insight: "INS",
  intimidation: "INTI",
  investigation: "INV",
  medicine: "MED",
  nature: "NAT",
  perception: "PERC",
  performance: "PERF",
  persuasion: "PERS",
  religion: "REL",
  sleight_of_hand: "SLE",
  stealth: "STLTH",
  survival: "SURV",
};

export function mapGeneratedSheetToPdfFields(sheet: GeneratedCharacterSheet): Record<string, unknown> {
  const fields: Record<string, unknown> = {
    ClassFilename: "Base",
    CharacterName: sheet.characterName,
    Race: sheet.subraceLabel ? `${sheet.raceLabel} (${sheet.subraceLabel})` : sheet.raceLabel,
    ClassLevel: `${sheet.classLabel} ${sheet.level}`.trim(),
    Subclass: sheet.classSubclass ?? "",
    Background: sheet.backgroundLabel,
    Alignment: sheet.alignment ?? "",
    Age: sheet.age ?? "",
    Height: sheet.height ?? "",
    Weight: sheet.weight ?? "",
    Sex: sheet.sex ?? "",
    STR: String(sheet.abilities.str),
    STRmod: fmt(sheet.abilityMods.str),
    DEX: String(sheet.abilities.dex),
    DEXmod: fmt(sheet.abilityMods.dex),
    CON: String(sheet.abilities.con),
    CONmod: fmt(sheet.abilityMods.con),
    INT: String(sheet.abilities.int),
    INTmod: fmt(sheet.abilityMods.int),
    WIS: String(sheet.abilities.wis),
    WISmod: fmt(sheet.abilityMods.wis),
    CHA: String(sheet.abilities.cha),
    CHAmod: fmt(sheet.abilityMods.cha),
    ProfBonus: fmt(sheet.proficiencyBonus),
    Passive: String(sheet.passivePerception),
    AC: String(sheet.armorClass),
    Initiative: fmt(sheet.initiative),
    Speed: sheet.speed,
    HPMax: String(sheet.hpMax),
    HD_Value: sheet.hitDie,
    HD_Total: String(sheet.hitDiceTotal),
    ST_STR: fmt(sheet.savingThrows.str.value),
    ST_STR_Prof: sheet.savingThrows.str.proficient ? "x" : "",
    ST_DEX: fmt(sheet.savingThrows.dex.value),
    ST_DEX_Prof: sheet.savingThrows.dex.proficient ? "x" : "",
    ST_CON: fmt(sheet.savingThrows.con.value),
    ST_CON_Prof: sheet.savingThrows.con.proficient ? "x" : "",
    ST_INT: fmt(sheet.savingThrows.int.value),
    ST_INT_Prof: sheet.savingThrows.int.proficient ? "x" : "",
    ST_WIS: fmt(sheet.savingThrows.wis.value),
    ST_WIS_Prof: sheet.savingThrows.wis.proficient ? "x" : "",
    ST_CHA: fmt(sheet.savingThrows.cha.value),
    ST_CHA_Prof: sheet.savingThrows.cha.proficient ? "x" : "",
    Features_Main: [sheet.classFeaturesMd, sheet.subclassFeaturesMd].filter(Boolean).join("\n\n"),
    Feat_Racial: [sheet.raceTraitsMd, sheet.subraceTraitsMd].filter(Boolean).join("\n\n"),
    Inventory: sheet.inventory.join("\n"),
    Languages: sheet.languages.join(", "),
    SpellcastingClass: sheet.spellcastingClass ?? "",
    SpellcastingAbility: sheet.spellcastingAbility?.toUpperCase() ?? "",
    SpellSaveDC: sheet.spellSaveDc != null ? String(sheet.spellSaveDc) : "",
    SpellAtkBonus: sheet.spellAttackBonus != null ? fmt(sheet.spellAttackBonus) : "",
  };

  for (const [skill, prefix] of Object.entries(SKILL_TO_FIELD) as Array<[SkillKey, string]>) {
    fields[prefix] = fmt(sheet.skills[skill].value);
    fields[`${prefix}_Prof`] = sheet.skills[skill].proficient ? "x" : "";
  }
  for (let i = 0; i < 4; i += 1) {
    const w = sheet.weaponRows[i];
    fields[`Wpn${i + 1}_Name`] = w?.name ?? "";
    fields[`Wpn${i + 1}_Atk`] = w?.toHit ?? "";
    fields[`Wpn${i + 1}_Dmg`] = w?.damage ?? "";
    fields[`Wpn${i + 1}_Type`] = w?.type ?? "";
  }
  for (let lvl = 1; lvl <= 9; lvl += 1) {
    const slots = sheet.spellSlots[lvl as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9];
    for (let i = 1; i <= 4; i += 1) {
      fields[`Slot_L${lvl}_${i}`] = i <= slots ? "x" : "";
    }
  }
  for (let i = 0; i < 4; i += 1) {
    const cantrip = sheet.spells.find((s) => s.level === 0 && i === sheet.spells.filter((x) => x.level === 0).indexOf(s));
    fields[`Cantrip_${i + 1}`] = cantrip?.name ?? "";
    fields[`Cantrip_${i + 1}_Desc`] = cantrip?.summary ?? "";
  }
  const rowSpells = sheet.spells.filter((s) => s.level >= 1).slice(0, 20);
  for (let i = 0; i < 20; i += 1) {
    const s = rowSpells[i];
    const row = i + 1;
    fields[`Row_${row}_Name`] = s?.name ?? "";
    fields[`Row_${row}_Desc`] = s?.summary ?? "";
    fields[`Row_${row}_Lvl`] = s ? String(s.level) : "";
    fields[`Row_${row}_V`] = s?.verbal ? "x" : "";
    fields[`Row_${row}_S`] = s?.somatic ? "x" : "";
    fields[`Row_${row}_M`] = s?.material ? "x" : "";
    fields[`Row_${row}_Rit`] = s?.ritual ? "x" : "";
    fields[`Row_${row}_Conc`] = s?.concentration ? "x" : "";
  }
  fields.SpellList = sheet.spells.map((s) => ({
    level: s.level,
    name: s.name,
    desc: s.summary,
    v: s.verbal ? "x" : "",
    s: s.somatic ? "x" : "",
    m: s.material ? "x" : "",
    conc: s.concentration ? "x" : "",
    rit: s.ritual ? "x" : "",
  }));

  return fields;
}
