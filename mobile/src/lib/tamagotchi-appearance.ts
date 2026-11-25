/**
 * Pure catalog and normalization helpers for Tavern 48x48 character customization.
 * All options are unlocked from the start and strictly cosmetic (no D&D 5e sheet impact).
 */

export type SkinSwatchId =
  | 'auto'
  | 'fair'
  | 'warm'
  | 'bronze'
  | 'ebony'
  | 'moon_elf'
  | 'crimson_tiefling'
  | 'indigo_tiefling'
  | 'gold_scale'
  | 'red_scale'
  | 'orc_green'
  | 'stone_grey';

export type EyeSwatchId =
  | 'auto'
  | 'sapphire'
  | 'emerald'
  | 'amber'
  | 'hazel'
  | 'amethyst'
  | 'ruby'
  | 'ice'
  | 'obsidian';

export type HairStyleId =
  | 'auto'
  | 'short'
  | 'long'
  | 'ponytail'
  | 'mohawk'
  | 'braids'
  | 'bald';

export type HairSwatchId =
  | 'auto'
  | 'chestnut'
  | 'raven'
  | 'gold'
  | 'copper'
  | 'silver'
  | 'snow'
  | 'mystic'
  | 'midnight'
  | 'forest';

export type FacialFeatureId =
  | 'auto'
  | 'none'
  | 'short_beard'
  | 'braided_beard'
  | 'mustache'
  | 'eyepatch'
  | 'scar'
  | 'glasses';

export type OutfitSwatchId =
  | 'auto'
  | 'steel'
  | 'arcane_blue'
  | 'shadow'
  | 'ivory_temple'
  | 'crimson'
  | 'wild_leather'
  | 'ranger_green'
  | 'monk_ochre'
  | 'obsidian'
  | 'brass_gold';

export type AccentSwatchId =
  | 'auto'
  | 'crimson'
  | 'royal_gold'
  | 'violet'
  | 'emerald'
  | 'azure'
  | 'bronze'
  | 'ivory'
  | 'charcoal';

export type HeadgearId =
  | 'auto'
  | 'none'
  | 'plumet'
  | 'wizard_hat'
  | 'hood'
  | 'bard_hat'
  | 'horned_band'
  | 'circlet'
  | 'crown';

export type CapeStyleId =
  | 'auto'
  | 'none'
  | 'long_cape'
  | 'short_cloak'
  | 'scarf';

export type MainHandId =
  | 'auto'
  | 'none'
  | 'sword'
  | 'greatsword'
  | 'axe'
  | 'hammer'
  | 'dagger'
  | 'staff'
  | 'bow'
  | 'lute'
  | 'ladle';

export type OffHandId =
  | 'auto'
  | 'none'
  | 'heater_shield'
  | 'round_shield'
  | 'tome'
  | 'dagger'
  | 'lantern'
  | 'mug';

export interface TamagotchiAppearance {
  skinSwatch?: Exclude<SkinSwatchId, 'auto'>;
  eyeSwatch?: Exclude<EyeSwatchId, 'auto'>;
  hairStyle?: Exclude<HairStyleId, 'auto'>;
  hairSwatch?: Exclude<HairSwatchId, 'auto'>;
  facialFeature?: Exclude<FacialFeatureId, 'auto'>;
  outfitSwatch?: Exclude<OutfitSwatchId, 'auto'>;
  accentSwatch?: Exclude<AccentSwatchId, 'auto'>;
  headgear?: Exclude<HeadgearId, 'auto'>;
  capeStyle?: Exclude<CapeStyleId, 'auto'>;
  mainHand?: Exclude<MainHandId, 'auto'>;
  offHand?: Exclude<OffHandId, 'auto'>;
}

export interface SwatchOption<T extends string> {
  id: T;
  label: string;
  previewHex?: string;
  secondaryHex?: string;
}

export const SKIN_SWATCH_OPTIONS: readonly SwatchOption<SkinSwatchId>[] = [
  { id: 'auto', label: 'Razza' },
  { id: 'fair', label: 'Chiara', previewHex: '#F2C29B', secondaryHex: '#C98F67' },
  { id: 'warm', label: 'Ambrata', previewHex: '#DFA072', secondaryHex: '#B07348' },
  { id: 'bronze', label: 'Bronzo', previewHex: '#BA7D4D', secondaryHex: '#8C5730' },
  { id: 'ebony', label: 'Ebano', previewHex: '#704832', secondaryHex: '#4A2D1D' },
  { id: 'moon_elf', label: 'Lunare', previewHex: '#DCE6F2', secondaryHex: '#A6B8CE' },
  { id: 'crimson_tiefling', label: 'Cremisi', previewHex: '#CC525A', secondaryHex: '#96323B' },
  { id: 'indigo_tiefling', label: 'Indaco', previewHex: '#736FD0', secondaryHex: '#4D489E' },
  { id: 'gold_scale', label: 'Squame Oro', previewHex: '#C89B3C', secondaryHex: '#926B1F' },
  { id: 'red_scale', label: 'Squame Rosse', previewHex: '#B83B2A', secondaryHex: '#7F2216' },
  { id: 'orc_green', label: 'Verde', previewHex: '#749E57', secondaryHex: '#4F7438' },
  { id: 'stone_grey', label: 'Pietra', previewHex: '#94A3B8', secondaryHex: '#64748B' },
];

export const EYE_SWATCH_OPTIONS: readonly SwatchOption<EyeSwatchId>[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'sapphire', label: 'Zaffiro', previewHex: '#2563EB' },
  { id: 'emerald', label: 'Smeraldo', previewHex: '#10B981' },
  { id: 'amber', label: 'Ambra', previewHex: '#D97706' },
  { id: 'hazel', label: 'Nocciola', previewHex: '#854D0E' },
  { id: 'amethyst', label: 'Ametista', previewHex: '#9333EA' },
  { id: 'ruby', label: 'Rubino', previewHex: '#DC2626' },
  { id: 'ice', label: 'Ghiaccio', previewHex: '#38BDF8' },
  { id: 'obsidian', label: 'Ossidiana', previewHex: '#1E1B24' },
];

export const HAIR_STYLE_OPTIONS: readonly SwatchOption<HairStyleId>[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'short', label: 'Corti Eroici' },
  { id: 'long', label: 'Lunghi Sciolti' },
  { id: 'ponytail', label: 'Coda Alta' },
  { id: 'mohawk', label: 'Cresta' },
  { id: 'braids', label: 'Trecce' },
  { id: 'bald', label: 'Rasato' },
];

export const HAIR_SWATCH_OPTIONS: readonly SwatchOption<HairSwatchId>[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'chestnut', label: 'Castano', previewHex: '#4A2E1B', secondaryHex: '#7C5134' },
  { id: 'raven', label: 'Corvino', previewHex: '#232230', secondaryHex: '#4E4C68' },
  { id: 'gold', label: 'Biondo Oro', previewHex: '#D99E32', secondaryHex: '#FBE074' },
  { id: 'copper', label: 'Ramato', previewHex: '#AD3B23', secondaryHex: '#E66D4E' },
  { id: 'silver', label: 'Argento', previewHex: '#B8C4D0', secondaryHex: '#F8FAFC' },
  { id: 'snow', label: 'Neve', previewHex: '#E2E8F0', secondaryHex: '#FFFFFF' },
  { id: 'mystic', label: 'Mistico', previewHex: '#74348F', secondaryHex: '#B05FD1' },
  { id: 'midnight', label: 'Blu Notte', previewHex: '#1E3A8A', secondaryHex: '#3B82F6' },
  { id: 'forest', label: 'Bosco', previewHex: '#166534', secondaryHex: '#22C55E' },
];

export const FACIAL_FEATURE_OPTIONS: readonly SwatchOption<FacialFeatureId>[] = [
  { id: 'auto', label: 'Razza' },
  { id: 'none', label: 'Nessuno' },
  { id: 'short_beard', label: 'Barba Corta' },
  { id: 'braided_beard', label: 'Barba Trecce' },
  { id: 'mustache', label: 'Baffi' },
  { id: 'eyepatch', label: 'Benda Occhio' },
  { id: 'scar', label: 'Cicatrice' },
  { id: 'glasses', label: 'Occhiali' },
];

export const OUTFIT_SWATCH_OPTIONS: readonly SwatchOption<OutfitSwatchId>[] = [
  { id: 'auto', label: 'Classe' },
  { id: 'steel', label: 'Acciaio', previewHex: '#5B708B', secondaryHex: '#8CA3BF' },
  { id: 'arcane_blue', label: 'Arcano', previewHex: '#2B4285', secondaryHex: '#4F6EC4' },
  { id: 'shadow', label: 'Ombra', previewHex: '#2F3640', secondaryHex: '#57606F' },
  { id: 'ivory_temple', label: 'Tempio', previewHex: '#CBD5E1', secondaryHex: '#F8FAFC' },
  { id: 'crimson', label: 'Cremisi', previewHex: '#9D174D', secondaryHex: '#DB2777' },
  { id: 'wild_leather', label: 'Cuoio', previewHex: '#804B2D', secondaryHex: '#AD6D48' },
  { id: 'ranger_green', label: 'Ranger', previewHex: '#2B5C35', secondaryHex: '#4A8A57' },
  { id: 'monk_ochre', label: 'Ocra', previewHex: '#B45309', secondaryHex: '#F59E0B' },
  { id: 'obsidian', label: 'Ossidiana', previewHex: '#27272E', secondaryHex: '#525260' },
  { id: 'brass_gold', label: 'Ottone', previewHex: '#B4861E', secondaryHex: '#EAB308' },
];

export const ACCENT_SWATCH_OPTIONS: readonly SwatchOption<AccentSwatchId>[] = [
  { id: 'auto', label: 'Classe' },
  { id: 'crimson', label: 'Rosso', previewHex: '#A82828', secondaryHex: '#FACC15' },
  { id: 'royal_gold', label: 'Oro Gilda', previewHex: '#D99B26', secondaryHex: '#FEF08A' },
  { id: 'violet', label: 'Viola', previewHex: '#7E3AF2', secondaryHex: '#38BDF8' },
  { id: 'emerald', label: 'Smeraldo', previewHex: '#15803D', secondaryHex: '#4ADE80' },
  { id: 'azure', label: 'Azzurro', previewHex: '#0284C7', secondaryHex: '#E0F2FE' },
  { id: 'bronze', label: 'Bronzo', previewHex: '#9A4412', secondaryHex: '#FBBF24' },
  { id: 'ivory', label: 'Avorio', previewHex: '#E2E8F0', secondaryHex: '#FACC15' },
  { id: 'charcoal', label: 'Antracite', previewHex: '#334155', secondaryHex: '#F472B6' },
];

export const HEADGEAR_OPTIONS: readonly SwatchOption<HeadgearId>[] = [
  { id: 'auto', label: 'Classe' },
  { id: 'none', label: 'Nessuno' },
  { id: 'plumet', label: 'Elmo Piumato' },
  { id: 'wizard_hat', label: 'Cappello Mago' },
  { id: 'hood', label: 'Cappuccio' },
  { id: 'bard_hat', label: 'Cappello Bardo' },
  { id: 'horned_band', label: 'Fascia Cornuta' },
  { id: 'circlet', label: 'Diadema' },
  { id: 'crown', label: 'Corona' },
];

export const CAPE_STYLE_OPTIONS: readonly SwatchOption<CapeStyleId>[] = [
  { id: 'auto', label: 'Classe' },
  { id: 'none', label: 'Nessuno' },
  { id: 'long_cape', label: 'Mantello Lungo' },
  { id: 'short_cloak', label: 'Mantellina' },
  { id: 'scarf', label: 'Sciarpa' },
];

export const MAIN_HAND_OPTIONS: readonly SwatchOption<MainHandId>[] = [
  { id: 'auto', label: 'Classe' },
  { id: 'none', label: 'Mani Nude' },
  { id: 'sword', label: 'Spada Lunga' },
  { id: 'greatsword', label: 'Spadone' },
  { id: 'axe', label: 'Ascia Bipenne' },
  { id: 'hammer', label: 'Martello' },
  { id: 'dagger', label: 'Pugnale' },
  { id: 'staff', label: 'Bastone Magico' },
  { id: 'bow', label: 'Arco Ricurvo' },
  { id: 'lute', label: 'Liuto' },
  { id: 'ladle', label: 'Mestolo' },
];

export const OFF_HAND_OPTIONS: readonly SwatchOption<OffHandId>[] = [
  { id: 'auto', label: 'Classe' },
  { id: 'none', label: 'Nessuna' },
  { id: 'heater_shield', label: 'Scudo Araldico' },
  { id: 'round_shield', label: 'Scudo Tondo' },
  { id: 'tome', label: 'Grimorio' },
  { id: 'dagger', label: 'Daga Mancina' },
  { id: 'lantern', label: 'Lanterna' },
  { id: 'mug', label: 'Boccale' },
];

function buildValidSet<T extends string>(options: readonly SwatchOption<T>[]): Set<string> {
  const s = new Set<string>();
  for (const opt of options) {
    if (opt.id !== 'auto') {
      s.add(opt.id);
    }
  }
  return s;
}

const VALID_SKIN = buildValidSet(SKIN_SWATCH_OPTIONS);
const VALID_EYE = buildValidSet(EYE_SWATCH_OPTIONS);
const VALID_HAIR_STYLE = buildValidSet(HAIR_STYLE_OPTIONS);
const VALID_HAIR_SWATCH = buildValidSet(HAIR_SWATCH_OPTIONS);
const VALID_FACIAL = buildValidSet(FACIAL_FEATURE_OPTIONS);
const VALID_OUTFIT = buildValidSet(OUTFIT_SWATCH_OPTIONS);
const VALID_ACCENT = buildValidSet(ACCENT_SWATCH_OPTIONS);
const VALID_HEADGEAR = buildValidSet(HEADGEAR_OPTIONS);
const VALID_CAPE = buildValidSet(CAPE_STYLE_OPTIONS);
const VALID_MAIN_HAND = buildValidSet(MAIN_HAND_OPTIONS);
const VALID_OFF_HAND = buildValidSet(OFF_HAND_OPTIONS);

function pickValid<T extends string>(val: unknown, validSet: Set<string>): T | undefined {
  if (typeof val !== 'string') return undefined;
  const trimmed = val.trim();
  if (!trimmed || trimmed === 'auto') return undefined;
  return validSet.has(trimmed) ? (trimmed as T) : undefined;
}

/**
 * Validates and canonicalizes raw appearance JSON. Unknown or 'auto' fields are omitted.
 * Returns `undefined` when all fields use automatic defaults.
 */
export function normalizeTamagotchiAppearance(raw: unknown): TamagotchiAppearance | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return undefined;
  }
  const obj = raw as Record<string, unknown>;
  const normalized: TamagotchiAppearance = {};

  const skinSwatch = pickValid<Exclude<SkinSwatchId, 'auto'>>(obj.skinSwatch, VALID_SKIN);
  const eyeSwatch = pickValid<Exclude<EyeSwatchId, 'auto'>>(obj.eyeSwatch, VALID_EYE);
  const hairStyle = pickValid<Exclude<HairStyleId, 'auto'>>(obj.hairStyle, VALID_HAIR_STYLE);
  const hairSwatch = pickValid<Exclude<HairSwatchId, 'auto'>>(obj.hairSwatch, VALID_HAIR_SWATCH);
  const facialFeature = pickValid<Exclude<FacialFeatureId, 'auto'>>(obj.facialFeature, VALID_FACIAL);
  const outfitSwatch = pickValid<Exclude<OutfitSwatchId, 'auto'>>(obj.outfitSwatch, VALID_OUTFIT);
  const accentSwatch = pickValid<Exclude<AccentSwatchId, 'auto'>>(obj.accentSwatch, VALID_ACCENT);
  const headgear = pickValid<Exclude<HeadgearId, 'auto'>>(obj.headgear, VALID_HEADGEAR);
  const capeStyle = pickValid<Exclude<CapeStyleId, 'auto'>>(obj.capeStyle, VALID_CAPE);
  const mainHand = pickValid<Exclude<MainHandId, 'auto'>>(obj.mainHand, VALID_MAIN_HAND);
  const offHand = pickValid<Exclude<OffHandId, 'auto'>>(obj.offHand, VALID_OFF_HAND);

  if (skinSwatch) normalized.skinSwatch = skinSwatch;
  if (eyeSwatch) normalized.eyeSwatch = eyeSwatch;
  if (hairStyle) normalized.hairStyle = hairStyle;
  if (hairSwatch) normalized.hairSwatch = hairSwatch;
  if (facialFeature) normalized.facialFeature = facialFeature;
  if (outfitSwatch) normalized.outfitSwatch = outfitSwatch;
  if (accentSwatch) normalized.accentSwatch = accentSwatch;
  if (headgear) normalized.headgear = headgear;
  if (capeStyle) normalized.capeStyle = capeStyle;
  if (mainHand) normalized.mainHand = mainHand;
  if (offHand) normalized.offHand = offHand;

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

export function isValidAppearancePayload(raw: unknown): boolean {
  if (raw === null || raw === undefined) return true;
  if (typeof raw !== 'object' || Array.isArray(raw)) return false;
  const obj = raw as Record<string, unknown>;
  const validators: Record<string, Set<string>> = {
    skinSwatch: VALID_SKIN,
    eyeSwatch: VALID_EYE,
    hairStyle: VALID_HAIR_STYLE,
    hairSwatch: VALID_HAIR_SWATCH,
    facialFeature: VALID_FACIAL,
    outfitSwatch: VALID_OUTFIT,
    accentSwatch: VALID_ACCENT,
    headgear: VALID_HEADGEAR,
    capeStyle: VALID_CAPE,
    mainHand: VALID_MAIN_HAND,
    offHand: VALID_OFF_HAND,
  };
  for (const [k, v] of Object.entries(obj)) {
    const allowed = validators[k];
    if (!allowed) return false;
    if (v === undefined || v === null || v === 'auto') continue;
    if (typeof v !== 'string' || !allowed.has(v)) return false;
  }
  return true;
}

export function areAppearancesEqual(
  a: TamagotchiAppearance | undefined | null,
  b: TamagotchiAppearance | undefined | null
): boolean {
  const na = normalizeTamagotchiAppearance(a);
  const nb = normalizeTamagotchiAppearance(b);
  if (!na && !nb) return true;
  if (!na || !nb) return false;
  const keys: (keyof TamagotchiAppearance)[] = [
    'skinSwatch',
    'eyeSwatch',
    'hairStyle',
    'hairSwatch',
    'facialFeature',
    'outfitSwatch',
    'accentSwatch',
    'headgear',
    'capeStyle',
    'mainHand',
    'offHand',
  ];
  return keys.every((k) => na[k] === nb[k]);
}
