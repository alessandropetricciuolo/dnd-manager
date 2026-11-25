export type CareGameStat = 'hunger' | 'energy' | 'hygiene';

export interface CareGameCompletionResult {
  applied: boolean;
  message: string;
  before?: number;
  after?: number;
  queued?: boolean;
  trophyUnlocked?: boolean;
}

export interface CareStatMeta {
  stat: CareGameStat;
  statLabel: string;
  gameTitle: string;
  shortObjective: string;
  excellentHint: string;
  accentColor: string;
}

export const CARE_STAT_META: Record<CareGameStat, CareStatMeta> = {
  hunger: {
    stat: 'hunger',
    statLabel: 'Sazietà',
    gameTitle: 'LA PENTOLA DELLA TAVERNA',
    shortObjective: 'Memorizza i 3 ingredienti in ordine, aggiungili e servi nella fascia verde.',
    excellentHint: '0 errori + cottura perfetta = Eccellente',
    accentColor: '#E09F3E',
  },
  energy: {
    stat: 'energy',
    statLabel: 'Energia',
    gameTitle: 'IL FUOCO DELLA BRANDA',
    shortObjective: 'Fai 3 soffiate a ritmo crescente fermandoti nella fascia dorata.',
    excellentHint: '3 soffiate ideali = Eccellente',
    accentColor: '#F97316',
  },
  hygiene: {
    stat: 'hygiene',
    statLabel: 'Cura',
    gameTitle: 'ARMATURA DA RIPULIRE',
    shortObjective: 'Rimuovi macchie e croste multi-tap, poi completa la lucidatura finale.',
    excellentHint: 'Tutto pulito + lucidatura = Eccellente',
    accentColor: '#38BDF8',
  },
};

// ============================================================================
// 1. LA PENTOLA DELLA TAVERNA (hunger)
// ============================================================================

export type IngredientId =
  | 'broth'
  | 'herbs'
  | 'mushrooms'
  | 'roots'
  | 'spices'
  | 'roast';

export interface PantryIngredient {
  id: IngredientId;
  name: string;
  shortLabel: string;
  color: string;
}

export const PANTRY_INGREDIENTS: readonly PantryIngredient[] = [
  { id: 'broth', name: 'Brodo d’ossa', shortLabel: 'Brodo', color: '#D97706' },
  { id: 'herbs', name: 'Erbe di bosco', shortLabel: 'Erbe', color: '#10B981' },
  { id: 'mushrooms', name: 'Funghi porcini', shortLabel: 'Funghi', color: '#A16207' },
  { id: 'roots', name: 'Radici dolci', shortLabel: 'Radici', color: '#EA580C' },
  { id: 'spices', name: 'Spezie d’oro', shortLabel: 'Spezie', color: '#C89D49' },
  { id: 'roast', name: 'Arrosto', shortLabel: 'Arrosto', color: '#B91C1C' },
] as const;

export const CAULDRON_RECIPE_LENGTH = 3;
export const CAULDRON_SERVE_MIN = 0.38;
export const CAULDRON_SERVE_MAX = 0.68;

export interface CauldronGameState {
  recipe: IngredientId[];
  added: IngredientId[];
  mistakes: number;
  phase: 'memorizing' | 'cooking' | 'ready_to_serve' | 'completed';
  serveTimingHit: boolean | null;
  lastFeedback: {
    kind: 'idle' | 'correct' | 'wrong' | 'served';
    ingredientId?: IngredientId;
    message: string;
  };
  excellent: boolean;
}

export function getIngredientById(id: IngredientId): PantryIngredient {
  return (
    PANTRY_INGREDIENTS.find((item) => item.id === id) ?? PANTRY_INGREDIENTS[0]
  );
}

export function createCauldronGame(
  rng: () => number = Math.random
): CauldronGameState {
  const pool = PANTRY_INGREDIENTS.map((i) => i.id);
  const recipe: IngredientId[] = [];
  for (let i = 0; i < CAULDRON_RECIPE_LENGTH; i += 1) {
    const raw = rng();
    const clamped = Number.isFinite(raw) ? Math.min(Math.max(raw, 0), 0.999999) : 0;
    const index = Math.floor(clamped * pool.length);
    const [picked] = pool.splice(index, 1);
    if (picked) {
      recipe.push(picked);
    }
  }

  return {
    recipe,
    added: [],
    mistakes: 0,
    phase: 'memorizing',
    serveTimingHit: null,
    lastFeedback: {
      kind: 'idle',
      message: 'Memorizza l’ordine dei 3 ingredienti della ricetta!',
    },
    excellent: false,
  };
}

export function startCauldronCooking(state: CauldronGameState): CauldronGameState {
  if (state.phase !== 'memorizing') {
    return state;
  }
  return {
    ...state,
    phase: 'cooking',
    lastFeedback: {
      kind: 'idle',
      message: 'Ricetta chiusa! Aggiungi i 3 ingredienti nell’ordine giusto.',
    },
  };
}

export function pickCauldronIngredient(
  state: CauldronGameState,
  ingredientId: IngredientId
): CauldronGameState {
  if (state.phase !== 'cooking') {
    return state;
  }

  const expectedId = state.recipe[state.added.length];
  if (!expectedId) {
    return state;
  }

  const picked = getIngredientById(ingredientId);

  if (ingredientId === expectedId) {
    const nextAdded = [...state.added, ingredientId];
    const isReady = nextAdded.length >= state.recipe.length;

    return {
      ...state,
      added: nextAdded,
      phase: isReady ? 'ready_to_serve' : 'cooking',
      lastFeedback: {
        kind: 'correct',
        ingredientId,
        message: isReady
          ? 'Ricetta completata! Ferma il mestolo nella fascia verde per servire.'
          : `${picked.name} aggiunto (${nextAdded.length}/${state.recipe.length}).`,
      },
    };
  }

  return {
    ...state,
    mistakes: state.mistakes + 1,
    lastFeedback: {
      kind: 'wrong',
      ingredientId,
      message: `${picked.name} non va a questo punto della ricetta!`,
    },
  };
}

export function serveCauldronMeal(
  state: CauldronGameState,
  timingLevel = 0.5
): CauldronGameState {
  if (state.phase !== 'ready_to_serve') {
    return state;
  }

  const clamped = Number.isFinite(timingLevel) ? Math.min(Math.max(timingLevel, 0), 1) : 0.5;
  const timingHit = clamped >= CAULDRON_SERVE_MIN && clamped <= CAULDRON_SERVE_MAX;
  const excellent = state.mistakes === 0 && timingHit;
  return {
    ...state,
    phase: 'completed',
    serveTimingHit: timingHit,
    excellent,
    lastFeedback: {
      kind: 'served',
      message: excellent
        ? 'Stufato perfetto a memoria e cottura ideale!'
        : timingHit
          ? 'Ciotola calda servita al punto giusto.'
          : 'Ciotola servita in tavola, un po’ fuori cottura.',
    },
  };
}

// ============================================================================
// 2. IL FUOCO DELLA BRANDA (energy)
// ============================================================================

export const HEARTH_TOTAL_PUFFS = 3;
export const HEARTH_IDEAL_MIN = 0.58;
export const HEARTH_IDEAL_MAX = 0.84;

export interface HearthRoundConfig {
  min: number;
  max: number;
  fillPerSecond: number;
}

export function getHearthRoundConfig(round: number): HearthRoundConfig {
  if (round >= 3) {
    return { min: 0.62, max: 0.80, fillPerSecond: 1.02 };
  }
  if (round === 2) {
    return { min: 0.56, max: 0.82, fillPerSecond: 0.85 };
  }
  return { min: 0.50, max: 0.85, fillPerSecond: 0.68 };
}

export type PuffOutcome = 'ideal' | 'too_weak' | 'too_strong';

export interface PuffRecord {
  round: number;
  level: number;
  outcome: PuffOutcome;
}

export interface HearthGameState {
  round: number;
  maxRounds: number;
  puffs: PuffRecord[];
  fireLevel: number; // 0..3 visual intensity
  phase: 'ready' | 'completed';
  lastOutcome: PuffOutcome | null;
  lastMessage: string;
  excellent: boolean;
}

export function evaluatePuffLevel(level: number, round = 1): PuffOutcome {
  const clamped = Math.min(Math.max(level, 0), 1);
  const { min, max } = getHearthRoundConfig(round);
  if (clamped < min) return 'too_weak';
  if (clamped > max) return 'too_strong';
  return 'ideal';
}

export function createHearthGame(): HearthGameState {
  return {
    round: 1,
    maxRounds: HEARTH_TOTAL_PUFFS,
    puffs: [],
    fireLevel: 0,
    phase: 'ready',
    lastOutcome: null,
    lastMessage: 'Soffia sulle braci e fermati nella fascia dorata.',
    excellent: false,
  };
}

export function recordHearthPuff(
  state: HearthGameState,
  level: number
): HearthGameState {
  if (state.phase !== 'ready') {
    return state;
  }

  const clamped = Math.min(Math.max(level, 0), 1);
  const outcome = evaluatePuffLevel(clamped, state.round);
  const nextPuffs: PuffRecord[] = [
    ...state.puffs,
    { round: state.round, level: clamped, outcome },
  ];

  const idealCount = nextPuffs.filter((p) => p.outcome === 'ideal').length;
  // Fire always grows at least a bit so the hearth warms up, faster on ideal puffs
  const nextFireLevel = Math.min(
    HEARTH_TOTAL_PUFFS,
    state.fireLevel + (outcome === 'ideal' ? 1 : 0.65)
  );
  const isFinished = nextPuffs.length >= state.maxRounds;
  const excellent = isFinished && idealCount === state.maxRounds;

  const feedbackByOutcome: Record<PuffOutcome, string> = {
    ideal: 'Soffio perfetto! Le braci prendono vigore.',
    too_weak: 'Soffio troppo debole: tieni un po’ di più.',
    too_strong: 'Troppo forte! Le scintille volano via.',
  };

  return {
    ...state,
    round: isFinished ? state.maxRounds : state.round + 1,
    puffs: nextPuffs,
    fireLevel: isFinished ? Math.max(2, nextFireLevel) : nextFireLevel,
    phase: isFinished ? 'completed' : 'ready',
    lastOutcome: outcome,
    lastMessage: isFinished
      ? excellent
        ? 'Fuoco vivo e caldo: riposo eccellente!'
        : 'Il braciere è acceso: ora si può riposare.'
      : feedbackByOutcome[outcome],
    excellent,
  };
}

// ============================================================================
// 3. ARMATURA DA RIPULIRE (hygiene)
// ============================================================================

export type GearItemId = 'armor' | 'boots' | 'cloak';

export interface GearStain {
  id: string;
  itemId: GearItemId;
  xPct: number; // 0..100 within gear stage
  yPct: number; // 0..100 within gear stage
  radius: number;
  kind: 'dust' | 'crust';
  maxHits: number;
  hitsRemaining: number;
  cleaned: boolean;
}

export interface GearItemMeta {
  id: GearItemId;
  name: string;
}

export const GEAR_ITEMS: readonly GearItemMeta[] = [
  { id: 'armor', name: 'Armatura' },
  { id: 'boots', name: 'Stivali' },
  { id: 'cloak', name: 'Mantello' },
] as const;

export interface HygieneGameState {
  activeItem: GearItemId;
  stains: GearStain[];
  phase: 'cleaning' | 'completed';
  excellent: boolean;
  lastMessage: string;
}

const INITIAL_STAINS: readonly Omit<GearStain, 'cleaned' | 'hitsRemaining'>[] = [
  // Armor (breastplate)
  { id: 'armor-1', itemId: 'armor', xPct: 36, yPct: 34, radius: 18, kind: 'dust', maxHits: 1 },
  { id: 'armor-2', itemId: 'armor', xPct: 62, yPct: 48, radius: 22, kind: 'crust', maxHits: 3 },
  { id: 'armor-3', itemId: 'armor', xPct: 46, yPct: 70, radius: 17, kind: 'dust', maxHits: 1 },
  // Boots
  { id: 'boots-1', itemId: 'boots', xPct: 30, yPct: 66, radius: 21, kind: 'crust', maxHits: 3 },
  { id: 'boots-2', itemId: 'boots', xPct: 68, yPct: 62, radius: 19, kind: 'dust', maxHits: 1 },
  { id: 'boots-3', itemId: 'boots', xPct: 68, yPct: 34, radius: 16, kind: 'dust', maxHits: 1 },
  // Cloak
  { id: 'cloak-1', itemId: 'cloak', xPct: 42, yPct: 36, radius: 18, kind: 'dust', maxHits: 1 },
  { id: 'cloak-2', itemId: 'cloak', xPct: 60, yPct: 60, radius: 22, kind: 'crust', maxHits: 3 },
  { id: 'cloak-3', itemId: 'cloak', xPct: 34, yPct: 72, radius: 17, kind: 'dust', maxHits: 1 },
];

export function createHygieneGame(): HygieneGameState {
  return {
    activeItem: 'armor',
    stains: INITIAL_STAINS.map((stain) => ({
      ...stain,
      hitsRemaining: stain.maxHits,
      cleaned: false,
    })),
    phase: 'cleaning',
    excellent: false,
    lastMessage: 'Rimuovi macchie e croste (3 tap) su armatura, stivali e mantello.',
  };
}

export function selectHygieneItem(
  state: HygieneGameState,
  itemId: GearItemId
): HygieneGameState {
  if (state.phase !== 'cleaning') {
    return state;
  }
  return {
    ...state,
    activeItem: itemId,
  };
}

export function cleanHygieneStain(
  state: HygieneGameState,
  stainId: string
): HygieneGameState {
  if (state.phase !== 'cleaning') {
    return state;
  }

  let changed = false;
  let hitStainRemaining = 0;
  const nextStains = state.stains.map((stain) => {
    if (stain.id === stainId && !stain.cleaned) {
      changed = true;
      const nextRemaining = Math.max(0, stain.hitsRemaining - 1);
      hitStainRemaining = nextRemaining;
      return {
        ...stain,
        hitsRemaining: nextRemaining,
        cleaned: nextRemaining === 0,
      };
    }
    return stain;
  });

  if (!changed) {
    return state;
  }

  const remainingTotal = nextStains.filter((s) => !s.cleaned).length;
  const remainingActive = nextStains.filter(
    (s) => s.itemId === state.activeItem && !s.cleaned
  ).length;

  let lastMessage =
    hitStainRemaining > 0
      ? `Crosta dura! Ancora ${hitStainRemaining} ${hitStainRemaining === 1 ? 'colpo' : 'colpi'}.`
      : 'Macchia rimossa!';
  if (remainingTotal === 0) {
    lastMessage = 'Tutto pulito! Completa la lucidatura finale per l’Eccellente.';
  } else if (remainingActive === 0 && hitStainRemaining === 0) {
    const activeName =
      GEAR_ITEMS.find((g) => g.id === state.activeItem)?.name ?? 'Pezzo';
    lastMessage = `${activeName} pulito! Passa al prossimo pezzo.`;
  }

  return {
    ...state,
    stains: nextStains,
    lastMessage,
  };
}

export function getHygieneProgress(state: HygieneGameState) {
  const total = state.stains.length;
  const cleaned = state.stains.filter((s) => s.cleaned).length;
  const byItem = GEAR_ITEMS.map((item) => {
    const itemStains = state.stains.filter((s) => s.itemId === item.id);
    const itemCleaned = itemStains.filter((s) => s.cleaned).length;
    return {
      itemId: item.id,
      name: item.name,
      total: itemStains.length,
      cleaned: itemCleaned,
      remaining: itemStains.length - itemCleaned,
      hasMinimum: itemCleaned >= 1,
      isComplete: itemCleaned === itemStains.length,
    };
  });

  const canFinish = byItem.every((entry) => entry.hasMinimum);
  const allClean = cleaned === total && total > 0;

  return {
    total,
    cleaned,
    remaining: total - cleaned,
    byItem,
    canFinish,
    allClean,
  };
}

export function finishHygieneGame(
  state: HygieneGameState,
  polished = true
): HygieneGameState {
  if (state.phase !== 'cleaning') {
    return state;
  }
  const progress = getHygieneProgress(state);
  if (!progress.canFinish) {
    return state;
  }

  const excellent = progress.allClean && polished;

  return {
    ...state,
    phase: 'completed',
    excellent,
    lastMessage: excellent
      ? 'Equipaggiamento impeccabile, lucido come nuovo!'
      : 'Equipaggiamento ripulito e pronto per il viaggio.',
  };
}
