import { TamagotchiAction, TamagotchiMood } from './character-tamagotchi';
import {
  AccentSwatchId,
  CapeStyleId,
  EyeSwatchId,
  FacialFeatureId,
  HairStyleId,
  HairSwatchId,
  HeadgearId,
  MainHandId,
  OffHandId,
  OutfitSwatchId,
  SkinSwatchId,
  TamagotchiAppearance,
} from './tamagotchi-appearance';

export const SPRITE_GRID_SIZE = 48;

export type SpriteClassArchetype =
  | 'warrior'
  | 'mage'
  | 'rogue'
  | 'cleric'
  | 'bard'
  | 'barbarian'
  | 'ranger'
  | 'monk';

export type SpriteRaceTrait =
  | 'human'
  | 'elf'
  | 'dwarf'
  | 'tiefling'
  | 'dragonborn'
  | 'orc'
  | 'small';

export type SpritePose =
  | 'idle_a'
  | 'idle_b'
  | 'walk_a'
  | 'walk_b'
  | 'happy'
  | 'eat'
  | 'rest'
  | 'clean'
  | 'droop';

export interface SpritePalette {
  outline: string;
  skin: string;
  skinShadow: string;
  hair: string;
  hairHighlight: string;
  hairDark: string;
  iris: string;
  primary: string;
  primaryShadow: string;
  primaryHighlight: string;
  accent: string;
  accentShadow: string;
  weapon: string;
  gleam: string;
  gem: string;
  eye: string;
  boot: string;
  leatherDark: string;
}

export interface PixelRect {
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
}

export interface AutonomousBehavior {
  urgentNeed: 'hunger' | 'energy' | 'happiness' | 'hygiene' | null;
  paceMs: number;
  pauseMs: number;
  restChance: number;
  jittery: boolean;
  thoughtTag: 'food' | 'sleep' | 'clean' | 'bored' | 'happy' | null;
  thoughtText: string | null;
}

export function resolveClassArchetype(characterClass?: string | null): SpriteClassArchetype {
  const c = (characterClass || '').toLowerCase();
  if (c.includes('mag') || c.includes('wiz') || c.includes('streg') || c.includes('sorc') || c.includes('warlock')) {
    return 'mage';
  }
  if (c.includes('ladr') || c.includes('rogue') || c.includes('assassin')) {
    return 'rogue';
  }
  if (c.includes('ranger') || c.includes('esplor')) {
    return 'ranger';
  }
  if (c.includes('chier') || c.includes('cleric') || c.includes('druid')) {
    return 'cleric';
  }
  if (c.includes('bard')) {
    return 'bard';
  }
  if (c.includes('barbar')) {
    return 'barbarian';
  }
  if (c.includes('monac') || c.includes('monk')) {
    return 'monk';
  }
  return 'warrior';
}

export function resolveRaceTrait(raceSlug?: string | null): SpriteRaceTrait {
  const r = (raceSlug || '').toLowerCase();
  if (r.includes('tiefling')) return 'tiefling';
  if (r.includes('dragon')) return 'dragonborn';
  if (r.includes('orc')) return 'orc';
  if (r.includes('dwarf') || r.includes('nan')) return 'dwarf';
  if (r.includes('elf')) return 'elf';
  if (r.includes('gnome') || r.includes('gnom') || r.includes('halfling')) return 'small';
  return 'human';
}

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const SKIN_SWATCH_MAP: Record<Exclude<SkinSwatchId, 'auto'>, { skin: string; shadow: string }> = {
  fair: { skin: '#F2C29B', shadow: '#C98F67' },
  warm: { skin: '#DFA072', shadow: '#B07348' },
  bronze: { skin: '#BA7D4D', shadow: '#8C5730' },
  ebony: { skin: '#704832', shadow: '#4A2D1D' },
  moon_elf: { skin: '#DCE6F2', shadow: '#A6B8CE' },
  crimson_tiefling: { skin: '#CC525A', shadow: '#96323B' },
  indigo_tiefling: { skin: '#736FD0', shadow: '#4D489E' },
  gold_scale: { skin: '#C89B3C', shadow: '#926B1F' },
  red_scale: { skin: '#B83B2A', shadow: '#7F2216' },
  orc_green: { skin: '#749E57', shadow: '#4F7438' },
  stone_grey: { skin: '#94A3B8', shadow: '#64748B' },
};

const RACE_DEFAULT_SKIN: Record<SpriteRaceTrait, Exclude<SkinSwatchId, 'auto'>> = {
  human: 'fair',
  elf: 'moon_elf',
  dwarf: 'warm',
  tiefling: 'crimson_tiefling',
  dragonborn: 'gold_scale',
  orc: 'orc_green',
  small: 'fair',
};

const HAIR_SWATCH_MAP: Record<Exclude<HairSwatchId, 'auto'>, { hair: string; hi: string; dark: string }> = {
  chestnut: { hair: '#4A2E1B', hi: '#7C5134', dark: '#26160C' },
  raven: { hair: '#232230', hi: '#4E4C68', dark: '#111018' },
  gold: { hair: '#D99E32', hi: '#FBE074', dark: '#966515' },
  copper: { hair: '#AD3B23', hi: '#E66D4E', dark: '#6E2010' },
  silver: { hair: '#B8C4D0', hi: '#F8FAFC', dark: '#738294' },
  snow: { hair: '#E2E8F0', hi: '#FFFFFF', dark: '#94A3B8' },
  mystic: { hair: '#74348F', hi: '#B05FD1', dark: '#461A59' },
  midnight: { hair: '#1E3A8A', hi: '#3B82F6', dark: '#172554' },
  forest: { hair: '#166534', hi: '#22C55E', dark: '#052E16' },
};

const DEFAULT_HAIR_KEYS: readonly Exclude<HairSwatchId, 'auto'>[] = [
  'chestnut',
  'raven',
  'gold',
  'copper',
  'silver',
  'mystic',
];

const EYE_SWATCH_MAP: Record<Exclude<EyeSwatchId, 'auto'>, string> = {
  sapphire: '#2563EB',
  emerald: '#10B981',
  amber: '#D97706',
  hazel: '#854D0E',
  amethyst: '#9333EA',
  ruby: '#DC2626',
  ice: '#38BDF8',
  obsidian: '#27272A',
};

const DEFAULT_EYE_KEYS: readonly Exclude<EyeSwatchId, 'auto'>[] = [
  'sapphire',
  'emerald',
  'amber',
  'hazel',
  'amethyst',
  'ice',
];

const OUTFIT_SWATCH_MAP: Record<
  Exclude<OutfitSwatchId, 'auto'>,
  { primary: string; shadow: string; hi: string }
> = {
  steel: { primary: '#5B708B', shadow: '#374659', hi: '#8CA3BF' },
  arcane_blue: { primary: '#2B4285', shadow: '#192857', hi: '#4F6EC4' },
  shadow: { primary: '#2F3640', shadow: '#1A1E24', hi: '#57606F' },
  ivory_temple: { primary: '#CBD5E1', shadow: '#94A3B8', hi: '#F8FAFC' },
  crimson: { primary: '#9D174D', shadow: '#6D1036', hi: '#DB2777' },
  wild_leather: { primary: '#804B2D', shadow: '#522E19', hi: '#AD6D48' },
  ranger_green: { primary: '#2B5C35', shadow: '#193B20', hi: '#4A8A57' },
  monk_ochre: { primary: '#B45309', shadow: '#78350F', hi: '#F59E0B' },
  obsidian: { primary: '#27272E', shadow: '#15151A', hi: '#525260' },
  brass_gold: { primary: '#B4861E', shadow: '#78530D', hi: '#EAB308' },
};

const ACCENT_SWATCH_MAP: Record<
  Exclude<AccentSwatchId, 'auto'>,
  { accent: string; shadow: string; gem: string }
> = {
  crimson: { accent: '#A82828', shadow: '#6E1515', gem: '#FACC15' },
  royal_gold: { accent: '#D99B26', shadow: '#925A10', gem: '#FEF08A' },
  violet: { accent: '#7E3AF2', shadow: '#4F1DA3', gem: '#38BDF8' },
  emerald: { accent: '#15803D', shadow: '#14532D', gem: '#4ADE80' },
  azure: { accent: '#0284C7', shadow: '#075985', gem: '#E0F2FE' },
  bronze: { accent: '#9A4412', shadow: '#5E2707', gem: '#FBBF24' },
  ivory: { accent: '#E2E8F0', shadow: '#94A3B8', gem: '#FACC15' },
  charcoal: { accent: '#334155', shadow: '#1E293B', gem: '#F472B6' },
};

const CLASS_DEFAULT_OUTFIT: Record<
  SpriteClassArchetype,
  { outfit: Exclude<OutfitSwatchId, 'auto'>; accent: Exclude<AccentSwatchId, 'auto'> }
> = {
  warrior: { outfit: 'steel', accent: 'crimson' },
  mage: { outfit: 'arcane_blue', accent: 'violet' },
  rogue: { outfit: 'shadow', accent: 'violet' },
  cleric: { outfit: 'ivory_temple', accent: 'royal_gold' },
  bard: { outfit: 'crimson', accent: 'royal_gold' },
  barbarian: { outfit: 'wild_leather', accent: 'crimson' },
  ranger: { outfit: 'ranger_green', accent: 'bronze' },
  monk: { outfit: 'monk_ochre', accent: 'royal_gold' },
};

export function buildCharacterSpritePalette(params: {
  characterName: string;
  imageUrl?: string | null;
  characterClass?: string | null;
  raceSlug?: string | null;
  appearance?: TamagotchiAppearance | null;
}): SpritePalette {
  const archetype = resolveClassArchetype(params.characterClass);
  const race = resolveRaceTrait(params.raceSlug);
  const seed = hashSeed(
    `${params.characterName}|${params.imageUrl || ''}|${params.characterClass || ''}|${params.raceSlug || ''}`
  );
  const app = params.appearance ?? undefined;

  const skinKey = app?.skinSwatch ?? RACE_DEFAULT_SKIN[race];
  const skinPair = SKIN_SWATCH_MAP[skinKey];

  const hairKey = app?.hairSwatch ?? DEFAULT_HAIR_KEYS[seed % DEFAULT_HAIR_KEYS.length];
  const hairTrio = HAIR_SWATCH_MAP[hairKey];

  const eyeKey =
    app?.eyeSwatch ??
    (race === 'tiefling' ? 'ruby' : DEFAULT_EYE_KEYS[(seed >>> 3) % DEFAULT_EYE_KEYS.length]);
  const irisHex = EYE_SWATCH_MAP[eyeKey];

  const classDefaults = CLASS_DEFAULT_OUTFIT[archetype];
  const outfitTrio = OUTFIT_SWATCH_MAP[app?.outfitSwatch ?? classDefaults.outfit];
  const accentTrio = ACCENT_SWATCH_MAP[app?.accentSwatch ?? classDefaults.accent];

  return {
    outline: '#120D0A',
    skin: skinPair.skin,
    skinShadow: skinPair.shadow,
    hair: hairTrio.hair,
    hairHighlight: hairTrio.hi,
    hairDark: hairTrio.dark,
    iris: irisHex,
    primary: outfitTrio.primary,
    primaryShadow: outfitTrio.shadow,
    primaryHighlight: outfitTrio.hi,
    accent: accentTrio.accent,
    accentShadow: accentTrio.shadow,
    weapon: '#94A3B8',
    gleam: '#F8FAFC',
    gem: accentTrio.gem,
    eye: '#141218',
    boot: '#6B442A',
    leatherDark: '#3D2516',
  };
}

export interface ResolvedEquipment {
  hairStyle: Exclude<HairStyleId, 'auto'>;
  facialFeature: Exclude<FacialFeatureId, 'auto'>;
  headgear: Exclude<HeadgearId, 'auto'>;
  capeStyle: Exclude<CapeStyleId, 'auto'>;
  mainHand: Exclude<MainHandId, 'auto'>;
  offHand: Exclude<OffHandId, 'auto'>;
}

export function resolveSpriteEquipment(params: {
  archetype: SpriteClassArchetype;
  race: SpriteRaceTrait;
  appearance?: TamagotchiAppearance | null;
}): ResolvedEquipment {
  const { archetype, race, appearance } = params;

  const defaultHairStyle: Exclude<HairStyleId, 'auto'> =
    race === 'dragonborn'
      ? 'bald'
      : archetype === 'mage' || race === 'elf'
        ? 'long'
        : archetype === 'ranger' || archetype === 'monk'
          ? 'ponytail'
          : archetype === 'barbarian'
            ? 'mohawk'
            : 'short';

  const defaultFacial: Exclude<FacialFeatureId, 'auto'> =
    race === 'dwarf' ? 'braided_beard' : 'none';

  const defaultHeadgear: Exclude<HeadgearId, 'auto'> =
    archetype === 'mage'
      ? 'wizard_hat'
      : archetype === 'rogue'
        ? 'hood'
        : archetype === 'bard'
          ? 'bard_hat'
          : archetype === 'warrior'
            ? 'plumet'
            : archetype === 'barbarian'
              ? 'horned_band'
              : archetype === 'cleric'
                ? 'circlet'
                : 'none';

  const defaultCape: Exclude<CapeStyleId, 'auto'> =
    archetype === 'warrior' || archetype === 'mage' || archetype === 'cleric' || archetype === 'bard'
      ? 'long_cape'
      : archetype === 'ranger' || archetype === 'rogue'
        ? 'short_cloak'
        : archetype === 'monk'
          ? 'scarf'
          : 'none';

  const defaultMainHand: Exclude<MainHandId, 'auto'> =
    archetype === 'mage'
      ? 'staff'
      : archetype === 'cleric'
        ? 'hammer'
        : archetype === 'warrior'
          ? 'sword'
          : archetype === 'barbarian'
            ? 'axe'
            : archetype === 'ranger'
              ? 'bow'
              : archetype === 'rogue'
                ? 'dagger'
                : archetype === 'bard'
                  ? 'lute'
                  : 'none';

  const defaultOffHand: Exclude<OffHandId, 'auto'> =
    archetype === 'warrior'
      ? 'heater_shield'
      : archetype === 'cleric'
        ? 'round_shield'
        : archetype === 'mage'
          ? 'tome'
          : archetype === 'rogue'
            ? 'dagger'
            : 'none';

  return {
    hairStyle: appearance?.hairStyle ?? defaultHairStyle,
    facialFeature: appearance?.facialFeature ?? defaultFacial,
    headgear: appearance?.headgear ?? defaultHeadgear,
    capeStyle: appearance?.capeStyle ?? defaultCape,
    mainHand: appearance?.mainHand ?? defaultMainHand,
    offHand: appearance?.offHand ?? defaultOffHand,
  };
}

function createBlankGrid(): string[][] {
  return Array.from({ length: SPRITE_GRID_SIZE }, () =>
    Array.from({ length: SPRITE_GRID_SIZE }, () => '.')
  );
}

function setPx(grid: string[][], x: number, y: number, token: string) {
  if (x >= 0 && x < SPRITE_GRID_SIZE && y >= 0 && y < SPRITE_GRID_SIZE) {
    grid[y][x] = token;
  }
}

function fillRect(grid: string[][], x: number, y: number, w: number, h: number, token: string) {
  for (let dy = 0; dy < h; dy += 1) {
    for (let dx = 0; dx < w; dx += 1) {
      setPx(grid, x + dx, y + dy, token);
    }
  }
}

function outlineRect(grid: string[][], x: number, y: number, w: number, h: number, fill: string) {
  fillRect(grid, x, y, w, h, 'O');
  if (w > 2 && h > 2) {
    fillRect(grid, x + 1, y + 1, w - 2, h - 2, fill);
  }
}

function drawRow(grid: string[][], y: number, xStart: number, pattern: string) {
  for (let i = 0; i < pattern.length; i += 1) {
    const ch = pattern[i];
    if (ch !== '.' && ch !== ' ') {
      setPx(grid, xStart + i, y, ch);
    }
  }
}

/**
 * 48x48 Heroic Pixel-Art Character Builder (Octopath / Sea of Stars density).
 * Tokens:
 * . transparent | O outline | S skin | s skinShadow | H hair | h hairHighlight | d hairDark
 * I iris | A primary | a primaryShadow | P primaryHighlight | C accent | c accentShadow
 * W weaponSteel | L gleam/white | G gem/gold | E eyeDark | B boot/wood | N leatherDark
 */
export function buildRetroSpritePixels(params: {
  palette: SpritePalette;
  archetype: SpriteClassArchetype;
  race: SpriteRaceTrait;
  pose: SpritePose;
  appearance?: TamagotchiAppearance | null;
  frame?: number;
}): PixelRect[] {
  const { palette, archetype, race, pose, appearance, frame = 0 } = params;
  const grid = createBlankGrid();
  const equip = resolveSpriteEquipment({ archetype, race, appearance });

  const isWalking = pose === 'walk_a' || pose === 'walk_b';
  const walkPhase = isWalking ? (pose === 'walk_a' ? (frame % 4 < 2 ? 0 : 1) : (frame % 4 < 2 ? 2 : 3)) : 0;
  const isHappy = pose === 'happy';
  const isRest = pose === 'rest';
  const isEat = pose === 'eat';
  const isClean = pose === 'clean';
  const isDroop = pose === 'droop';

  const statureOff = race === 'small' ? 4 : race === 'dwarf' ? 3 : 0;
  const bob =
    pose === 'idle_b'
      ? 1
      : isHappy
        ? -2
        : isDroop
          ? 2
          : isWalking && walkPhase % 2 === 1
            ? -1
            : 0;

  const hy = 8 + bob + statureOff;
  const by = 21 + bob + statureOff;
  const ly = 34 + bob + Math.floor(statureOff / 2);

  // =========================================================================
  // 1. BACK LAYER: Cape, Quiver, Tiefling Tail
  // =========================================================================
  if (!isRest && (equip.capeStyle === 'long_cape' || equip.capeStyle === 'short_cloak')) {
    const wave = frame % 4 === 1 || frame % 4 === 2 ? 1 : 0;
    const capeH =
      equip.capeStyle === 'short_cloak'
        ? Math.max(8, 11 - Math.floor(statureOff / 2))
        : Math.max(12, 19 - statureOff);

    for (let dy = 0; dy < capeH; dy += 1) {
      const spread = Math.floor(dy / 5);
      const lx = 14 - spread - wave;
      const rx = 33 + spread - wave;
      setPx(grid, lx, by + dy, 'O');
      for (let x = lx + 1; x < rx; x += 1) {
        const isFold = (x - lx) % 5 === 0 || dy > capeH - 3;
        setPx(grid, x, by + dy, isFold ? 'c' : 'C');
      }
      setPx(grid, rx, by + dy, 'O');
    }
    const botY = by + capeH;
    for (let x = 12 - wave; x <= 34 - wave; x += 1) {
      if (x % 4 !== 0) setPx(grid, x, botY, 'O');
    }
  }

  if (!isRest && equip.mainHand === 'bow') {
    fillRect(grid, 14, hy + 8, 4, 7, 'O');
    fillRect(grid, 15, hy + 9, 2, 5, 'N');
    drawRow(grid, hy + 6, 13, 'L.L.');
    drawRow(grid, hy + 7, 14, 'C.C.');
  }

  if (race === 'tiefling') {
    const ty = ly + 3;
    const tailWave = frame % 2 === 0 ? 0 : -1;
    const pts: Array<[number, number]> = [
      [15, ty],
      [13, ty + 1],
      [11, ty + 1],
      [9, ty + tailWave],
      [8, ty - 2 + tailWave],
      [9, ty - 4 + tailWave],
    ];
    for (const [tx, tty] of pts) {
      fillRect(grid, tx - 1, tty - 1, 3, 3, 'O');
    }
    for (const [tx, tty] of pts) {
      setPx(grid, tx, tty, 's');
    }
    fillRect(grid, 8, ty - 6 + tailWave, 4, 3, 'O');
    setPx(grid, 9, ty - 5 + tailWave, 'G');
    setPx(grid, 10, ty - 5 + tailWave, 'G');
  }

  // =========================================================================
  // 2. LEGS & CUFFED BOOTS (or Cozy Sleeping Blanket in 'rest')
  // =========================================================================
  if (isRest) {
    // Cozy sleeping roll / folded cloak over lower body
    outlineRect(grid, 14, by, 20, 17, 'C');
    fillRect(grid, 16, by + 2, 16, 4, 'A');
    fillRect(grid, 15, by + 12, 18, 4, 'c');
    drawRow(grid, by + 6, 16, 'GGGGGGGGGGGGGGGG');
    // Boot tips peeking at bottom
    outlineRect(grid, 18, by + 16, 5, 4, 'B');
    outlineRect(grid, 25, by + 16, 5, 4, 'B');
  } else {
    const legShort = statureOff >= 3 ? 1 : 0;
    const drawBootLeg = (lx: number, topY: number, liftY: number) => {
      const y0 = topY + liftY;
      outlineRect(grid, lx, y0, 6, 6 - legShort, 'a');
      setPx(grid, lx + 2, y0 + 1, 'A');
      setPx(grid, lx + 2, y0 + 2, 'A');
      const bootTop = y0 + 4 - legShort;
      outlineRect(grid, lx - 1, bootTop, 7, 3, 'N');
      setPx(grid, lx + 1, bootTop + 1, 'B');
      setPx(grid, lx + 2, bootTop + 1, 'B');
      outlineRect(grid, lx, bootTop + 2, 7, 5 - legShort, 'B');
      setPx(grid, lx + 2, bootTop + 3, 'h');
      fillRect(grid, lx, bootTop + 6 - legShort, 7, 1, 'O');
    };

    if (isWalking) {
      const lShift = walkPhase === 0 ? -2 : walkPhase === 2 ? 1 : 0;
      const rShift = walkPhase === 2 ? -2 : walkPhase === 0 ? 1 : 0;
      const lLift = walkPhase === 1 ? -2 : 0;
      const rLift = walkPhase === 3 ? -2 : 0;
      drawBootLeg(17 + lShift, ly, lLift);
      drawBootLeg(25 + rShift, ly, rLift);
    } else {
      drawBootLeg(17, ly, 0);
      drawBootLeg(25, ly, 0);
    }

    // =========================================================================
    // 3. TORSO: Tassets, Cuirass/Tunic, Belt, Pauldrons, Scarf
    // =========================================================================
    outlineRect(grid, 16, by + 10, 7, 5, 'A');
    fillRect(grid, 17, by + 11, 5, 2, 'a');
    outlineRect(grid, 25, by + 10, 7, 5, 'A');
    fillRect(grid, 26, by + 11, 5, 2, 'a');
    outlineRect(grid, 21, by + 10, 6, 6, 'C');
    fillRect(grid, 23, by + 11, 2, 3, 'G');

    outlineRect(grid, 16, by, 16, 11, 'A');
    fillRect(grid, 18, by + 2, 5, 4, 'P');
    fillRect(grid, 25, by + 2, 5, 4, 'P');
    fillRect(grid, 17, by + 7, 14, 3, 'a');
    fillRect(grid, 22, by + 1, 4, 9, 'C');
    setPx(grid, 23, by + 3, 'G');
    setPx(grid, 24, by + 3, 'G');
    setPx(grid, 23, by + 4, 'L');
    setPx(grid, 24, by + 4, 'G');

    // Belt + pouch + brass buckle
    fillRect(grid, 16, by + 9, 16, 3, 'O');
    fillRect(grid, 17, by + 10, 14, 1, 'N');
    fillRect(grid, 18, by + 9, 3, 3, 'B');
    fillRect(grid, 22, by + 9, 4, 3, 'G');
    setPx(grid, 23, by + 10, 'N');
    setPx(grid, 24, by + 10, 'N');

    // Shoulder Pauldrons
    outlineRect(grid, 12, by, 6, 5, 'A');
    drawRow(grid, by + 1, 13, 'PPPP');
    setPx(grid, 16, by + 2, 'G');
    setPx(grid, 17, by + 2, 'G');
    outlineRect(grid, 30, by, 6, 5, 'A');
    drawRow(grid, by + 1, 31, 'PPPP');
    setPx(grid, 30, by + 2, 'G');
    setPx(grid, 31, by + 2, 'G');

    if (equip.capeStyle === 'scarf') {
      outlineRect(grid, 16, by - 1, 16, 4, 'C');
      outlineRect(grid, 26, by + 2, 4, 7, 'C');
      fillRect(grid, 27, by + 6, 2, 2, 'G');
    }
  }

  // Neck
  fillRect(grid, 21, hy + 11, 6, 3, 'O');
  fillRect(grid, 22, hy + 11, 4, 2, 's');

  // =========================================================================
  // 4. HEAD, EARS, HAIR, EXPRESSIVE EYES & FACIAL FEATURES
  // =========================================================================
  if (equip.hairStyle === 'long') {
    outlineRect(grid, 14, hy + 6, 5, 11, 'd');
    fillRect(grid, 15, hy + 7, 3, 9, 'H');
    outlineRect(grid, 29, hy + 6, 5, 11, 'd');
    fillRect(grid, 30, hy + 7, 3, 9, 'H');
  } else if (equip.hairStyle === 'ponytail') {
    outlineRect(grid, 11, hy + 3, 6, 4, 'H');
    outlineRect(grid, 9, hy + 5, 5, 7, 'H');
    fillRect(grid, 10, hy + 7, 3, 4, 'd');
    setPx(grid, 15, hy + 4, 'G');
  } else if (equip.hairStyle === 'braids') {
    outlineRect(grid, 14, hy + 6, 4, 12, 'H');
    setPx(grid, 15, hy + 9, 'd');
    setPx(grid, 15, hy + 12, 'd');
    setPx(grid, 15, hy + 15, 'G');
    outlineRect(grid, 30, hy + 6, 4, 12, 'H');
    setPx(grid, 31, hy + 9, 'd');
    setPx(grid, 31, hy + 12, 'd');
    setPx(grid, 31, hy + 15, 'G');
  }

  // Rounded Head Base
  drawRow(grid, hy + 0, 20, 'OOOOOOOO');
  drawRow(grid, hy + 1, 18, 'OOSSSSSSSSOO');
  drawRow(grid, hy + 2, 17, 'OSSSSSSSSSSSSO');
  for (let dy = 3; dy <= 9; dy += 1) {
    drawRow(grid, hy + dy, 17, 'OSSSSSSSSSSSSO');
  }
  drawRow(grid, hy + 10, 18, 'OOssssssssOO');
  drawRow(grid, hy + 11, 20, 'OOOOOOOO');
  setPx(grid, 18, hy + 8, 's');
  setPx(grid, 18, hy + 9, 's');
  setPx(grid, 29, hy + 8, 's');
  setPx(grid, 29, hy + 9, 's');

  // Dragonborn Snout & Crest Scales
  if (race === 'dragonborn') {
    drawRow(grid, hy + 7, 21, 'SSSSSS');
    drawRow(grid, hy + 8, 22, 'ss..ss');
    setPx(grid, 15, hy + 3, 'G');
    setPx(grid, 14, hy + 2, 'G');
    setPx(grid, 32, hy + 3, 'G');
    setPx(grid, 33, hy + 2, 'G');
  }

  // Ears
  if (race === 'elf') {
    drawRow(grid, hy + 5, 12, 'OOSSSO');
    drawRow(grid, hy + 6, 13, 'OOssO');
    drawRow(grid, hy + 7, 15, 'OO');
    drawRow(grid, hy + 5, 30, 'OSSSOO');
    drawRow(grid, hy + 6, 30, 'OssOO');
    drawRow(grid, hy + 7, 31, 'OO');
  } else if (race !== 'dragonborn') {
    outlineRect(grid, 15, hy + 5, 3, 4, 's');
    outlineRect(grid, 30, hy + 5, 3, 4, 's');
  }

  // Eyes (Closed in 'rest', drooping in 'droop', bright 3x3 with iris & catchlight otherwise)
  if (isRest) {
    drawRow(grid, hy + 6, 19, 'EEE');
    drawRow(grid, hy + 6, 26, 'EEE');
    setPx(grid, 20, hy + 7, 's');
    setPx(grid, 27, hy + 7, 's');
  } else {
    const browY = isDroop ? hy + 5 : hy + 4;
    drawRow(grid, browY, 19, 'ddd');
    drawRow(grid, browY, 26, 'ddd');

    if (!isDroop) {
      drawRow(grid, hy + 5, 19, 'EEE');
      drawRow(grid, hy + 5, 26, 'EEE');
    }
    setPx(grid, 19, hy + 6, 'L');
    setPx(grid, 20, hy + 6, 'E');
    setPx(grid, 21, hy + 6, 'I');
    setPx(grid, 19, hy + 7, 'S');
    setPx(grid, 20, hy + 7, 'I');
    setPx(grid, 21, hy + 7, 'I');

    setPx(grid, 26, hy + 6, 'L');
    setPx(grid, 27, hy + 6, 'E');
    setPx(grid, 28, hy + 6, 'I');
    setPx(grid, 26, hy + 7, 'I');
    setPx(grid, 27, hy + 7, 'I');
    setPx(grid, 28, hy + 7, 'S');
  }

  // Nose, Mouth & Orc Tusks
  setPx(grid, 24, hy + 7, 's');
  if (isHappy || isEat) {
    drawRow(grid, hy + 9, 22, 'sLLs');
  } else if (isDroop) {
    drawRow(grid, hy + 9, 22, 'ssss');
  } else {
    drawRow(grid, hy + 9, 23, 'ss');
  }

  if (race === 'orc') {
    setPx(grid, 20, hy + 8, 'L');
    setPx(grid, 20, hy + 9, 'L');
    setPx(grid, 27, hy + 8, 'L');
    setPx(grid, 27, hy + 9, 'L');
  }

  // Hair Bangs & Crown (skipped when bald)
  if (equip.hairStyle !== 'bald') {
    drawRow(grid, hy - 1, 19, 'OOOOOOOOOO');
    drawRow(grid, hy + 0, 17, 'OOhhhhhhhhhhOO');
    drawRow(grid, hy + 1, 16, 'OhHHHHHHHHHHHHhO');
    drawRow(grid, hy + 2, 16, 'OHHHhHHHHHHhHHHO');
    drawRow(grid, hy + 3, 16, 'OHHdSSdHHdSSdHHO');
    drawRow(grid, hy + 4, 16, 'OHd....dd....dHO');
    setPx(grid, 16, hy + 5, 'O');
    setPx(grid, 17, hy + 5, 'd');
    setPx(grid, 30, hy + 5, 'd');
    setPx(grid, 31, hy + 5, 'O');

    if (equip.hairStyle === 'mohawk') {
      outlineRect(grid, 21, hy - 4, 6, 5, 'H');
      fillRect(grid, 22, hy - 3, 3, 2, 'h');
    }
  } else if (race === 'dragonborn') {
    // Sculpted draconic brow ridge
    drawRow(grid, hy + 0, 20, 'OGGGGGGO');
    drawRow(grid, hy + 1, 19, 'OSSSSSSSSO');
  }

  // Facial Features (Scar, Eyepatch, Glasses, Mustache, Beards)
  if (equip.facialFeature === 'scar') {
    setPx(grid, 20, hy + 3, 'c');
    setPx(grid, 20, hy + 4, 'c');
    setPx(grid, 20, hy + 8, 'c');
    setPx(grid, 20, hy + 9, 'c');
  } else if (equip.facialFeature === 'eyepatch') {
    for (let i = 0; i < 13; i += 1) {
      setPx(grid, 17 + i, hy + 3 + Math.floor(i / 5), 'O');
    }
    fillRect(grid, 18, hy + 5, 5, 3, 'O');
    setPx(grid, 19, hy + 6, 'N');
    setPx(grid, 20, hy + 6, 'N');
  } else if (equip.facialFeature === 'glasses') {
    outlineRect(grid, 18, hy + 5, 5, 4, 'L');
    setPx(grid, 20, hy + 6, 'I');
    outlineRect(grid, 25, hy + 5, 5, 4, 'L');
    setPx(grid, 27, hy + 6, 'I');
    drawRow(grid, hy + 6, 23, 'GG');
  } else if (equip.facialFeature === 'mustache') {
    drawRow(grid, hy + 8, 19, 'OHHHHHHHHHHO');
    drawRow(grid, hy + 9, 18, 'OHhH....HhHO');
  } else if (equip.facialFeature === 'short_beard') {
    drawRow(grid, hy + 8, 19, 'OHHHHHHHHHHO');
    outlineRect(grid, 18, hy + 9, 12, 4, 'H');
    drawRow(grid, hy + 10, 20, 'hHHHHHHh');
  } else if (equip.facialFeature === 'braided_beard') {
    drawRow(grid, hy + 8, 19, 'OHHHHHHHHHHO');
    drawRow(grid, hy + 9, 18, 'OHhHHHHHHHHhHO');
    outlineRect(grid, 18, hy + 10, 12, 4, 'H');
    drawRow(grid, hy + 11, 20, 'hHHd..dHHh');
    outlineRect(grid, 19, hy + 13, 4, 5, 'H');
    outlineRect(grid, 25, hy + 13, 4, 5, 'H');
    fillRect(grid, 20, hy + 15, 2, 1, 'G');
    fillRect(grid, 26, hy + 15, 2, 1, 'G');
  }

  // Tiefling Horns (drawn above hair and hoods!)
  if (race === 'tiefling') {
    const lHorn: Array<[number, number]> = [
      [18, hy + 1],
      [16, hy],
      [14, hy - 2],
      [13, hy - 4],
      [13, hy - 6],
    ];
    const rHorn: Array<[number, number]> = [
      [29, hy + 1],
      [31, hy],
      [33, hy - 2],
      [34, hy - 4],
      [34, hy - 6],
    ];
    for (const pts of [lHorn, rHorn]) {
      for (const [hx, hhy] of pts) {
        fillRect(grid, hx - 1, hhy - 1, 3, 3, 'O');
      }
      pts.forEach(([hx, hhy], idx) => {
        setPx(grid, hx, hhy, idx === 4 ? 'G' : idx % 2 === 0 ? 'N' : 'B');
      });
    }
  }

  // Headgear
  if (equip.headgear === 'plumet') {
    outlineRect(grid, 16, hy + 1, 16, 4, 'P');
    drawRow(grid, hy + 3, 17, 'GGGGGGGGGGGGGG');
    outlineRect(grid, 21, hy - 5, 7, 6, 'C');
    fillRect(grid, 22, hy - 4, 3, 3, 'G');
    outlineRect(grid, 25, hy - 6, 6, 4, 'C');
  } else if (equip.headgear === 'wizard_hat') {
    outlineRect(grid, 12, hy + 1, 24, 3, 'C');
    drawRow(grid, hy + 1, 17, 'GGGGGGGGGGGGGG');
    outlineRect(grid, 17, hy - 3, 14, 5, 'C');
    outlineRect(grid, 20, hy - 6, 9, 4, 'C');
    outlineRect(grid, 23, hy - 8, 6, 3, 'c');
    setPx(grid, 23, hy + 1, 'L');
  } else if (equip.headgear === 'hood') {
    outlineRect(grid, 15, hy - 1, 18, 5, 'C');
    fillRect(grid, 15, hy + 3, 3, 7, 'C');
    fillRect(grid, 30, hy + 3, 3, 7, 'C');
    setPx(grid, 14, hy + 4, 'O');
    setPx(grid, 33, hy + 4, 'O');
  } else if (equip.headgear === 'bard_hat') {
    outlineRect(grid, 13, hy + 0, 22, 4, 'C');
    drawRow(grid, hy + 2, 16, 'GGGGGGGGGGGGGGGG');
    // Sweeping white/gold feather
    const fPts: Array<[number, number]> = [
      [29, hy],
      [31, hy - 2],
      [33, hy - 4],
      [35, hy - 5],
    ];
    for (const [fx, fy] of fPts) {
      fillRect(grid, fx - 1, fy - 1, 3, 3, 'O');
    }
    for (const [fx, fy] of fPts) {
      setPx(grid, fx, fy, 'L');
      setPx(grid, fx - 1, fy, 'G');
    }
  } else if (equip.headgear === 'horned_band') {
    outlineRect(grid, 16, hy + 1, 16, 3, 'N');
    drawRow(grid, hy + 2, 18, 'G..G..G..G..G');
    const lh: Array<[number, number]> = [
      [15, hy + 1],
      [13, hy - 1],
      [12, hy - 3],
      [13, hy - 5],
    ];
    const rh: Array<[number, number]> = [
      [32, hy + 1],
      [34, hy - 1],
      [35, hy - 3],
      [34, hy - 5],
    ];
    for (const pts of [lh, rh]) {
      for (const [hx, hhy] of pts) fillRect(grid, hx - 1, hhy - 1, 3, 3, 'O');
      pts.forEach(([hx, hhy], idx) => setPx(grid, hx, hhy, idx >= 2 ? 'L' : 'W'));
    }
  } else if (equip.headgear === 'circlet') {
    drawRow(grid, hy + 2, 17, 'OGGGGGGGGGGGGGGO');
    outlineRect(grid, 22, hy, 4, 4, 'G');
    setPx(grid, 23, hy + 1, 'L');
    setPx(grid, 24, hy + 1, 'I');
  } else if (equip.headgear === 'crown') {
    outlineRect(grid, 17, hy - 3, 14, 6, 'G');
    drawRow(grid, hy - 3, 18, 'G.OO.G.OO.G.');
    setPx(grid, 20, hy, 'C');
    setPx(grid, 24, hy, 'L');
    setPx(grid, 27, hy, 'C');
  }

  // =========================================================================
  // 5. ARMS, HANDS, PROPS & WEAPONS (stowed during 'rest')
  // =========================================================================
  if (!isRest) {
    const lArmSwing = isWalking ? (walkPhase === 0 ? 1 : walkPhase === 2 ? -1 : 0) : 0;
    const rArmSwing = isWalking ? (walkPhase === 2 ? 1 : walkPhase === 0 ? -1 : 0) : 0;
    const lArmY = isHappy ? by - 2 : by + 3 + lArmSwing;
    const rArmY = isHappy ? by - 4 : isEat ? by - 3 : by + 3 + rArmSwing;

    // Left Arm
    outlineRect(grid, 12, lArmY, 5, 6, 'A');
    fillRect(grid, 13, lArmY + 3, 3, 2, 'N');
    outlineRect(grid, 12, lArmY + 5, 5, 4, 'S');
    setPx(grid, 13, lArmY + 7, 's');

    // Right Arm
    outlineRect(grid, 31, rArmY, 5, 6, 'A');
    fillRect(grid, 32, rArmY + 3, 3, 2, 'N');
    outlineRect(grid, 31, rArmY + 5, 5, 4, 'S');
    setPx(grid, 34, rArmY + 7, 's');

    if (isEat) {
      // Roasted tavern drumstick near mouth!
      outlineRect(grid, 33, hy + 6, 8, 6, 'B');
      fillRect(grid, 34, hy + 7, 5, 3, 'C');
      setPx(grid, 35, hy + 7, 'G');
      outlineRect(grid, 40, hy + 8, 5, 3, 'L');
    } else {
      // 6. OFF-HAND (Left side)
      if (equip.offHand === 'heater_shield') {
        const sx = 4;
        const sy = lArmY - 1;
        fillRect(grid, sx, sy, 11, 9, 'O');
        drawRow(grid, sy + 9, sx + 1, 'OOOOOOOOO');
        drawRow(grid, sy + 10, sx + 2, 'OOOOOOO');
        drawRow(grid, sy + 11, sx + 3, 'OOOOO');
        drawRow(grid, sy + 12, sx + 4, 'OOO');
        fillRect(grid, sx + 1, sy + 1, 9, 7, 'G');
        drawRow(grid, sy + 8, sx + 2, 'GGGGGGG');
        drawRow(grid, sy + 9, sx + 3, 'GGGGG');
        drawRow(grid, sy + 10, sx + 4, 'GGG');
        setPx(grid, sx + 5, sy + 11, 'G');
        fillRect(grid, sx + 2, sy + 2, 7, 5, 'C');
        drawRow(grid, sy + 7, sx + 3, 'CCCCC');
        drawRow(grid, sy + 8, sx + 4, 'CCC');
        fillRect(grid, sx + 4, sy + 4, 3, 3, 'G');
        setPx(grid, sx + 5, sy + 5, 'L');
      } else if (equip.offHand === 'round_shield') {
        const sx = 4;
        const sy = lArmY;
        outlineRect(grid, sx + 1, sy, 9, 11, 'G');
        outlineRect(grid, sx, sy + 1, 11, 9, 'G');
        fillRect(grid, sx + 2, sy + 2, 7, 7, 'A');
        outlineRect(grid, sx + 4, sy + 4, 3, 3, 'L');
      } else if (equip.offHand === 'tome') {
        const sx = 4;
        const sy = lArmY + 1;
        outlineRect(grid, sx, sy, 9, 10, 'C');
        drawRow(grid, sy + 1, sx + 1, 'LLLLLLL');
        fillRect(grid, sx + 1, sy + 2, 1, 7, 'G');
        fillRect(grid, sx + 4, sy + 4, 3, 3, 'G');
        setPx(grid, sx + 5, sy + 5, 'L');
      } else if (equip.offHand === 'mug') {
        const sx = 4;
        const sy = lArmY + 1;
        outlineRect(grid, sx + 2, sy + 2, 8, 9, 'B');
        fillRect(grid, sx + 3, sy + 4, 6, 2, 'G');
        fillRect(grid, sx + 3, sy + 8, 6, 1, 'G');
        outlineRect(grid, sx + 1, sy, 9, 4, 'L');
        outlineRect(grid, sx, sy + 4, 3, 5, 'G');
      } else if (equip.offHand === 'lantern') {
        const sx = 5;
        const sy = lArmY + 2;
        drawRow(grid, sy, sx + 2, 'OOOO');
        outlineRect(grid, sx + 1, sy + 1, 6, 3, 'N');
        outlineRect(grid, sx, sy + 3, 8, 8, 'G');
        fillRect(grid, sx + 2, sy + 5, 4, 4, 'L');
        outlineRect(grid, sx + 1, sy + 10, 6, 2, 'N');
      } else if (equip.offHand === 'dagger') {
        const sx = 5;
        const sy = lArmY + 4;
        drawRow(grid, sy, sx + 4, 'OGGO');
        for (let i = 1; i <= 6; i += 1) {
          setPx(grid, sx + 5 - i, sy + i, 'O');
          setPx(grid, sx + 6 - i, sy + i, 'L');
          setPx(grid, sx + 7 - i, sy + i, 'W');
          setPx(grid, sx + 8 - i, sy + i, 'O');
        }
      }

      // 7. MAIN-HAND WEAPON (Right side)
      const wy = Math.max(1, isHappy ? hy - 3 : hy + 2 + rArmSwing);
      if (equip.mainHand === 'sword') {
        drawRow(grid, wy, 37, 'OO');
        drawRow(grid, wy + 1, 36, 'OLWO');
        for (let i = 2; i < 19; i += 1) {
          setPx(grid, 36, wy + i, 'O');
          setPx(grid, 37, wy + i, 'L');
          setPx(grid, 38, wy + i, i % 4 === 0 ? 'L' : 'W');
          setPx(grid, 39, wy + i, 'O');
        }
        outlineRect(grid, 33, wy + 19, 10, 3, 'G');
        setPx(grid, 37, wy + 20, 'C');
        setPx(grid, 38, wy + 20, 'C');
        outlineRect(grid, 36, wy + 21, 4, 4, 'N');
        outlineRect(grid, 36, wy + 24, 4, 3, 'G');
      } else if (equip.mainHand === 'greatsword') {
        drawRow(grid, wy, 37, 'OOO');
        for (let i = 1; i < 22; i += 1) {
          setPx(grid, 35, wy + i, 'O');
          setPx(grid, 36, wy + i, 'L');
          setPx(grid, 37, wy + i, 'G');
          setPx(grid, 38, wy + i, 'W');
          setPx(grid, 39, wy + i, 'W');
          setPx(grid, 40, wy + i, 'O');
        }
        outlineRect(grid, 32, wy + 21, 12, 3, 'G');
        outlineRect(grid, 36, wy + 23, 4, 5, 'N');
        outlineRect(grid, 36, wy + 27, 4, 3, 'G');
      } else if (equip.mainHand === 'axe') {
        outlineRect(grid, 36, wy, 4, 3, 'G');
        for (let i = 3; i < 28; i += 1) {
          setPx(grid, 36, wy + i, 'O');
          setPx(grid, 37, wy + i, 'B');
          setPx(grid, 38, wy + i, 'N');
          setPx(grid, 39, wy + i, 'O');
        }
        for (let dy = 4; dy <= 16; dy += 1) {
          const dist = Math.abs(dy - 10);
          const reach = dist <= 2 ? 45 : dist <= 4 ? 46 : 44;
          for (let x = 39; x <= reach; x += 1) {
            const isEdge = x >= reach - 1;
            setPx(grid, x, wy + dy, x === reach ? 'O' : isEdge ? 'L' : 'W');
          }
          setPx(grid, 39, wy + dy, 'a');
        }
        drawRow(grid, wy + 3, 39, 'OOOOOOO');
        drawRow(grid, wy + 17, 39, 'OOOOOO');
        fillRect(grid, 41, wy + 9, 2, 3, 'G');
        setPx(grid, 42, wy + 8, 'G');
      } else if (equip.mainHand === 'hammer') {
        for (let i = 5; i < 27; i += 1) {
          setPx(grid, 36, wy + i, 'O');
          setPx(grid, 37, wy + i, 'B');
          setPx(grid, 38, wy + i, 'N');
          setPx(grid, 39, wy + i, 'O');
        }
        outlineRect(grid, 32, wy + 2, 13, 8, 'W');
        fillRect(grid, 33, wy + 3, 11, 2, 'L');
        outlineRect(grid, 36, wy + 3, 4, 6, 'G');
      } else if (equip.mainHand === 'dagger') {
        const dy0 = wy + 10;
        drawRow(grid, dy0, 37, 'OO');
        for (let i = 1; i < 9; i += 1) {
          setPx(grid, 36, dy0 + i, 'O');
          setPx(grid, 37, dy0 + i, 'L');
          setPx(grid, 38, dy0 + i, 'W');
          setPx(grid, 39, dy0 + i, 'O');
        }
        outlineRect(grid, 35, dy0 + 9, 6, 2, 'G');
        outlineRect(grid, 36, dy0 + 11, 4, 4, 'N');
      } else if (equip.mainHand === 'staff') {
        for (let i = 7; i < 30; i += 1) {
          setPx(grid, 36, wy + i, 'O');
          setPx(grid, 37, wy + i, 'B');
          setPx(grid, 38, wy + i, 'N');
          setPx(grid, 39, wy + i, 'O');
          if (i === 11 || i === 24) {
            setPx(grid, 37, wy + i, 'G');
            setPx(grid, 38, wy + i, 'G');
          }
        }
        outlineRect(grid, 33, wy + 5, 10, 4, 'G');
        outlineRect(grid, 33, wy + 2, 3, 4, 'G');
        outlineRect(grid, 40, wy + 2, 3, 4, 'G');
        outlineRect(grid, 36, wy, 4, 5, 'G');
        setPx(grid, 37, wy + 1, 'L');
        setPx(grid, 37, wy + 2, 'I');
        setPx(grid, 38, wy + 2, 'L');
        if (frame % 2 === 0) {
          setPx(grid, 34, Math.max(0, wy - 1), 'L');
          setPx(grid, 42, wy + 1, 'G');
        } else {
          setPx(grid, 41, Math.max(0, wy - 1), 'L');
          setPx(grid, 33, wy + 1, 'G');
        }
      } else if (equip.mainHand === 'bow') {
        for (let i = 2; i < 25; i += 1) setPx(grid, 35, wy + i, 'L');
        const curve: Array<[number, number]> = [
          [36, 1], [37, 2], [38, 3], [39, 4], [40, 5], [40, 6], [41, 7], [41, 8],
          [40, 9], [40, 10], [39, 11], [39, 12], [39, 13], [39, 14], [39, 15],
          [40, 16], [40, 17], [41, 18], [41, 19], [40, 20], [40, 21], [39, 22], [38, 23], [37, 24], [36, 25],
        ];
        for (const [bx, dy] of curve) {
          fillRect(grid, bx - 1, wy + dy - 1, 4, 3, 'O');
        }
        curve.forEach(([bx, dy], idx) => {
          const isGrip = dy >= 11 && dy <= 15;
          const isTip = idx < 2 || idx > curve.length - 3;
          setPx(grid, bx, wy + dy, isTip ? 'G' : isGrip ? 'L' : 'B');
          setPx(grid, bx + 1, wy + dy, isGrip ? 'G' : 'N');
        });
      } else if (equip.mainHand === 'lute') {
        const ly0 = wy + 6;
        outlineRect(grid, 36, ly0, 4, 9, 'N');
        setPx(grid, 37, ly0 + 1, 'G');
        outlineRect(grid, 33, ly0 + 8, 10, 11, 'B');
        fillRect(grid, 35, ly0 + 10, 6, 7, 'h');
        outlineRect(grid, 36, ly0 + 12, 4, 4, 'O');
        for (let s = 2; s < 14; s += 1) setPx(grid, 37, ly0 + s, 'L');
      } else if (equip.mainHand === 'ladle') {
        for (let i = 5; i < 24; i += 1) {
          setPx(grid, 36, wy + i, 'O');
          setPx(grid, 37, wy + i, 'L');
          setPx(grid, 38, wy + i, 'W');
          setPx(grid, 39, wy + i, 'O');
        }
        outlineRect(grid, 34, wy + 1, 9, 6, 'W');
        fillRect(grid, 35, wy + 2, 7, 2, 'L');
      }
    }
  }

  // Sparkling gleam particles during 'clean'
  if (isClean) {
    const spA: Array<[number, number]> =
      frame % 2 === 0
        ? [[10, hy + 2], [37, hy + 1], [12, by + 11]]
        : [[13, hy - 2], [35, by + 9], [9, by + 3]];
    for (const [sx, sy] of spA) {
      setPx(grid, sx, sy, 'L');
      setPx(grid, sx - 1, sy, 'G');
      setPx(grid, sx + 1, sy, 'G');
      setPx(grid, sx, sy - 1, 'G');
      setPx(grid, sx, sy + 1, 'G');
    }
  }

  const tokenColor: Record<string, string> = {
    O: palette.outline,
    S: palette.skin,
    s: palette.skinShadow,
    H: palette.hair,
    h: palette.hairHighlight,
    d: palette.hairDark,
    I: palette.iris,
    A: palette.primary,
    a: palette.primaryShadow,
    P: palette.primaryHighlight,
    C: palette.accent,
    c: palette.accentShadow,
    W: palette.weapon,
    L: palette.gleam,
    G: palette.gem,
    E: palette.eye,
    B: palette.boot,
    N: palette.leatherDark,
  };

  // Run-length encode per row for crisp, fast 48x48 SVG rendering
  const rects: PixelRect[] = [];
  for (let y = 0; y < SPRITE_GRID_SIZE; y += 1) {
    let x = 0;
    while (x < SPRITE_GRID_SIZE) {
      const tok = grid[y][x];
      const fill = tokenColor[tok];
      if (!fill) {
        x += 1;
        continue;
      }
      let w = 1;
      while (x + w < SPRITE_GRID_SIZE && grid[y][x + w] === tok) {
        w += 1;
      }
      rects.push({ x, y, w, h: 1, fill });
      x += w;
    }
  }

  return rects;
}

export function deriveAutonomousBehavior(stats: {
  hunger: number;
  happiness: number;
  energy: number;
  hygiene: number;
}): AutonomousBehavior {
  const entries: { key: 'hunger' | 'energy' | 'happiness' | 'hygiene'; val: number }[] = [
    { key: 'hunger', val: stats.hunger },
    { key: 'energy', val: stats.energy },
    { key: 'hygiene', val: stats.hygiene },
    { key: 'happiness', val: stats.happiness },
  ];
  entries.sort((a, b) => a.val - b.val);
  const lowest = entries[0];

  if (lowest.val < 50) {
    switch (lowest.key) {
      case 'hunger':
        return {
          urgentNeed: 'hunger',
          paceMs: 1100,
          pauseMs: 900,
          restChance: 0,
          jittery: lowest.val < 30,
          thoughtTag: 'food',
          thoughtText: '🍖?',
        };
      case 'energy':
        return {
          urgentNeed: 'energy',
          paceMs: 2400,
          pauseMs: 2600,
          restChance: lowest.val < 30 ? 0.8 : 0.55,
          jittery: false,
          thoughtTag: 'sleep',
          thoughtText: 'Zzz',
        };
      case 'hygiene':
        return {
          urgentNeed: 'hygiene',
          paceMs: 1350,
          pauseMs: 1100,
          restChance: 0.1,
          jittery: lowest.val < 30,
          thoughtTag: 'clean',
          thoughtText: '✨?',
        };
      case 'happiness':
        return {
          urgentNeed: 'happiness',
          paceMs: 1500,
          pauseMs: 1400,
          restChance: 0.15,
          jittery: lowest.val < 30,
          thoughtTag: 'bored',
          thoughtText: '...',
        };
    }
  }

  const allHigh =
    stats.hunger >= 75 &&
    stats.happiness >= 75 &&
    stats.energy >= 75 &&
    stats.hygiene >= 75;

  return {
    urgentNeed: null,
    paceMs: allHigh ? 1300 : 1650,
    pauseMs: allHigh ? 1000 : 1500,
    restChance: 0.1,
    jittery: false,
    thoughtTag: allHigh ? 'happy' : null,
    thoughtText: allHigh ? '♥' : null,
  };
}

export function poseForAction(action: TamagotchiAction | null, frame: number): SpritePose | null {
  if (!action) return null;
  switch (action) {
    case 'feed':
      return frame % 2 === 0 ? 'eat' : 'happy';
    case 'play':
      return frame % 2 === 0 ? 'happy' : 'walk_a';
    case 'rest':
      return 'rest';
    case 'clean':
      return frame % 2 === 0 ? 'clean' : 'idle_b';
    case 'pet':
      return frame % 2 === 0 ? 'happy' : 'idle_a';
  }
}

export function moodToDefaultPose(mood: TamagotchiMood, frame: number): SpritePose {
  if (mood === 'assonnato') return 'rest';
  if (mood === 'affamato' || mood === 'trascurato' || mood === 'annoiato') {
    return frame % 2 === 0 ? 'droop' : 'idle_b';
  }
  return frame % 2 === 0 ? 'idle_a' : 'idle_b';
}
