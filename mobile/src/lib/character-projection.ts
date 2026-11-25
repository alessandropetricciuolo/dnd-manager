import {
  PlayerCharacter,
  AbilityKey,
  AbilityScoreEntry,
  SkillKey,
  SkillEntry,
  SavingThrowEntry,
} from '../types';
import {
  CharacterSheetV1,
  readCharacterSheetSnapshot,
  readCharacterSheetV1,
  resolveCharacterHitDice,
  resolveCharacterSpellSlots,
  resolveEffectiveCharacterFields,
} from './character-sheet';

export const SKILL_METADATA: Record<
  SkillKey,
  { name: string; ability: AbilityKey; abilityLabel: string }
> = {
  acrobatics: { name: 'Acrobazia', ability: 'dex', abilityLabel: 'DES' },
  animal_handling: { name: 'Addestrare Animali', ability: 'wis', abilityLabel: 'SAG' },
  arcana: { name: 'Arcano', ability: 'int', abilityLabel: 'INT' },
  athletics: { name: 'Atletica', ability: 'str', abilityLabel: 'FOR' },
  deception: { name: 'Inganno', ability: 'cha', abilityLabel: 'CAR' },
  history: { name: 'Storia', ability: 'int', abilityLabel: 'INT' },
  insight: { name: 'Intuizione', ability: 'wis', abilityLabel: 'SAG' },
  intimidation: { name: 'Intimidire', ability: 'cha', abilityLabel: 'CAR' },
  investigation: { name: 'Indagare', ability: 'int', abilityLabel: 'INT' },
  medicine: { name: 'Medicina', ability: 'wis', abilityLabel: 'SAG' },
  nature: { name: 'Natura', ability: 'int', abilityLabel: 'INT' },
  perception: { name: 'Percezione', ability: 'wis', abilityLabel: 'SAG' },
  performance: { name: 'Intrattenere', ability: 'cha', abilityLabel: 'CAR' },
  persuasion: { name: 'Persuasione', ability: 'cha', abilityLabel: 'CAR' },
  religion: { name: 'Religione', ability: 'int', abilityLabel: 'INT' },
  sleight_of_hand: { name: 'Rapidità di Mano', ability: 'dex', abilityLabel: 'DES' },
  stealth: { name: 'Furtività', ability: 'dex', abilityLabel: 'DES' },
  survival: { name: 'Sopravvivenza', ability: 'wis', abilityLabel: 'SAG' },
};

/**
 * Projects a database character row onto the mobile PlayerCharacter shape using the
 * shared precedence rules (registry columns prevail for identity/AC/level with sheet
 * fallback; character_sheet.hpMax prevails for max HP with rules_snapshot.max_hp fallback).
 */
export function projectMobileCharacter(item: any): PlayerCharacter {
  const snapshot = readCharacterSheetSnapshot(item.rules_snapshot);
  const effective = resolveEffectiveCharacterFields(item);
  const sheet = effective.sheet;
  const legacyAbilities = snapshot.abilities && typeof snapshot.abilities === 'object' ? snapshot.abilities : {};
  const abilities = { ...legacyAbilities, ...(sheet?.abilities ?? {}) };
  const maxHp = effective.maxHp;
  const hitDice = resolveCharacterHitDice(item.rules_snapshot);
  const resolvedSlots = resolveCharacterSpellSlots(item.rules_snapshot);
  const hasExplicitSlots = sheet?.spellSlots !== undefined || Array.isArray(snapshot.spellSlots);

  const mappedWeapons = sheet?.weaponRows?.map((weapon, index) => {
    const bonus = weapon.toHit.match(/[+\-]?\d+/)?.[0];
    const parsedBonus = bonus === undefined ? undefined : Number.parseInt(bonus, 10);
    return {
      id: `sheet-weapon-${index}`,
      name: weapon.name,
      attackBonus: parsedBonus !== undefined && Number.isFinite(parsedBonus) ? parsedBonus : undefined,
      damage: weapon.damage,
      damageType: weapon.type,
    };
  });
  const mappedSpells = sheet?.spells?.map((spell, index) => ({
    id: `sheet-spell-${index}`,
    level: spell.level,
    name: spell.name,
    summary: spell.summary,
    prepared: spell.prepared,
    description: spell.fullTextMd ?? undefined,
    components: spell.verbal !== undefined && spell.somatic !== undefined && spell.material !== undefined
      ? [spell.verbal && 'V', spell.somatic && 'S', spell.material && 'M'].filter(Boolean).join(', ')
      : undefined,
    castingTime: '',
    range: '',
    duration: '',
    ritual: spell.ritual,
    concentration: spell.concentration,
  }));
  const sheetFeatures = sheet ? [
    ['raceTraitsMd', 'race'],
    ['subraceTraitsMd', 'race'],
    ['classFeaturesMd', 'class'],
    ['subclassFeaturesMd', 'subclass'],
    ['backgroundMd', 'background'],
  ].flatMap(([field, source]) => {
    const markdown = sheet[field as keyof CharacterSheetV1];
    if (typeof markdown !== 'string' || !markdown.trim()) return [];
    const blocks = markdown.split(/(?=^#{1,4}\s)/m).map((block) => block.trim()).filter(Boolean);
    return blocks.map((block, index) => {
      const [firstLine, ...rest] = block.split('\n');
      return {
        id: `sheet-${source}-${index}`,
        name: firstLine.match(/^#{1,4}\s+(.+)$/)?.[1]?.trim() || ({
          race: 'Tratti razziali',
          class: 'Privilegi di classe',
          subclass: 'Privilegi di sottoclasse',
          background: 'Background',
        } as Record<string, string>)[String(source)],
        source,
        description: rest.join('\n').trim() || block,
      };
    });
  }) : [];

  const projectedSnapshot: Record<string, any> = {
    ...snapshot,
    ...(sheet ? {
      abilities,
      proficiency_bonus: sheet.proficiencyBonus ?? snapshot.proficiency_bonus,
      passive_perception: sheet.passivePerception ?? snapshot.passive_perception,
      speed: sheet.speed ?? snapshot.speed,
      initiative: sheet.initiative ?? snapshot.initiative,
      ...(sheet.personality ? { personality: sheet.personality } : {}),
      ...(sheet.playerNotes !== undefined ? { playerNotes: sheet.playerNotes } : {}),
      spellcasting: {
        ...(snapshot.spellcasting && typeof snapshot.spellcasting === 'object' ? snapshot.spellcasting : {}),
        ...(sheet.spellcastingAbility ? { ability: sheet.spellcastingAbility } : {}),
        ...(sheet.spellSaveDc !== undefined && sheet.spellSaveDc !== null ? { saveDc: sheet.spellSaveDc } : {}),
        ...(sheet.spellAttackBonus !== undefined && sheet.spellAttackBonus !== null ? { attackBonus: sheet.spellAttackBonus } : {}),
      },
      ...(mappedWeapons !== undefined ? { weapons: mappedWeapons } : { weapons: [] }),
      ...(sheet.inventory !== undefined
        ? { inventory: sheet.inventory.map((name, index) => ({ id: `sheet-item-${index}`, name })) }
        : { inventory: [] }),
      ...(mappedSpells !== undefined ? { spells: mappedSpells } : { spells: [] }),
      proficiencies: {
        ...(snapshot.proficiencies && typeof snapshot.proficiencies === 'object' ? snapshot.proficiencies : {}),
        ...(sheet.armorProficiencies !== undefined ? { armor: sheet.armorProficiencies } : {}),
        ...(sheet.weaponProficiencies !== undefined ? { weapons: sheet.weaponProficiencies } : {}),
        ...(sheet.toolProficiencies !== undefined ? { tools: sheet.toolProficiencies } : {}),
        ...(sheet.languages !== undefined ? { languages: sheet.languages } : {}),
      },
      features: Array.from(new Map([
        ...(Array.isArray(snapshot.features) ? snapshot.features : []),
        ...sheetFeatures,
      ].map((feature: any) => [feature?.id ?? `${feature?.name ?? 'feature'}-${feature?.source ?? ''}`, feature])).values()),
    } : {}),
    ...(hasExplicitSlots ? { spellSlots: resolvedSlots } : {}),
    ...(hitDice ? { hit_dice: hitDice } : {}),
  };

  if (maxHp !== null) {
    projectedSnapshot.max_hp = maxHp;
  } else {
    delete projectedSnapshot.max_hp;
  }

  return {
    ...item,
    name: effective.name || item.name || '',
    character_class: effective.characterClass,
    class_subclass: effective.classSubclass,
    level: effective.level,
    armor_class: effective.armorClass,
    hit_points: effective.hitPoints,
    background: item.background ?? null,
    rules_snapshot: projectedSnapshot,
    coins_gp: item.coins_gp ?? 0,
    coins_sp: item.coins_sp ?? 0,
    coins_cp: item.coins_cp ?? 0,
  } as PlayerCharacter;
}

export function deriveMobileCharacterStats(safeCharacter: PlayerCharacter): {
  abilityScores: AbilityScoreEntry[];
  proficiencyBonus: number | undefined;
  passivePerception: number | undefined;
  savingThrows: SavingThrowEntry[];
  skills: SkillEntry[];
} {
  const snapAbilities = safeCharacter.rules_snapshot?.abilities ?? {};
  const sheet = readCharacterSheetV1(safeCharacter.rules_snapshot ?? {});
  const keys: Array<{ key: AbilityKey; label: string; name: string }> = [
    { key: 'str', label: 'FOR', name: 'Forza' },
    { key: 'dex', label: 'DES', name: 'Destrezza' },
    { key: 'con', label: 'COS', name: 'Costituzione' },
    { key: 'int', label: 'INT', name: 'Intelligenza' },
    { key: 'wis', label: 'SAG', name: 'Saggezza' },
    { key: 'cha', label: 'CAR', name: 'Carisma' },
  ];

  const abilityScores: AbilityScoreEntry[] = keys.map(({ key, label, name }) => {
    const score = sheet?.abilities?.[key] ?? (snapAbilities as any)[key];
    const modifier = sheet?.abilityMods?.[key] ?? (typeof score === 'number' ? Math.floor((score - 10) / 2) : undefined);
    return { key, label, name, score, modifier };
  });

  const rawProf = sheet?.proficiencyBonus ?? safeCharacter.rules_snapshot?.proficiency_bonus;
  const proficiencyBonus = typeof rawProf === 'number' ? rawProf : undefined;

  const abilityModMap: Partial<Record<AbilityKey, number>> = {};
  for (const ab of abilityScores) {
    if (ab.modifier !== undefined) abilityModMap[ab.key] = ab.modifier;
  }

  const stProfCompiled = Array.isArray(safeCharacter.rules_snapshot?.saving_throw_proficiencies);
  const stProfKeys = new Set(safeCharacter.rules_snapshot?.saving_throw_proficiencies ?? []);

  const savingThrows: SavingThrowEntry[] = abilityScores.map((ab) => {
    const check = sheet?.savingThrows?.[ab.key];
    const isProf = check ? check.proficient : stProfCompiled ? stProfKeys.has(ab.key) : undefined;
    const bonus = check?.value ?? (ab.modifier !== undefined && stProfCompiled
      ? ab.modifier + (isProf ? (proficiencyBonus ?? 0) : 0)
      : ab.modifier);
    return {
      key: ab.key,
      label: ab.label,
      name: ab.name,
      bonus,
      proficient: isProf,
    };
  });

  const skProfCompiled = Array.isArray(safeCharacter.rules_snapshot?.skill_proficiencies);
  const skExpCompiled = Array.isArray(safeCharacter.rules_snapshot?.skill_expertises);
  const profSet = new Set(safeCharacter.rules_snapshot?.skill_proficiencies ?? []);
  const expSet = new Set(safeCharacter.rules_snapshot?.skill_expertises ?? []);

  const skills: SkillEntry[] = (Object.keys(SKILL_METADATA) as SkillKey[]).map((k) => {
    const meta = SKILL_METADATA[k];
    const check = sheet?.skills?.[k];
    const baseMod = abilityModMap[meta.ability];
    const isProf = check ? check.proficient : skProfCompiled ? profSet.has(k) : undefined;
    const isExp = check ? check.expertise : skExpCompiled ? expSet.has(k) : undefined;
    const bonus = check?.value ?? (skProfCompiled && skExpCompiled && baseMod !== undefined
      ? baseMod + (isProf ? (proficiencyBonus ?? 0) : 0) + (isExp ? (proficiencyBonus ?? 0) : 0)
      : baseMod);

    return {
      key: k,
      name: meta.name,
      ability: meta.ability,
      abilityLabel: meta.abilityLabel,
      bonus,
      proficient: isProf,
      expertise: isExp,
    };
  });

  const percSkill = skills.find((s) => s.key === 'perception');
  const passivePerception = sheet?.passivePerception ?? safeCharacter.rules_snapshot?.passive_perception ??
    (percSkill?.bonus !== undefined ? 10 + percSkill.bonus : undefined);

  return { abilityScores, proficiencyBonus, passivePerception, savingThrows, skills };
}
