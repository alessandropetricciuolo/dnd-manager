import type { AbilityKey } from './types';

export type WeaponCategory =
  | 'simple-melee'
  | 'simple-ranged'
  | 'martial-melee'
  | 'martial-ranged';

export type WeaponProperty =
  | 'finesse'
  | 'thrown'
  | 'versatile'
  | 'two-handed'
  | 'light'
  | 'heavy'
  | 'reach'
  | 'ammunition'
  | 'loading'
  | 'special';

export interface WeaponDefinition {
  id: string;
  name: string;
  category: WeaponCategory;
  categoryLabel: string;
  damage: string; // e.g. '1d8', '1d6', '2d6', '1'
  damageType: string; // 'taglienti' | 'perforanti' | 'contundenti'
  versatileDamage?: string; // e.g. '1d10' for versatile weapons
  properties: WeaponProperty[];
  range?: { normal: number; long?: number }; // in meters (from PHB)
  weightKg: number;
  costMo: number;
}

export type SelectedWeaponChoice = {
  id?: string;
  weaponId: string;
  twoHanded?: boolean;
};

export const WEAPON_CATALOG: WeaponDefinition[] = [
  {
    id: 'colpo-senz-armi',
    name: "Colpo senz'armi",
    category: 'simple-melee',
    categoryLabel: "Attacchi senz'armi",
    damage: '1',
    damageType: 'contundenti',
    properties: [],
    weightKg: 0,
    costMo: 0,
  },
  // --- ARMI DA MISCHIA SEMPLICI ---
  {
    id: 'ascia',
    name: 'Ascia',
    category: 'simple-melee',
    categoryLabel: 'Armi da mischia semplici',
    damage: '1d6',
    damageType: 'taglienti',
    properties: ['light', 'thrown'],
    range: { normal: 6, long: 18 },
    weightKg: 1,
    costMo: 5,
  },
  {
    id: 'bastone-ferrato',
    name: 'Bastone ferrato',
    category: 'simple-melee',
    categoryLabel: 'Armi da mischia semplici',
    damage: '1d6',
    damageType: 'contundenti',
    versatileDamage: '1d8',
    properties: ['versatile'],
    weightKg: 2,
    costMo: 0.2,
  },
  {
    id: 'falcetto',
    name: 'Falcetto',
    category: 'simple-melee',
    categoryLabel: 'Armi da mischia semplici',
    damage: '1d4',
    damageType: 'taglienti',
    properties: ['light'],
    weightKg: 1,
    costMo: 1,
  },
  {
    id: 'giavellotto',
    name: 'Giavellotto',
    category: 'simple-melee',
    categoryLabel: 'Armi da mischia semplici',
    damage: '1d6',
    damageType: 'perforanti',
    properties: ['thrown'],
    range: { normal: 9, long: 36 },
    weightKg: 1,
    costMo: 0.5,
  },
  {
    id: 'lancia',
    name: 'Lancia',
    category: 'simple-melee',
    categoryLabel: 'Armi da mischia semplici',
    damage: '1d6',
    damageType: 'perforanti',
    versatileDamage: '1d8',
    properties: ['thrown', 'versatile'],
    range: { normal: 6, long: 18 },
    weightKg: 1.5,
    costMo: 1,
  },
  {
    id: 'martello-leggero',
    name: 'Martello leggero',
    category: 'simple-melee',
    categoryLabel: 'Armi da mischia semplici',
    damage: '1d4',
    damageType: 'contundenti',
    properties: ['light', 'thrown'],
    range: { normal: 6, long: 18 },
    weightKg: 1,
    costMo: 2,
  },
  {
    id: 'mazza',
    name: 'Mazza',
    category: 'simple-melee',
    categoryLabel: 'Armi da mischia semplici',
    damage: '1d6',
    damageType: 'contundenti',
    properties: [],
    weightKg: 2,
    costMo: 5,
  },
  {
    id: 'pugnale',
    name: 'Pugnale',
    category: 'simple-melee',
    categoryLabel: 'Armi da mischia semplici',
    damage: '1d4',
    damageType: 'perforanti',
    properties: ['finesse', 'light', 'thrown'],
    range: { normal: 6, long: 18 },
    weightKg: 0.5,
    costMo: 2,
  },
  {
    id: 'randello',
    name: 'Randello',
    category: 'simple-melee',
    categoryLabel: 'Armi da mischia semplici',
    damage: '1d4',
    damageType: 'contundenti',
    properties: ['light'],
    weightKg: 1,
    costMo: 0.1,
  },
  {
    id: 'randello-pesante',
    name: 'Randello pesante',
    category: 'simple-melee',
    categoryLabel: 'Armi da mischia semplici',
    damage: '1d8',
    damageType: 'contundenti',
    properties: ['two-handed'],
    weightKg: 5,
    costMo: 0.2,
  },

  // --- ARMI A DISTANZA SEMPLICI ---
  {
    id: 'arco-corto',
    name: 'Arco corto',
    category: 'simple-ranged',
    categoryLabel: 'Armi a distanza semplici',
    damage: '1d6',
    damageType: 'perforanti',
    properties: ['ammunition', 'two-handed'],
    range: { normal: 24, long: 96 },
    weightKg: 1,
    costMo: 25,
  },
  {
    id: 'balestra-leggera',
    name: 'Balestra leggera',
    category: 'simple-ranged',
    categoryLabel: 'Armi a distanza semplici',
    damage: '1d8',
    damageType: 'perforanti',
    properties: ['ammunition', 'loading', 'two-handed'],
    range: { normal: 24, long: 96 },
    weightKg: 2.5,
    costMo: 25,
  },
  {
    id: 'dardo',
    name: 'Dardo',
    category: 'simple-ranged',
    categoryLabel: 'Armi a distanza semplici',
    damage: '1d4',
    damageType: 'perforanti',
    properties: ['finesse', 'thrown'],
    range: { normal: 6, long: 18 },
    weightKg: 0.125,
    costMo: 0.05,
  },
  {
    id: 'fionda',
    name: 'Fionda',
    category: 'simple-ranged',
    categoryLabel: 'Armi a distanza semplici',
    damage: '1d4',
    damageType: 'contundenti',
    properties: ['ammunition'],
    range: { normal: 9, long: 36 },
    weightKg: 0,
    costMo: 0.1,
  },

  // --- ARMI DA MISCHIA DA GUERRA ---
  {
    id: 'alabarda',
    name: 'Alabarda',
    category: 'martial-melee',
    categoryLabel: 'Armi da mischia da guerra',
    damage: '1d10',
    damageType: 'taglienti',
    properties: ['heavy', 'reach', 'two-handed'],
    weightKg: 3,
    costMo: 20,
  },
  {
    id: 'ascia-bipenne',
    name: 'Ascia bipenne',
    category: 'martial-melee',
    categoryLabel: 'Armi da mischia da guerra',
    damage: '1d12',
    damageType: 'taglienti',
    properties: ['heavy', 'two-handed'],
    weightKg: 3.5,
    costMo: 30,
  },
  {
    id: 'ascia-da-battaglia',
    name: 'Ascia da battaglia',
    category: 'martial-melee',
    categoryLabel: 'Armi da mischia da guerra',
    damage: '1d8',
    damageType: 'taglienti',
    versatileDamage: '1d10',
    properties: ['versatile'],
    weightKg: 2,
    costMo: 10,
  },
  {
    id: 'falcione',
    name: 'Falcione',
    category: 'martial-melee',
    categoryLabel: 'Armi da mischia da guerra',
    damage: '1d10',
    damageType: 'taglienti',
    properties: ['heavy', 'reach', 'two-handed'],
    weightKg: 3,
    costMo: 20,
  },
  {
    id: 'frusta',
    name: 'Frusta',
    category: 'martial-melee',
    categoryLabel: 'Armi da mischia da guerra',
    damage: '1d4',
    damageType: 'taglienti',
    properties: ['finesse', 'reach'],
    weightKg: 1.5,
    costMo: 2,
  },
  {
    id: 'lancia-da-cavaliere',
    name: 'Lancia da cavaliere',
    category: 'martial-melee',
    categoryLabel: 'Armi da mischia da guerra',
    damage: '1d12',
    damageType: 'perforanti',
    properties: ['reach', 'special'],
    weightKg: 3,
    costMo: 10,
  },
  {
    id: 'maglio',
    name: 'Maglio',
    category: 'martial-melee',
    categoryLabel: 'Armi da mischia da guerra',
    damage: '2d6',
    damageType: 'contundenti',
    properties: ['heavy', 'two-handed'],
    weightKg: 5,
    costMo: 10,
  },
  {
    id: 'martello-da-guerra',
    name: 'Martello da guerra',
    category: 'martial-melee',
    categoryLabel: 'Armi da mischia da guerra',
    damage: '1d8',
    damageType: 'contundenti',
    versatileDamage: '1d10',
    properties: ['versatile'],
    weightKg: 1,
    costMo: 15,
  },
  {
    id: 'mazzafrusto',
    name: 'Mazzafrusto',
    category: 'martial-melee',
    categoryLabel: 'Armi da mischia da guerra',
    damage: '1d8',
    damageType: 'contundenti',
    properties: [],
    weightKg: 1,
    costMo: 10,
  },
  {
    id: 'morning-star',
    name: 'Morning star',
    category: 'martial-melee',
    categoryLabel: 'Armi da mischia da guerra',
    damage: '1d8',
    damageType: 'perforanti',
    properties: [],
    weightKg: 2,
    costMo: 15,
  },
  {
    id: 'picca',
    name: 'Picca',
    category: 'martial-melee',
    categoryLabel: 'Armi da mischia da guerra',
    damage: '1d10',
    damageType: 'perforanti',
    properties: ['heavy', 'reach', 'two-handed'],
    weightKg: 9,
    costMo: 5,
  },
  {
    id: 'piccone-da-guerra',
    name: 'Piccone da guerra',
    category: 'martial-melee',
    categoryLabel: 'Armi da mischia da guerra',
    damage: '1d8',
    damageType: 'perforanti',
    properties: [],
    weightKg: 1,
    costMo: 5,
  },
  {
    id: 'scimitarra',
    name: 'Scimitarra',
    category: 'martial-melee',
    categoryLabel: 'Armi da mischia da guerra',
    damage: '1d6',
    damageType: 'taglienti',
    properties: ['finesse', 'light'],
    weightKg: 1.5,
    costMo: 25,
  },
  {
    id: 'spada-corta',
    name: 'Spada corta',
    category: 'martial-melee',
    categoryLabel: 'Armi da mischia da guerra',
    damage: '1d6',
    damageType: 'perforanti',
    properties: ['finesse', 'light'],
    weightKg: 1,
    costMo: 10,
  },
  {
    id: 'spada-lunga',
    name: 'Spada lunga',
    category: 'martial-melee',
    categoryLabel: 'Armi da mischia da guerra',
    damage: '1d8',
    damageType: 'taglienti',
    versatileDamage: '1d10',
    properties: ['versatile'],
    weightKg: 1.5,
    costMo: 15,
  },
  {
    id: 'spadone',
    name: 'Spadone',
    category: 'martial-melee',
    categoryLabel: 'Armi da mischia da guerra',
    damage: '2d6',
    damageType: 'taglienti',
    properties: ['heavy', 'two-handed'],
    weightKg: 3,
    costMo: 50,
  },
  {
    id: 'stocco',
    name: 'Stocco',
    category: 'martial-melee',
    categoryLabel: 'Armi da mischia da guerra',
    damage: '1d8',
    damageType: 'perforanti',
    properties: ['finesse'],
    weightKg: 1,
    costMo: 25,
  },
  {
    id: 'tridente',
    name: 'Tridente',
    category: 'martial-melee',
    categoryLabel: 'Armi da mischia da guerra',
    damage: '1d6',
    damageType: 'perforanti',
    versatileDamage: '1d8',
    properties: ['thrown', 'versatile'],
    range: { normal: 6, long: 18 },
    weightKg: 2,
    costMo: 5,
  },

  // --- ARMI A DISTANZA DA GUERRA ---
  {
    id: 'arco-lungo',
    name: 'Arco lungo',
    category: 'martial-ranged',
    categoryLabel: 'Armi a distanza da guerra',
    damage: '1d8',
    damageType: 'perforanti',
    properties: ['ammunition', 'heavy', 'two-handed'],
    range: { normal: 45, long: 180 },
    weightKg: 1,
    costMo: 50,
  },
  {
    id: 'balestra-a-mano',
    name: 'Balestra a mano',
    category: 'martial-ranged',
    categoryLabel: 'Armi a distanza da guerra',
    damage: '1d6',
    damageType: 'perforanti',
    properties: ['ammunition', 'light', 'loading'],
    range: { normal: 9, long: 36 },
    weightKg: 1.5,
    costMo: 75,
  },
  {
    id: 'balestra-pesante',
    name: 'Balestra pesante',
    category: 'martial-ranged',
    categoryLabel: 'Armi a distanza da guerra',
    damage: '1d10',
    damageType: 'perforanti',
    properties: ['ammunition', 'heavy', 'loading', 'two-handed'],
    range: { normal: 30, long: 120 },
    weightKg: 9,
    costMo: 50,
  },
  {
    id: 'cerbottana',
    name: 'Cerbottana',
    category: 'martial-ranged',
    categoryLabel: 'Armi a distanza da guerra',
    damage: '1',
    damageType: 'perforanti',
    properties: ['ammunition', 'loading'],
    range: { normal: 7.5, long: 30 },
    weightKg: 0.5,
    costMo: 10,
  },
  {
    id: 'rete',
    name: 'Rete',
    category: 'martial-ranged',
    categoryLabel: 'Armi a distanza da guerra',
    damage: '-',
    damageType: 'speciale',
    properties: ['thrown', 'special'],
    range: { normal: 1.5, long: 4.5 },
    weightKg: 1.5,
    costMo: 1,
  },
];

export function findWeaponDefinition(idOrName: string): WeaponDefinition | undefined {
  if (!idOrName) return undefined;
  const norm = idOrName.toLowerCase().trim();
  // 1. Exact ID match
  const byId = WEAPON_CATALOG.find((w) => w.id === norm);
  if (byId) return byId;

  // 2. Exact name match
  const byName = WEAPON_CATALOG.find((w) => w.name.toLowerCase() === norm);
  if (byName) return byName;

  // 3. Prefix / substring match
  return WEAPON_CATALOG.find(
    (w) =>
      norm.startsWith(w.name.toLowerCase()) ||
      w.name.toLowerCase().startsWith(norm)
  );
}

const PLURAL_WEAPON_MAP: Record<string, string> = {
  pugnali: 'pugnale',
  dardi: 'dardo',
  fionde: 'fionda',
  lance: 'lancia',
  falcetti: 'falcetto',
  giavellotti: 'giavellotto',
  'bastoni ferrati': 'bastone-ferrato',
  'martelli leggeri': 'martello-leggero',
  'asce da battaglia': 'ascia-da-battaglia',
  asce: 'ascia',
  'martelli da guerra': 'martello-da-guerra',
  'spade corte': 'spada-corta',
  'spade lunghe': 'spada-lunga',
  stocchi: 'stocco',
  scimitarre: 'scimitarra',
  'archi corti': 'arco-corto',
  'archi lunghi': 'arco-lungo',
  'balestre a mano': 'balestra-a-mano',
  'balestre leggere': 'balestra-leggera',
  'balestre pesanti': 'balestra-pesante',
};

export function isCharacterProficientWithWeapon(
  weapon: WeaponDefinition,
  weaponProficiencies: string[],
  context?: {
    classLabel?: string;
    classSubclass?: string | null;
    kenseiWeapons?: string[];
    pactWeapon?: string;
    hexbladeWeapon?: string;
  }
): boolean {
  const normProfs = weaponProficiencies.map((p) => p.toLowerCase().trim());

  // 1. All simple weapons
  if (weapon.category.startsWith('simple') && normProfs.some((p) => p.includes('armi semplici'))) {
    return true;
  }

  // 2. All martial weapons
  if (weapon.category.startsWith('martial') && normProfs.some((p) => p.includes('armi da guerra'))) {
    return true;
  }

  // 3. Direct name or plural name matches in weaponProficiencies
  const wNameNorm = weapon.name.toLowerCase();
  for (const p of normProfs) {
    if (p === wNameNorm) return true;
    const singularId = PLURAL_WEAPON_MAP[p];
    if (singularId && singularId === weapon.id) return true;
    if (p.includes(wNameNorm) || wNameNorm.includes(p)) return true;
  }

  // 4. Kensei weapons (Monk)
  if (
    context?.kenseiWeapons?.some(
      (kw) => kw.toLowerCase() === wNameNorm || findWeaponDefinition(kw)?.id === weapon.id
    )
  ) {
    return true;
  }

  // 5. Pact Weapon (Warlock Pact of the Blade)
  if (
    context?.pactWeapon &&
    (context.pactWeapon.toLowerCase() === wNameNorm ||
      findWeaponDefinition(context.pactWeapon)?.id === weapon.id)
  ) {
    return true;
  }

  // 6. Hexblade Weapon
  if (
    context?.hexbladeWeapon &&
    (context.hexbladeWeapon.toLowerCase() === wNameNorm ||
      findWeaponDefinition(context.hexbladeWeapon)?.id === weapon.id)
  ) {
    return true;
  }

  return false;
}

export type CharacterCombatWeaponContext = {
  classLabel: string;
  classSubclass?: string | null;
  level: number;
  proficiencyBonus: number;
  abilityMods: Record<AbilityKey, number>;
  fightingStyles?: string[];
  weaponProficiencies: string[];
  kenseiWeapons?: string[];
  pactWeapon?: string;
  hexbladeWeapon?: string;
  infusedWeaponId?: string;
  infusionAttackBonus?: number;
};

export type ComputedWeaponAttack = {
  name: string;
  toHit: string;
  damage: string;
  type: string;
  proficient: boolean;
  notes?: string;
  weaponDef: WeaponDefinition;
};

export function computeWeaponAttack(
  weapon: WeaponDefinition,
  ctx: CharacterCombatWeaponContext,
  choice?: { twoHanded?: boolean }
): ComputedWeaponAttack {
  const isProf = isCharacterProficientWithWeapon(weapon, ctx.weaponProficiencies, {
    classLabel: ctx.classLabel,
    classSubclass: ctx.classSubclass,
    kenseiWeapons: ctx.kenseiWeapons,
    pactWeapon: ctx.pactWeapon,
    hexbladeWeapon: ctx.hexbladeWeapon,
  });

  const activeStyles = (ctx.fightingStyles ?? []).map((s) => s.toLowerCase());
  const hasArchery = activeStyles.some((s) => s.includes('tiro'));
  const hasDueling = activeStyles.some((s) => s.includes('duellare'));
  const hasGreatWeapon = activeStyles.some((s) => s.includes('armi possenti'));

  const isRangedWeapon = weapon.category.endsWith('-ranged');
  const isFinesse = weapon.properties.includes('finesse');
  const isThrown = weapon.properties.includes('thrown');
  const isVersatile = weapon.properties.includes('versatile');
  const isTwoHandedProp = weapon.properties.includes('two-handed');

  const isKensei = (ctx.kenseiWeapons ?? []).some(
    (kw) => kw.toLowerCase() === weapon.name.toLowerCase() || findWeaponDefinition(kw)?.id === weapon.id
  );
  const isMonkClass = ctx.classLabel === 'Monaco';
  const isMonkWeapon =
    isMonkClass &&
    (isKensei ||
      (weapon.category === 'simple-melee' && !isTwoHandedProp && !weapon.properties.includes('heavy')) ||
      weapon.id === 'spada-corta');

  const isHexbladeSubclass =
    ctx.classLabel === 'Warlock' &&
    /lama del sortilegio|guerriero ectoplasmatico|hexblade/i.test(ctx.classSubclass ?? '');

  const isHexblade =
    isHexbladeSubclass &&
    ((ctx.hexbladeWeapon &&
      (ctx.hexbladeWeapon.toLowerCase() === weapon.name.toLowerCase() ||
        findWeaponDefinition(ctx.hexbladeWeapon)?.id === weapon.id)) ||
      (ctx.pactWeapon &&
        (ctx.pactWeapon.toLowerCase() === weapon.name.toLowerCase() ||
          findWeaponDefinition(ctx.pactWeapon)?.id === weapon.id)));

  const isBattleSmith =
    ctx.classLabel === 'Artefice' &&
    /fabbro da battaglia|battle smith/i.test(ctx.classSubclass ?? '');
  const isInfused = ctx.infusedWeaponId === weapon.id;
  const infusionBonus = isInfused ? (ctx.infusionAttackBonus ?? 1) : 0;

  // Determine attack & damage ability
  let ability: AbilityKey = 'str';
  if (isHexblade && ctx.abilityMods.cha > Math.max(ctx.abilityMods.str, ctx.abilityMods.dex)) {
    ability = 'cha';
  } else if (isBattleSmith && isInfused) {
    ability = 'int';
  } else if (isRangedWeapon) {
    ability = 'dex';
  } else if (isFinesse || isMonkWeapon) {
    ability = ctx.abilityMods.dex >= ctx.abilityMods.str ? 'dex' : 'str';
  } else if (isThrown) {
    ability = isFinesse && ctx.abilityMods.dex >= ctx.abilityMods.str ? 'dex' : 'str';
  }

  const abMod = ctx.abilityMods[ability];
  const pbBonus = isProf ? ctx.proficiencyBonus : 0;
  const archeryBonus = isRangedWeapon && hasArchery ? 2 : 0;

  const totalToHit = pbBonus + abMod + archeryBonus + infusionBonus;
  const toHitStr = `${totalToHit >= 0 ? '+' : ''}${totalToHit}${!isProf ? ' (non comp.)' : ''}`;

  // Damage dice calculation
  let damageBase = weapon.damage;
  const wieldsTwoHanded = Boolean(choice?.twoHanded && isVersatile);
  if (wieldsTwoHanded && weapon.versatileDamage) {
    damageBase = weapon.versatileDamage;
  }

  // Monk martial arts die scaling (if higher)
  if (isMonkClass && (isMonkWeapon || weapon.id === 'colpo-senz-armi')) {
    const monkDieFaces = ctx.level >= 17 ? 10 : ctx.level >= 11 ? 8 : ctx.level >= 5 ? 6 : 4;
    const m = damageBase.match(/^1d(\d+)(.*)$/);
    if (damageBase === '1' || (m && Number(m[1]) < monkDieFaces)) {
      damageBase = `1d${monkDieFaces}${m ? m[2] : ''}`;
    }
  }

  const abToken =
    ability === 'dex'
      ? 'DES'
      : ability === 'int'
      ? 'INT'
      : ability === 'cha'
      ? 'CAR'
      : (ability as AbilityKey) === 'wis'
      ? 'SAG'
      : 'FOR';

  let damageFormula = `${damageBase}+${abToken}`;
  if (infusionBonus > 0) {
    damageFormula = `${damageFormula}+${infusionBonus}`;
  }

  // Dueling fighting style: +2 to damage when wielding melee weapon in one hand and no other weapons
  if (hasDueling && !isRangedWeapon && !isTwoHandedProp && !wieldsTwoHanded) {
    damageFormula = `${damageFormula} (+2 a 1 mano)`;
  }
  if (hasGreatWeapon && !isRangedWeapon && (isTwoHandedProp || wieldsTwoHanded)) {
    damageFormula = `${damageFormula} (ritira 1-2)`;
  }

  let typeStr = weapon.damageType;
  if (wieldsTwoHanded) {
    typeStr = `${typeStr} (a 2 mani)`;
  }

  const dispName = `${weapon.name}${isInfused ? ' +1' : ''}`;

  return {
    name: dispName,
    toHit: toHitStr,
    damage: damageFormula,
    type: typeStr,
    proficient: isProf,
    weaponDef: weapon,
  };
}

export function getDefaultWeaponsForClass(classLabel: string): SelectedWeaponChoice[] {
  switch (classLabel) {
    case 'Barbaro':
      return [{ weaponId: 'ascia-bipenne' }, { weaponId: 'giavellotto' }];
    case 'Bardo':
      return [{ weaponId: 'stocco' }, { weaponId: 'pugnale' }];
    case 'Chierico':
      return [{ weaponId: 'mazza' }, { weaponId: 'balestra-leggera' }];
    case 'Druido':
      return [{ weaponId: 'scimitarra' }, { weaponId: 'bastone-ferrato' }];
    case 'Guerriero':
      return [{ weaponId: 'spada-lunga' }, { weaponId: 'arco-lungo' }];
    case 'Ladro':
      return [{ weaponId: 'stocco' }, { weaponId: 'arco-corto' }];
    case 'Mago':
    case 'Stregone':
      return [{ weaponId: 'pugnale' }, { weaponId: 'bastone-ferrato' }];
    case 'Monaco':
      return [{ weaponId: 'colpo-senz-armi' }, { weaponId: 'spada-corta' }];
    case 'Paladino':
      return [{ weaponId: 'spada-lunga' }, { weaponId: 'giavellotto' }];
    case 'Ranger':
      return [{ weaponId: 'arco-lungo' }, { weaponId: 'spada-corta' }];
    case 'Warlock':
      return [{ weaponId: 'stocco' }, { weaponId: 'balestra-leggera' }];
    case 'Artefice':
      return [{ weaponId: 'balestra-leggera' }, { weaponId: 'martello-leggero' }];
    default:
      return [{ weaponId: 'spada-corta' }];
  }
}
