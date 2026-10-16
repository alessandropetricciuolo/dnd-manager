import {
  doesStatusBreakConcentration,
  getCombatStatusDefinition,
  isCanonicalCombatConditionId,
  normalizeCombatConditions,
  type CombatConditionId,
} from "@/lib/combat-conditions";
import type {
  ActiveConcentration,
  CombatEffectDuration,
  CombatEffectInstance,
  CombatEffectSavePrompt,
  CombatHpMutation,
  EffectiveAcResult,
  PendingConcentrationCheck,
  PendingSaveReminder,
  SavingThrowsMap,
  SavingThrowsSource,
  TurnAdvanceUndoSnapshot,
  CombatCommandProposal,
  CommandUndoSnapshot,
} from "@/lib/fight-mode/types";
import type { InitiativeEntry, InitiativeTrackerState } from "@/components/gm/initiative-tracker";
import { validateCombatCommandProposal } from "./combat-command-proposal-schema";

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Snapshot condiviso dell'iniziativa: conserva i check pendenti e non ripristina il timer transitorio. */
export function buildInitiativeDraftState(
  state: Pick<
    InitiativeTrackerState,
    | "entries"
    | "currentTurnIndex"
    | "roundNumber"
    | "isTurnTimerRunning"
    | "pendingConcentrationChecks"
    | "pendingSaveReminders"
    | "lastAdvanceUndoSnapshot"
    | "appliedProposalIds"
    | "lastCommandUndoSnapshot"
  >
): InitiativeTrackerState {
  return {
    entries: state.entries,
    currentTurnIndex: state.currentTurnIndex,
    roundNumber: state.roundNumber,
    isTurnTimerRunning: state.isTurnTimerRunning,
    turnElapsedSeconds: 0,
    pendingConcentrationChecks: state.pendingConcentrationChecks ?? [],
    pendingSaveReminders: state.pendingSaveReminders ?? [],
    lastAdvanceUndoSnapshot: state.lastAdvanceUndoSnapshot ?? null,
    appliedProposalIds: state.appliedProposalIds ?? [],
    lastCommandUndoSnapshot: state.lastCommandUndoSnapshot ?? null,
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function slugifyCustomStatus(label: string): string {
  const clean = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9àèéìòù_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `custom:${clean || "stato"}`;
}

/**
 * Deriva le sole 15 condizioni canoniche D&D 5e da activeEffects.
 */
export function deriveCanonicalConditionsFromEffects(
  effects: readonly CombatEffectInstance[] | undefined | null
): CombatConditionId[] {
  if (!effects || effects.length === 0) return [];
  const rawIds = effects.map((e) => (e.statusId === "privo_di_sensi" ? "privo-di-sensi" : e.statusId));
  return normalizeCombatConditions(rawIds);
}

export function normalizeCombatEffectDuration(
  raw: unknown,
  fallbackAnchorId: string
): CombatEffectDuration | null {
  if (!isRecord(raw)) return null;
  const remainingRaw = raw.remainingTurns;
  const remainingTurns =
    typeof remainingRaw === "number" && Number.isFinite(remainingRaw) && remainingRaw > 0
      ? Math.trunc(remainingRaw)
      : null;
  const tickOn = raw.tickOn === "turn_start" ? "turn_start" : "turn_end";
  const anchorCombatantId =
    typeof raw.anchorCombatantId === "string" && raw.anchorCombatantId.trim()
      ? raw.anchorCombatantId.trim()
      : fallbackAnchorId;
  if (remainingTurns === null) return null;
  const appliedAtRound =
    typeof raw.appliedAtRound === "number" && Number.isFinite(raw.appliedAtRound)
      ? Math.max(1, Math.trunc(raw.appliedAtRound))
      : undefined;
  const appliedAtTurnIndex =
    typeof raw.appliedAtTurnIndex === "number" && Number.isFinite(raw.appliedAtTurnIndex)
      ? Math.max(0, Math.trunc(raw.appliedAtTurnIndex))
      : undefined;
  const anchorRemoved = Boolean(raw.anchorRemoved);

  return {
    remainingTurns,
    tickOn,
    anchorCombatantId,
    ...(appliedAtRound !== undefined ? { appliedAtRound } : {}),
    ...(appliedAtTurnIndex !== undefined ? { appliedAtTurnIndex } : {}),
    ...(anchorRemoved ? { anchorRemoved: true } : {}),
  };
}

export function normalizeCombatEffectSavePrompt(raw: unknown): CombatEffectSavePrompt | null {
  if (!isRecord(raw)) return null;
  const ab = raw.ability;
  if (ab !== "for" && ab !== "des" && ab !== "cos" && ab !== "int" && ab !== "sag" && ab !== "car") {
    return null;
  }
  const dc = typeof raw.dc === "number" && Number.isFinite(raw.dc) ? Math.max(1, Math.trunc(raw.dc)) : 0;
  if (dc <= 0) return null;
  const timing = raw.timing === "turn_start" ? "turn_start" : "turn_end";
  const onPass = raw.onPass === "manual" ? "manual" : "remove_effect";
  return { ability: ab, dc, timing, onPass };
}

export function normalizeCombatEffectInstance(
  raw: unknown,
  fallbackTargetId: string
): CombatEffectInstance | null {
  if (!isRecord(raw)) return null;
  const rawStatusId = typeof raw.statusId === "string" ? raw.statusId.trim() : "";
  if (!rawStatusId) return null;
  const statusId = rawStatusId === "privo_di_sensi" ? "privo-di-sensi" : rawStatusId;
  const def = getCombatStatusDefinition(statusId);
  const rawLabel = typeof raw.label === "string" ? raw.label.trim() : "";
  const label = rawLabel || def?.label || statusId.replace(/^custom:/, "");
  if (!label) return null;

  const effectId =
    typeof raw.effectId === "string" && raw.effectId.trim()
      ? raw.effectId.trim()
      : `eff-${fallbackTargetId}-${statusId}`;
  const targetId =
    typeof raw.targetId === "string" && raw.targetId.trim()
      ? raw.targetId.trim()
      : fallbackTargetId;
  const sourceCasterId =
    typeof raw.sourceCasterId === "string" && raw.sourceCasterId.trim()
      ? raw.sourceCasterId.trim()
      : undefined;
  const sourceName =
    typeof raw.sourceName === "string" && raw.sourceName.trim()
      ? raw.sourceName.trim()
      : undefined;
  const concentrationId =
    typeof raw.concentrationId === "string" && raw.concentrationId.trim()
      ? raw.concentrationId.trim()
      : undefined;
  const duration = normalizeCombatEffectDuration(raw.duration, sourceCasterId ?? targetId);
  const savePrompt = normalizeCombatEffectSavePrompt(raw.savePrompt);

  return {
    effectId,
    statusId,
    label,
    targetId,
    ...(sourceCasterId ? { sourceCasterId } : {}),
    ...(sourceName ? { sourceName } : {}),
    ...(concentrationId ? { concentrationId } : {}),
    ...(duration ? { duration } : {}),
    ...(savePrompt ? { savePrompt } : {}),
  };
}

export function normalizeActiveConcentration(
  raw: unknown,
  fallbackCasterId: string
): ActiveConcentration | null {
  if (!isRecord(raw)) return null;
  const spellName = typeof raw.spellName === "string" ? raw.spellName.trim() : "";
  if (!spellName) return null;
  const concentrationId =
    typeof raw.concentrationId === "string" && raw.concentrationId.trim()
      ? raw.concentrationId.trim()
      : `conc-${fallbackCasterId}`;
  const casterId =
    typeof raw.casterId === "string" && raw.casterId.trim()
      ? raw.casterId.trim()
      : fallbackCasterId;
  const linkedEffectIds = Array.isArray(raw.linkedEffectIds)
    ? Array.from(
        new Set(
          raw.linkedEffectIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
        )
      )
    : [];
  const startedRound =
    typeof raw.startedRound === "number" && Number.isFinite(raw.startedRound)
      ? Math.max(1, Math.trunc(raw.startedRound))
      : 1;
  const startedTurnIndex =
    typeof raw.startedTurnIndex === "number" && Number.isFinite(raw.startedTurnIndex)
      ? Math.max(0, Math.trunc(raw.startedTurnIndex))
      : undefined;
  const remainingTurns =
    typeof raw.remainingTurns === "number" && Number.isFinite(raw.remainingTurns) && raw.remainingTurns > 0
      ? Math.trunc(raw.remainingTurns)
      : null;

  return {
    concentrationId,
    casterId,
    spellName,
    linkedEffectIds,
    startedRound,
    ...(startedTurnIndex !== undefined ? { startedTurnIndex } : {}),
    ...(remainingTurns !== null ? { remainingTurns } : {}),
  };
}

export function normalizePendingConcentrationChecks(
  raw: unknown,
  entries: readonly InitiativeEntry[]
): PendingConcentrationCheck[] {
  if (!Array.isArray(raw)) return [];
  const activeConcentrations = new Map<string, { caster: InitiativeEntry; conc: ActiveConcentration }>();
  for (const e of entries) {
    if (e.activeConcentration && !e.isDead && e.hp > 0) {
      activeConcentrations.set(e.activeConcentration.concentrationId, {
        caster: e,
        conc: e.activeConcentration,
      });
    }
  }

  const out: PendingConcentrationCheck[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const checkId = typeof item.checkId === "string" && item.checkId.trim() ? item.checkId.trim() : "";
    const concentrationId =
      typeof item.concentrationId === "string" && item.concentrationId.trim()
        ? item.concentrationId.trim()
        : "";
    if (!checkId || !concentrationId) continue;

    // Scarta automaticamente check riferiti a concentrazioni non più attive
    const activeMatch = activeConcentrations.get(concentrationId);
    if (!activeMatch) continue;

    const damageTaken =
      typeof item.damageTaken === "number" && Number.isFinite(item.damageTaken)
        ? Math.max(1, Math.trunc(item.damageTaken))
        : 1;
    const dc =
      typeof item.dc === "number" && Number.isFinite(item.dc)
        ? Math.max(10, Math.trunc(item.dc))
        : Math.max(10, Math.floor(damageTaken / 2));
    const conSaveBonus =
      typeof item.conSaveBonus === "number" && Number.isFinite(item.conSaveBonus)
        ? Math.trunc(item.conSaveBonus)
        : activeMatch.caster.savingThrows?.cos ?? 0;
    const rawSource = item.conSaveSource;
    const conSaveSource: SavingThrowsSource | undefined =
      rawSource === "sheet" || rawSource === "estimated" || rawSource === "manual"
        ? rawSource
        : activeMatch.caster.savingThrowsSource;

    out.push({
      checkId,
      casterId: activeMatch.caster.id,
      casterName: activeMatch.caster.name,
      concentrationId,
      spellName: activeMatch.conc.spellName,
      damageTaken,
      dc,
      conSaveBonus,
      ...(conSaveSource ? { conSaveSource } : {}),
      ...(typeof item.sourceDescription === "string" && item.sourceDescription.trim()
        ? { sourceDescription: item.sourceDescription.trim() }
        : {}),
      createdAt:
        typeof item.createdAt === "number" && Number.isFinite(item.createdAt)
          ? item.createdAt
          : Date.now(),
    });
  }
  return out;
}

export function normalizePendingSaveReminders(
  raw: unknown,
  entries: readonly InitiativeEntry[]
): PendingSaveReminder[] {
  if (!Array.isArray(raw)) return [];
  const activeEffectsByTarget = new Map<string, Set<string>>();
  for (const e of entries) {
    if (e.isDead && (e.type === "monster" || e.type === "custom")) continue;
    const effectIds = new Set((e.activeEffects ?? []).map((eff) => eff.effectId));
    activeEffectsByTarget.set(e.id, effectIds);
  }

  const out: PendingSaveReminder[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const reminderId = typeof item.reminderId === "string" && item.reminderId.trim() ? item.reminderId.trim() : "";
    const effectId = typeof item.effectId === "string" && item.effectId.trim() ? item.effectId.trim() : "";
    const targetId = typeof item.targetId === "string" && item.targetId.trim() ? item.targetId.trim() : "";
    if (!reminderId || !effectId || !targetId) continue;

    const targetEffects = activeEffectsByTarget.get(targetId);
    if (!targetEffects || !targetEffects.has(effectId)) continue;

    const targetEntry = entries.find((e) => e.id === targetId);
    if (!targetEntry) continue;

    const ab = item.ability;
    if (ab !== "for" && ab !== "des" && ab !== "cos" && ab !== "int" && ab !== "sag" && ab !== "car") continue;

    const dc = typeof item.dc === "number" && Number.isFinite(item.dc) ? Math.max(1, Math.trunc(item.dc)) : 10;
    const timing = item.timing === "turn_start" ? "turn_start" : "turn_end";
    const onPass = item.onPass === "manual" ? "manual" : "remove_effect";
    const statusId = typeof item.statusId === "string" ? item.statusId : "condizione";
    const label = typeof item.label === "string" ? item.label : statusId;
    const targetName = typeof item.targetName === "string" ? item.targetName : targetEntry.name;
    const saveBonus =
      typeof item.saveBonus === "number" && Number.isFinite(item.saveBonus)
        ? Math.trunc(item.saveBonus)
        : targetEntry.savingThrows?.[ab] ?? 0;
    const saveSource =
      item.saveSource === "sheet" || item.saveSource === "manual" ? item.saveSource : "estimated";

    out.push({
      reminderId,
      effectId,
      targetId,
      targetName,
      statusId,
      label,
      ability: ab,
      dc,
      timing,
      onPass,
      ...(typeof item.sourceName === "string" && item.sourceName.trim()
        ? { sourceName: item.sourceName.trim() }
        : {}),
      saveBonus,
      saveSource,
      roundNumber: typeof item.roundNumber === "number" ? Math.max(1, Math.trunc(item.roundNumber)) : 1,
      turnIndex: typeof item.turnIndex === "number" ? Math.max(0, Math.trunc(item.turnIndex)) : 0,
      createdAt: typeof item.createdAt === "number" ? item.createdAt : Date.now(),
    });
  }
  return out;
}

export function isCombatantDeadOrSkipped(e: InitiativeEntry | undefined | null): boolean {
  if (!e) return false;
  if (e.type === "monster" || e.type === "custom") {
    return Boolean(e.isDead) || (typeof e.hp === "number" && e.hp <= 0);
  }
  return Boolean(e.isDead);
}

/** Signature per sync parent/DB e verifica integrità avanzamento turno: esclude turnElapsedSeconds (tick transitorio). */
export function initiativeStateSyncSignature(state: InitiativeTrackerState): string {
  return JSON.stringify({
    entries: state.entries.map((e) => {
      const reconciled = reconcileEntryEffectsAndConditions(e.id, e.activeEffects, e.conditions);
      const activeConc = normalizeActiveConcentration(e.activeConcentration, e.id);
      return {
        id: e.id,
        hp: e.hp,
        maxHp: e.maxHp,
        tempHp: Math.max(0, Math.trunc(e.tempHp ?? 0)),
        armorClass: e.armorClass,
        initiative: e.initiative,
        damageDealt: e.damageDealt ?? 0,
        damageTaken: e.damageTaken ?? 0,
        isDead: e.isDead,
        usedReaction: e.usedReaction ? 1 : 0,
        deathSaves: e.deathSaves ? `${e.deathSaves.success}/${e.deathSaves.fail}` : "0/0",
        noteText: e.noteText ?? "",
        spellSlots: e.spellSlots?.remaining,
        conditions: reconciled.conditions,
        activeEffects: reconciled.activeEffects.map((ef) => ({
          id: ef.effectId,
          s: ef.statusId,
          l: ef.label,
          c: ef.sourceCasterId ?? "",
          n: ef.sourceName ?? "",
          cid: ef.concentrationId ?? "",
          dur: ef.duration
            ? {
                rem: ef.duration.remainingTurns,
                tick: ef.duration.tickOn,
                anc: ef.duration.anchorCombatantId,
                ancR: ef.duration.anchorRemoved ? 1 : 0,
              }
            : null,
          sav: ef.savePrompt
            ? {
                ab: ef.savePrompt.ability,
                dc: ef.savePrompt.dc,
                tim: ef.savePrompt.timing,
              }
            : null,
        })),
        activeConcentration: activeConc
          ? {
              id: activeConc.concentrationId,
              sp: activeConc.spellName,
              eIds: activeConc.linkedEffectIds,
              rem: activeConc.remainingTurns ?? null,
              startedAt: `${activeConc.startedRound}:${activeConc.startedTurnIndex ?? "legacy"}`,
            }
          : null,
        savingThrowsManual:
          e.savingThrowsSource === "manual" && e.savingThrows ? e.savingThrows : null,
      };
    }),
    currentTurnIndex: state.currentTurnIndex,
    roundNumber: state.roundNumber,
    isTurnTimerRunning: state.isTurnTimerRunning,
    pendingConcentrationChecks: normalizePendingConcentrationChecks(
      state.pendingConcentrationChecks,
      state.entries
    ).map((c) => ({
      id: c.checkId,
      cid: c.concentrationId,
      dc: c.dc,
      dmg: c.damageTaken,
      b: c.conSaveBonus,
      s: c.conSaveSource ?? "estimated",
    })),
    pendingSaveReminders: normalizePendingSaveReminders(
      state.pendingSaveReminders,
      state.entries
    ).map((r) => ({
      id: r.reminderId,
      effId: r.effectId,
      tid: r.targetId,
      ab: r.ability,
      dc: r.dc,
      tim: r.timing,
    })),
  });
}


/**
 * Sincronizza `activeEffects` e `conditions` in ingresso:
 * - Se `activeEffects` è presente, è la fonte di verità; tuttavia se in `conditions` sono
 *   state aggiunte/rimosse condizioni canoniche via API legacy, riallinea le istanze legacy/manuali
 *   senza toccare i buff/stati tattici/custom né rimuovere duplicati con fonti diverse.
 * - Se `activeEffects` è assente ma `conditions` ha valori, migra in automatico ogni condizione
 *   canonica in un `CombatEffectInstance` deterministico (`legacy-${entryId}-${condId}`).
 */
export function reconcileEntryEffectsAndConditions(
  entryId: string,
  rawEffects: unknown,
  rawConditions: unknown
): { activeEffects: CombatEffectInstance[]; conditions: CombatConditionId[] } {
  const legacyConditions = normalizeCombatConditions(rawConditions);

  if (Array.isArray(rawEffects)) {
    const normalizedEffects = rawEffects
      .map((item) => normalizeCombatEffectInstance(item, entryId))
      .filter((item): item is CombatEffectInstance => item !== null);
    const derivedCanonical = deriveCanonicalConditionsFromEffects(normalizedEffects);
    return {
      activeEffects: normalizedEffects,
      conditions: derivedCanonical,
    };
  }

  // Migrazione automatica da scontro legacy con solo `conditions`
  const migratedEffects: CombatEffectInstance[] = legacyConditions.map((condId) => {
    const def = getCombatStatusDefinition(condId);
    return {
      effectId: `legacy-${entryId}-${condId}`,
      statusId: condId,
      label: def?.label ?? condId,
      targetId: entryId,
    };
  });

  return {
    activeEffects: migratedEffects,
    conditions: legacyConditions,
  };
}

/**
 * Calcola la CA effettiva a partire dalla CA base e dagli activeEffects del combattente.
 * - Deduplica i bonus per `statusId` (due Benedizione o due Scudo della Fede non raddoppiano il bonus).
 * - Tratta `copertura-mezza` (+2) e `copertura-tre-quarti` (+5) come mutuamente esclusive (prende il max).
 * - Somma i modificatori flat supportati (`scudo-della-fede` +2, `velocita` +2, `scudo` +5, `lentezza` -2).
 * - Lascia formule base (`armatura-magica`) come `formulaHints` senza sommare numeri arbitrari.
 */
export function computeEffectiveArmorClass(
  baseAc: number,
  activeEffects: readonly CombatEffectInstance[] | undefined | null
): EffectiveAcResult {
  const safeBase = Number.isFinite(baseAc) ? Math.max(0, Math.trunc(baseAc)) : 0;
  if (!activeEffects || activeEffects.length === 0) {
    return {
      baseAc: safeBase,
      effectiveAc: safeBase,
      flatDelta: 0,
      coverBonus: 0,
      formulaHints: [],
    };
  }

  const seenStatusIds = new Set<string>();
  let flatDelta = 0;
  let coverBonus: 0 | 2 | 5 = 0;
  const formulaHints: string[] = [];

  for (const eff of activeEffects) {
    if (seenStatusIds.has(eff.statusId)) continue;
    seenStatusIds.add(eff.statusId);

    const def = getCombatStatusDefinition(eff.statusId);
    if (!def) continue;

    if (typeof def.acModifierFlat === "number") {
      flatDelta += def.acModifierFlat;
    }
    if (def.coverBonus === 5) {
      coverBonus = 5;
    } else if (def.coverBonus === 2 && coverBonus < 5) {
      coverBonus = 2;
    }
    if (def.acFormulaHint) {
      formulaHints.push(def.acFormulaHint);
    }
  }

  const effectiveAc = Math.max(0, safeBase + flatDelta + coverBonus);
  return {
    baseAc: safeBase,
    effectiveAc,
    flatDelta,
    coverBonus,
    formulaHints,
  };
}

/**
 * Interrompe la concentrazione attiva di `casterId` (se presente), rimuovendo:
 * 1. `activeConcentration` dal caster;
 * 2. SOLO i `CombatEffectInstance` su qualunque combattente che hanno `effect.concentrationId === conc.concentrationId`;
 * 3. Tutti i `PendingConcentrationCheck` nella coda con `check.concentrationId === conc.concentrationId`.
 */
export function breakCombatantConcentration(
  state: InitiativeTrackerState,
  casterId: string
): InitiativeTrackerState {
  const caster = state.entries.find((e) => e.id === casterId);
  const activeConc = caster?.activeConcentration;
  if (!activeConc) return state;

  const targetConcId = activeConc.concentrationId;
  const linkedSet = new Set(activeConc.linkedEffectIds);

  const nextEntries = state.entries.map((entry) => {
    const currentEffects = entry.activeEffects ?? [];
    const filteredEffects = currentEffects.filter(
      (eff) => eff.concentrationId !== targetConcId && !linkedSet.has(eff.effectId)
    );
    const nextConditions = deriveCanonicalConditionsFromEffects(filteredEffects);

    if (entry.id === casterId) {
      return {
        ...entry,
        activeConcentration: null,
        activeEffects: filteredEffects,
        conditions: nextConditions,
      };
    }

    if (filteredEffects.length === currentEffects.length) {
      return entry;
    }

    return {
      ...entry,
      activeEffects: filteredEffects,
      conditions: nextConditions,
    };
  });

  const nextChecks = (state.pendingConcentrationChecks ?? []).filter(
    (chk) => chk.concentrationId !== targetConcId
  );

  return {
    ...state,
    entries: nextEntries,
    pendingConcentrationChecks: nextChecks,
  };
}

function isUnableToConcentrate(entry: InitiativeEntry | undefined): boolean {
  return !entry || entry.isDead || entry.hp <= 0 ||
    (entry.activeEffects ?? []).some((effect) => doesStatusBreakConcentration(effect.statusId)) ||
    (entry.conditions ?? []).some((condition) => doesStatusBreakConcentration(condition));
}

export type StartConcentrationPayload = {
  casterId: string;
  spellName: string;
  /** Eventuale stato del catalogo da applicare ai bersagli (es. "benedizione", "anatema", o custom) */
  effectStatusId?: string;
  effectCustomLabel?: string;
  targetIds?: string[];
  remainingTurns?: number | null;
  savePrompt?: CombatEffectSavePrompt | null;
};

/**
 * Avvia una nuova concentrazione per `casterId`.
 * Se `casterId` aveva già una concentrazione attiva, la interrompe prima (rimuovendo i suoi vecchi effetti
 * e i vecchi check pendenti) e poi crea la nuova `ActiveConcentration` + eventuali `CombatEffectInstance` sui bersagli.
 */
export function startCombatantConcentration(
  state: InitiativeTrackerState,
  payload: StartConcentrationPayload
): InitiativeTrackerState {
  const spellName = payload.spellName.trim();
  if (!spellName) return state;

  // Non sostituire una concentrazione valida se il caster non può avviarne un'altra.
  const originalCaster = state.entries.find((entry) => entry.id === payload.casterId);
  if (isUnableToConcentrate(originalCaster)) return state;

  // 1. Interrompi eventuale concentrazione precedente dello stesso caster
  const cleanedState = breakCombatantConcentration(state, payload.casterId);
  const caster = cleanedState.entries.find((e) => e.id === payload.casterId);
  if (!caster || isUnableToConcentrate(caster)) return cleanedState;

  const concentrationId = makeId("conc");
  const targetIds = Array.from(new Set(payload.targetIds ?? []));
  const createdEffectsByTarget = new Map<string, CombatEffectInstance>();
  const linkedEffectIds: string[] = [];

  if (payload.effectStatusId || payload.effectCustomLabel) {
    const rawStatusId = payload.effectStatusId?.trim() || "";
    const def = rawStatusId ? getCombatStatusDefinition(rawStatusId) : undefined;
    const statusId = def
      ? def.id
      : rawStatusId.startsWith("custom:")
      ? rawStatusId
      : slugifyCustomStatus(payload.effectCustomLabel || spellName);
    const label = payload.effectCustomLabel?.trim() || def?.label || spellName;
    const durationTurns =
      payload.remainingTurns !== undefined
        ? payload.remainingTurns
        : def?.defaultDurationTurns ?? null;
    const tickOn = def?.defaultTickOn ?? "turn_end";

    for (const tId of targetIds) {
      const effectId = makeId("eff");
      linkedEffectIds.push(effectId);
      createdEffectsByTarget.set(tId, {
        effectId,
        statusId,
        label,
        targetId: tId,
        sourceCasterId: caster.id,
        sourceName: `${caster.name} (${spellName})`,
        concentrationId,
        ...(durationTurns && durationTurns > 0
          ? {
              duration: {
                remainingTurns: durationTurns,
                tickOn,
                anchorCombatantId: caster.id,
                appliedAtRound: Math.max(1, cleanedState.roundNumber || 1),
                appliedAtTurnIndex: Math.max(0, cleanedState.currentTurnIndex || 0),
              },
            }
          : {}),
        ...(payload.savePrompt ? { savePrompt: payload.savePrompt } : {}),
      });
    }
  }

  const newConc: ActiveConcentration = {
    concentrationId,
    casterId: caster.id,
    spellName,
    linkedEffectIds,
    startedRound: Math.max(1, cleanedState.roundNumber || 1),
    startedTurnIndex: Math.max(0, cleanedState.currentTurnIndex || 0),
    ...(payload.remainingTurns && payload.remainingTurns > 0
      ? { remainingTurns: payload.remainingTurns }
      : {}),
  };

  let nextEntries = cleanedState.entries.map((entry) => {
    let updated = entry;
    if (entry.id === caster.id) {
      updated = {
        ...updated,
        activeConcentration: newConc,
      };
    }
    const addedEffect = createdEffectsByTarget.get(entry.id);
    if (addedEffect) {
      const nextEffects = [...(updated.activeEffects ?? []), addedEffect];
      updated = {
        ...updated,
        activeEffects: nextEffects,
        conditions: deriveCanonicalConditionsFromEffects(nextEffects),
      };
    }
    return updated;
  });

  // Se l'effetto applicato è incapacitante su un bersaglio che stava concentrandosi, interrompi la sua concentrazione
  let nextState: InitiativeTrackerState = {
    ...cleanedState,
    entries: nextEntries,
  };

  for (const [tId, eff] of createdEffectsByTarget.entries()) {
    if (doesStatusBreakConcentration(eff.statusId)) {
      nextState = breakCombatantConcentration(nextState, tId);
    }
  }

  return nextState;
}

export type AddCombatEffectPayload = {
  targetIds: string[];
  statusId?: string;
  customLabel?: string;
  sourceCasterId?: string;
  sourceName?: string;
  /** Se true (o se lo stato richiede concentrazione e c'è un sourceCasterId), collega/avvia la concentrazione sul caster */
  linkToConcentration?: boolean;
  concentrationSpellName?: string;
  remainingTurns?: number | null;
  tickOn?: "turn_start" | "turn_end";
  duration?: CombatEffectDuration | null;
  savePrompt?: CombatEffectSavePrompt | null;
};

/**
 * Aggiunge una o più istanze di effetto (`CombatEffectInstance`) ai bersagli indicati.
 * - Se `linkToConcentration` è attivo e `sourceCasterId` è valorizzato, avvia o sostituisce la concentrazione sul caster
 *   (oppure se il caster sta già concentrandosi sullo stesso `spellName`, aggancia i nuovi `effectId` alla concentrazione esistente).
 * - Se la condizione aggiunta è incapacitante (`incapacitato`, `paralizzato`, `pietrificato`, `privo-di-sensi`, `stordito`),
 *   interrompe automaticamente l'eventuale concentrazione attiva del bersaglio.
 */
export function addCombatEffectInstances(
  state: InitiativeTrackerState,
  payload: AddCombatEffectPayload
): InitiativeTrackerState {
  const targetIds = Array.from(new Set(payload.targetIds.filter(Boolean)));
  if (targetIds.length === 0) return state;

  const rawStatusId = payload.statusId?.trim() || "";
  const def = rawStatusId ? getCombatStatusDefinition(rawStatusId) : undefined;
  const customText = payload.customLabel?.trim() || "";
  const statusId = def
    ? def.id
    : rawStatusId.startsWith("custom:")
    ? rawStatusId
    : slugifyCustomStatus(customText || rawStatusId || "Stato Custom");
  const label = customText || def?.label || statusId.replace(/^custom:/, "");
  if (!label) return state;

  const caster = payload.sourceCasterId
    ? state.entries.find((e) => e.id === payload.sourceCasterId)
    : undefined;
  const shouldConcentrate =
    Boolean(caster) &&
    (payload.linkToConcentration === true ||
      (payload.linkToConcentration === undefined && Boolean(def?.requiresConcentration)));

  if (shouldConcentrate && isUnableToConcentrate(caster)) return state;

  const spellName = payload.concentrationSpellName?.trim() || label;
  let workingState = state;
  let activeConcId: string | undefined;

  if (shouldConcentrate && caster) {
    const existingConc = caster.activeConcentration;
    if (existingConc && existingConc.spellName.toLowerCase() === spellName.toLowerCase()) {
      activeConcId = existingConc.concentrationId;
    } else {
      workingState = breakCombatantConcentration(workingState, caster.id);
      activeConcId = makeId("conc");
    }
  }

  const durationTurns =
    payload.remainingTurns !== undefined
      ? payload.remainingTurns
      : def?.defaultDurationTurns ?? null;
  const tickOn = payload.tickOn ?? def?.defaultTickOn ?? "turn_end";

  const newEffectIds: string[] = [];
  const effectsByTarget = new Map<string, CombatEffectInstance>();

  for (const tId of targetIds) {
    const effectId = makeId("eff");
    newEffectIds.push(effectId);
    const sourceDisplay =
      payload.sourceName?.trim() ||
      (caster ? (shouldConcentrate ? `${caster.name} (${spellName})` : caster.name) : undefined);

    effectsByTarget.set(tId, {
      effectId,
      statusId,
      label,
      targetId: tId,
      ...(caster ? { sourceCasterId: caster.id } : {}),
      ...(sourceDisplay ? { sourceName: sourceDisplay } : {}),
      ...(activeConcId ? { concentrationId: activeConcId } : {}),
      ...(payload.duration
        ? {
            duration: {
              ...payload.duration,
              appliedAtRound:
                payload.duration.appliedAtRound ?? Math.max(1, workingState.roundNumber || 1),
              appliedAtTurnIndex:
                payload.duration.appliedAtTurnIndex ?? Math.max(0, workingState.currentTurnIndex || 0),
            },
          }
        : durationTurns && durationTurns > 0
        ? {
            duration: {
              remainingTurns: durationTurns,
              tickOn,
              anchorCombatantId: caster?.id ?? tId,
              appliedAtRound: Math.max(1, workingState.roundNumber || 1),
              appliedAtTurnIndex: Math.max(0, workingState.currentTurnIndex || 0),
            },
          }
        : {}),
      ...(payload.savePrompt ? { savePrompt: payload.savePrompt } : {}),
    });
  }

  const nextEntries = workingState.entries.map((entry) => {
    let updated = entry;
    const eff = effectsByTarget.get(entry.id);
    if (eff) {
      const nextEffects = [...(updated.activeEffects ?? []), eff];
      updated = {
        ...updated,
        activeEffects: nextEffects,
        conditions: deriveCanonicalConditionsFromEffects(nextEffects),
      };
    }

    if (shouldConcentrate && caster && entry.id === caster.id && activeConcId) {
      const prevConc = updated.activeConcentration;
      const mergedLinked =
        prevConc && prevConc.concentrationId === activeConcId
          ? Array.from(new Set([...prevConc.linkedEffectIds, ...newEffectIds]))
          : newEffectIds;

      updated = {
        ...updated,
        activeConcentration: {
          concentrationId: activeConcId,
          casterId: caster.id,
          spellName,
          linkedEffectIds: mergedLinked,
          startedRound: prevConc?.startedRound ?? Math.max(1, workingState.roundNumber || 1),
          startedTurnIndex: prevConc?.startedTurnIndex ?? Math.max(0, workingState.currentTurnIndex || 0),
          ...(durationTurns && durationTurns > 0 ? { remainingTurns: durationTurns } : {}),
        },
      };
    }

    return updated;
  });

  let finalState: InitiativeTrackerState = {
    ...workingState,
    entries: nextEntries,
  };

  if (doesStatusBreakConcentration(statusId)) {
    for (const tId of targetIds) {
      finalState = breakCombatantConcentration(finalState, tId);
    }
  }

  return finalState;
}

/**
 * Rimuove una singola istanza d'effetto (`effectId`) da un combattente.
 * Se l'effetto era collegato a una concentrazione, lo rimuove anche da `linkedEffectIds` del caster.
 */
export function removeCombatEffectInstance(
  state: InitiativeTrackerState,
  targetId: string,
  effectId: string
): InitiativeTrackerState {
  const target = state.entries.find((e) => e.id === targetId);
  const removedEffect = target?.activeEffects?.find((eff) => eff.effectId === effectId);
  if (!target || !removedEffect) return state;

  const nextEntries = state.entries.map((entry) => {
    let updated = entry;
    if (entry.id === targetId) {
      const nextEffects = (entry.activeEffects ?? []).filter((eff) => eff.effectId !== effectId);
      updated = {
        ...updated,
        activeEffects: nextEffects,
        conditions: deriveCanonicalConditionsFromEffects(nextEffects),
      };
    }
    if (
      removedEffect.concentrationId &&
      updated.activeConcentration?.concentrationId === removedEffect.concentrationId
    ) {
      updated = {
        ...updated,
        activeConcentration: {
          ...updated.activeConcentration,
          linkedEffectIds: updated.activeConcentration.linkedEffectIds.filter((id) => id !== effectId),
        },
      };
    }
    return updated;
  });

  return {
    ...state,
    entries: nextEntries,
  };
}

/**
 * Toggle rapido di una condizione canonica (o stato del catalogo) su un singolo combattente
 * senza fonte specifica (usato dai pulsanti rapidi e dal telecomando mobile):
 * - Se il combattente ha almeno un'istanza di `statusId`, rimuove l'ultima istanza non legata a concentrazione
 *   (o l'ultima istanza in assoluto se tutte sono legate).
 * - Se non ne ha nessuna, ne aggiunge una manuale.
 */
export function toggleCombatStatusOnEntry(
  state: InitiativeTrackerState,
  targetId: string,
  statusId: string
): InitiativeTrackerState {
  const normalizedStatusId = statusId === "privo_di_sensi" ? "privo-di-sensi" : statusId;
  const target = state.entries.find((e) => e.id === targetId);
  if (!target) return state;

  const matching = (target.activeEffects ?? []).filter((eff) => eff.statusId === normalizedStatusId);
  if (matching.length > 0) {
    const manualInstance = [...matching].reverse().find((eff) => !eff.concentrationId);
    const toRemove = manualInstance ?? matching[matching.length - 1]!;
    return removeCombatEffectInstance(state, targetId, toRemove.effectId);
  }

  return addCombatEffectInstances(state, {
    targetIds: [targetId],
    statusId: normalizedStatusId,
    linkToConcentration: false,
  });
}

/**
 * Sincronizza un set completo di condizioni canoniche (`setConditions` legacy / mobile):
 * - Mantiene intatti tutti i buff/stati tattici/custom e le condizioni che erano già presenti;
 * - Rimuove le istanze di condizioni canoniche non più presenti in `nextConditions`;
 * - Aggiunge una nuova istanza manuale per ogni condizione canonica presente in `nextConditions` ma assente.
 */
export function setCanonicalConditionsOnEntry(
  state: InitiativeTrackerState,
  targetId: string,
  nextConditions: readonly CombatConditionId[]
): InitiativeTrackerState {
  const normalizedNext = normalizeCombatConditions(nextConditions);
  const nextSet = new Set<string>(normalizedNext);
  const target = state.entries.find((e) => e.id === targetId);
  if (!target) return state;

  let workingState = state;
  const currentEffects = target.activeEffects ?? [];

  // 1. Rimuovi condizioni canoniche deselezionate
  for (const eff of currentEffects) {
    if (isCanonicalCombatConditionId(eff.statusId) && !nextSet.has(eff.statusId)) {
      workingState = removeCombatEffectInstance(workingState, targetId, eff.effectId);
    }
  }

  // 2. Aggiungi condizioni canoniche nuove
  const updatedTarget = workingState.entries.find((e) => e.id === targetId);
  const existingCanonicals = new Set(deriveCanonicalConditionsFromEffects(updatedTarget?.activeEffects));
  for (const condId of normalizedNext) {
    if (!existingCanonicals.has(condId)) {
      workingState = addCombatEffectInstances(workingState, {
        targetIds: [targetId],
        statusId: condId,
        linkToConcentration: false,
      });
    }
  }

  return workingState;
}

/**
 * Gestisce il comando mobile `concentrato`:
 * passa sempre dal vero modello `ActiveConcentration` (senza creare badge scollegati).
 * - Se il combattente ha già `activeConcentration`, la interrompe rimuovendo eventuali effetti collegati.
 * - Se non ce l'ha, avvia una concentrazione manuale `"Concentrazione"` (senza bersagli).
 */
export function toggleMobileConcentrationOnEntry(
  state: InitiativeTrackerState,
  casterId: string,
  spellName: string = "Concentrazione"
): InitiativeTrackerState {
  const caster = state.entries.find((e) => e.id === casterId);
  if (!caster) return state;
  if (caster.activeConcentration) {
    return breakCombatantConcentration(state, casterId);
  }
  return startCombatantConcentration(state, {
    casterId,
    spellName,
  });
}

/**
 * Applica una mutazione ai Punti Ferita (Danno, Guarigione, Rettifica manuale PF esatti, o PF Temporanei)
 * a partire dallo stato PRE-mutazione (evitando qualsiasi doppia sottrazione).
 *
 * Il danno ricevuto (`kind: "damage"`) è definito come **danno effettivo finale già determinato dal Master**
 * (dopo eventuali resistenze, vulnerabilità o riduzioni).
 * - Consuma prima `tempHp` e poi `hp`.
 * - Incrementa `damageTaken` dell'ammontare del danno effettivo.
 * - Se il bersaglio scende a `hp === 0`, interrompe immediatamente la sua concentrazione e pulisce i suoi check pendenti.
 * - Se il bersaglio sopravvive (`hp > 0`) e ha `activeConcentration` attiva, accoda un `PendingConcentrationCheck`
 *   con `dc = Math.max(10, Math.floor(amount / 2))` calcolato sull'intero `amount` di danno subito (anche se assorbito
 *   in parte o totalmente dai PF temporanei, come da RAW 5e PHB p. 198 / 203).
 * - `kind: "heal"` e `kind: "set_exact"` (> 0) non generano mai check di concentrazione né modificano `damageTaken`.
 * - `kind: "set_exact"` con `exactHp <= 0` interrompe la concentrazione per scesa a 0 PF.
 */
export function applyCombatHpMutation(
  state: InitiativeTrackerState,
  mutation: CombatHpMutation
): InitiativeTrackerState {
  const target = state.entries.find((e) => e.id === mutation.targetId);
  if (!target) return state;

  if (mutation.kind === "set_temp_hp") {
    const nextTempHp = Math.max(0, Math.trunc(mutation.tempHp));
    return {
      ...state,
      entries: state.entries.map((e) =>
        e.id === mutation.targetId ? { ...e, tempHp: nextTempHp } : e
      ),
    };
  }

  if (mutation.kind === "heal") {
    const amount = Math.max(0, Math.trunc(mutation.amount));
    if (amount === 0) return state;
    const unclamped = target.hp + amount;
    const nextHp = Math.max(0, Math.min(unclamped, target.maxHp > 0 ? target.maxHp : unclamped));
    const maxHp = target.maxHp > 0 ? target.maxHp : Math.max(target.maxHp, nextHp);
    const isDead =
      target.type === "monster" || target.type === "custom" ? nextHp === 0 : target.isDead;

    return {
      ...state,
      entries: state.entries.map((e) =>
        e.id === mutation.targetId ? { ...e, hp: nextHp, maxHp, isDead } : e
      ),
    };
  }

  if (mutation.kind === "set_exact") {
    const clamped = Math.max(
      0,
      Math.min(Math.trunc(mutation.exactHp), target.maxHp > 0 ? target.maxHp : Math.trunc(mutation.exactHp))
    );
    const maxHp = target.maxHp > 0 ? target.maxHp : Math.max(target.maxHp, clamped);
    const isDead =
      target.type === "monster" || target.type === "custom" ? clamped === 0 : target.isDead;

    const updatedState: InitiativeTrackerState = {
      ...state,
      entries: state.entries.map((e) =>
        e.id === mutation.targetId ? { ...e, hp: clamped, maxHp, isDead } : e
      ),
    };

    if (clamped === 0 && target.activeConcentration) {
      return breakCombatantConcentration(updatedState, target.id);
    }
    return updatedState;
  }

  // kind === "damage"
  const damageAmount = Math.max(0, Math.trunc(mutation.amount));
  if (damageAmount === 0) return state;

  const currentTemp = Math.max(0, Math.trunc(target.tempHp ?? 0));
  const absorbedByTemp = Math.min(currentTemp, damageAmount);
  const nextTempHp = currentTemp - absorbedByTemp;
  const remainingDamage = damageAmount - absorbedByTemp;
  const nextHp = Math.max(0, target.hp - remainingDamage);
  const isDead =
    target.type === "monster" || target.type === "custom" ? nextHp === 0 : target.isDead;
  const nextDamageTaken = Math.max(0, (target.damageTaken ?? 0) + damageAmount);

  let nextState: InitiativeTrackerState = {
    ...state,
    entries: state.entries.map((e) =>
      e.id === mutation.targetId
        ? {
            ...e,
            hp: nextHp,
            tempHp: nextTempHp,
            isDead,
            damageTaken: nextDamageTaken,
          }
        : e
    ),
  };

  if (!target.activeConcentration) {
    return nextState;
  }

  // Se il danno porta il caster a 0 PF, perde automaticamente la concentrazione
  if (nextHp <= 0) {
    return breakCombatantConcentration(nextState, target.id);
  }

  // Altrimenti accoda un check di concentrazione riferito alla specifica concentrationId
  const dc = Math.max(10, Math.floor(damageAmount / 2));
  const newCheck: PendingConcentrationCheck = {
    checkId: makeId("ccheck"),
    casterId: target.id,
    casterName: target.name,
    concentrationId: target.activeConcentration.concentrationId,
    spellName: target.activeConcentration.spellName,
    damageTaken: damageAmount,
    dc,
    conSaveBonus: target.savingThrows?.cos ?? 0,
    conSaveSource: target.savingThrowsSource ?? (target.type === "pc" ? "estimated" : "sheet"),
    ...(mutation.sourceLabel ? { sourceDescription: mutation.sourceLabel } : {}),
    createdAt: Date.now(),
  };

  return {
    ...nextState,
    pendingConcentrationChecks: [...(nextState.pendingConcentrationChecks ?? []), newCheck],
  };
}

/**
 * Risolve un `PendingConcentrationCheck` dalla coda.
 * - Verifica che `check.concentrationId` corrisponda ancora alla `activeConcentration.concentrationId` attuale del caster.
 * - Se il check è obsoleto (la concentrazione era già stata sostituita o interrotta), lo rimuove senza toccare la nuova concentrazione.
 * - Se `outcome === "failed"` e la `concentrationId` coincide ancora, interrompe quella concentrazione e rimuove tutti gli altri check ad essa associati.
 */
export function resolvePendingConcentrationCheck(
  state: InitiativeTrackerState,
  checkId: string,
  outcome: "passed" | "failed"
): InitiativeTrackerState {
  const queue = state.pendingConcentrationChecks ?? [];
  const check = queue.find((c) => c.checkId === checkId);
  if (!check) return state;

  const remainingQueue = queue.filter((c) => c.checkId !== checkId);
  const stateWithoutCheck: InitiativeTrackerState = {
    ...state,
    pendingConcentrationChecks: remainingQueue,
  };

  if (outcome === "passed") {
    return stateWithoutCheck;
  }

  // outcome === "failed": interrompi SOLO se il caster ha ancora quella specifica concentrationId
  const caster = stateWithoutCheck.entries.find((e) => e.id === check.casterId);
  if (caster?.activeConcentration?.concentrationId === check.concentrationId) {
    return breakCombatantConcentration(stateWithoutCheck, caster.id);
  }

  return stateWithoutCheck;
}

/**
 * Aggiorna manualmente il bonus TS COS (o tutti i TS) di un combattente, marcando `savingThrowsSource: "manual"`,
 * e propaga il nuovo bonus a tutti i check pendenti di quel combattente.
 */
export function updateCombatantSavingThrowBonus(
  state: InitiativeTrackerState,
  entryId: string,
  ability: keyof SavingThrowsMap,
  bonus: number
): InitiativeTrackerState {
  const cleanBonus = Number.isFinite(bonus) ? Math.trunc(bonus) : 0;
  const nextEntries = state.entries.map((entry) => {
    if (entry.id !== entryId) return entry;
    const baseSaves: SavingThrowsMap = entry.savingThrows ?? {
      for: 0,
      des: 0,
      cos: 0,
      int: 0,
      sag: 0,
      car: 0,
    };
    return {
      ...entry,
      savingThrows: {
        ...baseSaves,
        [ability]: cleanBonus,
      },
      savingThrowsSource: "manual" as const,
    };
  });

  const nextChecks =
    ability === "cos"
      ? (state.pendingConcentrationChecks ?? []).map((chk) =>
          chk.casterId === entryId
            ? { ...chk, conSaveBonus: cleanBonus, conSaveSource: "manual" as const }
            : chk
        )
      : state.pendingConcentrationChecks;

  return {
    ...state,
    entries: nextEntries,
    ...(nextChecks ? { pendingConcentrationChecks: nextChecks } : {}),
  };
}

/**
 * Segna un mostro/custom come morto o lo riporta in vita (1 PF).
 * Se segnato come morto, interrompe immediatamente la sua concentrazione.
 */
export function setCombatantDeadState(
  state: InitiativeTrackerState,
  entryId: string,
  nextDead: boolean
): InitiativeTrackerState {
  const target = state.entries.find((e) => e.id === entryId);
  if (!target) return state;

  const revivedHp = target.maxHp > 0 ? 1 : Math.max(1, target.hp);
  let nextState: InitiativeTrackerState = {
    ...state,
    entries: state.entries.map((e) =>
      e.id === entryId
        ? {
            ...e,
            isDead: nextDead,
            hp: nextDead ? 0 : revivedHp,
          }
        : e
    ),
  };

  if (nextDead && target.activeConcentration) {
    nextState = breakCombatantConcentration(nextState, entryId);
  }

  return nextState;
}

/**
 * Rimuove un combattente dallo scontro:
 * - Se aveva una concentrazione attiva, rimuove tutti gli effetti collegati dagli altri combattenti e i suoi check pendenti.
 * - Riallinea `currentTurnIndex`.
 * - Sospende l'automatismo delle durate ancorate al combattente rimosso (`anchorRemoved: true`), preservando la scadenza per intervento manuale del GM.
 */
export function removeCombatantFromState(
  state: InitiativeTrackerState,
  entryId: string
): InitiativeTrackerState {
  const removedIndex = state.entries.findIndex((e) => e.id === entryId);
  if (removedIndex < 0) return state;

  const cleaned = breakCombatantConcentration(state, entryId);
  const nextEntries = cleaned.entries
    .filter((e) => e.id !== entryId)
    .map((entry) => {
      const effects = entry.activeEffects ?? [];
      if (!effects.some((eff) => eff.duration?.anchorCombatantId === entryId)) {
        return entry;
      }
      return {
        ...entry,
        activeEffects: effects.map((eff) =>
          eff.duration?.anchorCombatantId === entryId
            ? {
                ...eff,
                duration: {
                  ...eff.duration,
                  anchorRemoved: true,
                },
              }
            : eff
        ),
      };
    });

  let currentTurnIndex = cleaned.currentTurnIndex;
  if (removedIndex < currentTurnIndex) {
    currentTurnIndex -= 1;
  }
  if (currentTurnIndex >= nextEntries.length) {
    currentTurnIndex = Math.max(0, nextEntries.length - 1);
  }

  return {
    ...cleaned,
    entries: nextEntries,
    currentTurnIndex,
    pendingSaveReminders: (cleaned.pendingSaveReminders ?? []).filter((r) => r.targetId !== entryId),
    lastAdvanceUndoSnapshot: null,
  };
}

/**
 * Avanza l'iniziativa al turno successivo gestendo il ciclo di vita completo del combattimento:
 * 1. Decrementa le durate con tickOn === "turn_end" ancorate al combattente che conclude il turno.
 * 2. Emette PendingSaveReminder per gli effetti che richiedono un TS a fine turno.
 * 3. Salta i mostri morti ma ne processa regolarmente gli eventi di inizio/fine turno per le durate a essi ancorate.
 * 4. Decrementa le durate con tickOn === "turn_start" ancorate al combattente che inizia il turno.
 * 5. Emette PendingSaveReminder per gli effetti che richiedono un TS a inizio turno.
 * 6. Resetta usedReaction sul combattente che inizia il proprio turno.
 * 7. Rimuove singolarmente gli effetti scaduti; la concentrazione scade solo dal proprio timer autoritativo.
 * 8. Crea un TurnAdvanceUndoSnapshot protetto per consentire l'annullamento sicuro.
 */
export function transitionNextTurn(state: InitiativeTrackerState): InitiativeTrackerState {
  if (!state.entries || state.entries.length === 0) return state;

  const total = state.entries.length;
  const currentIdx = Math.max(0, Math.min(state.currentTurnIndex, total - 1));
  const currentRound = Math.max(1, state.roundNumber);
  const currentCombatant = state.entries[currentIdx];

  // Snapshot profondo dello stato corrente prima delle mutazioni dell'avanzamento
  const previousState: InitiativeTrackerState = {
    ...state,
    entries: state.entries.map((e) => ({
      ...e,
      activeEffects: (e.activeEffects ?? []).map((eff) => ({
        ...eff,
        duration: eff.duration ? { ...eff.duration } : undefined,
        savePrompt: eff.savePrompt ? { ...eff.savePrompt } : undefined,
      })),
      activeConcentration: e.activeConcentration
        ? { ...e.activeConcentration, linkedEffectIds: [...e.activeConcentration.linkedEffectIds] }
        : null,
      savingThrows: e.savingThrows ? { ...e.savingThrows } : undefined,
      deathSaves: e.deathSaves ? { ...e.deathSaves } : undefined,
    })),
    pendingConcentrationChecks: (state.pendingConcentrationChecks ?? []).map((c) => ({ ...c })),
    pendingSaveReminders: (state.pendingSaveReminders ?? []).map((r) => ({ ...r })),
    lastAdvanceUndoSnapshot: null,
  };

  let workingEntries = state.entries.map((e) => ({ ...e }));
  let newReminders: PendingSaveReminder[] = [...(state.pendingSaveReminders ?? [])];
  const expiredConcentrationIds = new Set<string>();

  const tickAnchored = (
    anchorId: string,
    timing: "turn_start" | "turn_end",
    round: number,
    turnIdx: number
  ) => {
    if (timing === "turn_start") {
      workingEntries = workingEntries.map((entry) => {
        const conc = entry.activeConcentration;
        if (!conc || conc.casterId !== anchorId || conc.remainingTurns == null) return entry;
        if (conc.startedRound === round && conc.startedTurnIndex === turnIdx) return entry;
        const remainingTurns = Math.max(0, Math.trunc(conc.remainingTurns) - 1);
        if (remainingTurns <= 0) expiredConcentrationIds.add(conc.concentrationId);
        return { ...entry, activeConcentration: { ...conc, remainingTurns } };
      });
    }
    workingEntries = workingEntries.map((entry) => {
      const effects = entry.activeEffects ?? [];
      let changed = false;
      const nextEffects = effects.map((eff) => {
        if (
          !eff.duration ||
          eff.duration.anchorRemoved ||
          eff.duration.anchorCombatantId !== anchorId ||
          eff.duration.tickOn !== timing
        ) {
          return eff;
        }

        // Evita scadenza immediata se l'effetto è stato applicato in questo stesso round e turno dell'ancora
        if (
          eff.duration.appliedAtRound === round &&
          eff.duration.appliedAtTurnIndex === turnIdx
        ) {
          return eff;
        }

        changed = true;
        const currentRem = eff.duration.remainingTurns ?? 1;
        const nextRem = Math.max(0, currentRem - 1);
        return {
          ...eff,
          duration: {
            ...eff.duration,
            remainingTurns: nextRem,
          },
        };
      });

      if (!changed) return entry;
      return {
        ...entry,
        activeEffects: nextEffects,
      };
    });
  };

  // 1. Il turno del combattente corrente STA TERMINANDO (turn_end)
  if (currentCombatant) {
    tickAnchored(currentCombatant.id, "turn_end", currentRound, currentIdx);

    const currentEntry = workingEntries.find((e) => e.id === currentCombatant.id);
    if (currentEntry) {
      for (const eff of currentEntry.activeEffects ?? []) {
        if (eff.savePrompt && eff.savePrompt.timing === "turn_end") {
          const existing = newReminders.some(
            (r) => r.effectId === eff.effectId && r.timing === "turn_end"
          );
          if (!existing) {
            newReminders.push({
              reminderId: makeId("rem"),
              effectId: eff.effectId,
              targetId: currentEntry.id,
              targetName: currentEntry.name,
              statusId: eff.statusId,
              label: eff.label,
              ability: eff.savePrompt.ability,
              dc: eff.savePrompt.dc,
              timing: "turn_end",
              onPass: eff.savePrompt.onPass ?? "remove_effect",
              sourceName: eff.sourceName,
              saveBonus: currentEntry.savingThrows?.[eff.savePrompt.ability] ?? 0,
              saveSource: currentEntry.savingThrowsSource ?? "estimated",
              roundNumber: currentRound,
              turnIndex: currentIdx,
              createdAt: Date.now(),
            });
          }
        }
      }
    }
  }

  // 2. Avanza l'indice di turno e processa i turni dei mostri morti saltati
  let nextIdx = currentIdx;
  let nextRound = currentRound;
  let attempts = 0;

  do {
    nextIdx = (nextIdx + 1) % total;
    if (nextIdx === 0) {
      nextRound += 1;
    }
    attempts++;
    const candidate = workingEntries[nextIdx];
    if (isCombatantDeadOrSkipped(candidate) && attempts < total) {
      // Processa turn_start e turn_end per gli effetti ancorati al mostro morto saltato
      tickAnchored(candidate.id, "turn_start", nextRound, nextIdx);
      tickAnchored(candidate.id, "turn_end", nextRound, nextIdx);
    } else {
      break;
    }
  } while (attempts < total);

  // 3. Il turno del nuovo combattente attivo STA INIZIANDO (turn_start)
  const newActiveCombatant = workingEntries[nextIdx];
  if (newActiveCombatant) {
    tickAnchored(newActiveCombatant.id, "turn_start", nextRound, nextIdx);

    const updatedNewActive = workingEntries.find((e) => e.id === newActiveCombatant.id);
    if (updatedNewActive) {
      for (const eff of updatedNewActive.activeEffects ?? []) {
        if (eff.savePrompt && eff.savePrompt.timing === "turn_start") {
          const existing = newReminders.some(
            (r) => r.effectId === eff.effectId && r.timing === "turn_start"
          );
          if (!existing) {
            newReminders.push({
              reminderId: makeId("rem"),
              effectId: eff.effectId,
              targetId: updatedNewActive.id,
              targetName: updatedNewActive.name,
              statusId: eff.statusId,
              label: eff.label,
              ability: eff.savePrompt.ability,
              dc: eff.savePrompt.dc,
              timing: "turn_start",
              onPass: eff.savePrompt.onPass ?? "remove_effect",
              sourceName: eff.sourceName,
              saveBonus: updatedNewActive.savingThrows?.[eff.savePrompt.ability] ?? 0,
              saveSource: updatedNewActive.savingThrowsSource ?? "estimated",
              roundNumber: nextRound,
              turnIndex: nextIdx,
              createdAt: Date.now(),
            });
          }
        }
      }
    }

    // Reset della reazione usata per il combattente che inizia il turno
    workingEntries = workingEntries.map((e) =>
      e.id === newActiveCombatant.id ? { ...e, usedReaction: false } : e
    );
  }

  // 4. Pulizia degli effetti scaduti (remainingTurns <= 0)
  // Le durate dei singoli effetti sono indipendenti dalla durata autoritativa della concentrazione.
  let stateWithWorkingEntries: InitiativeTrackerState = {
    ...state,
    entries: workingEntries,
    currentTurnIndex: nextIdx,
    roundNumber: nextRound,
    pendingSaveReminders: newReminders,
  };

  const expiredConcentrationsToBreak = new Set<string>();
  const nonConcentrationEffectsToRemove: Array<{ targetId: string; effectId: string }> = [];

  for (const entry of workingEntries) {
    for (const eff of entry.activeEffects ?? []) {
      if (eff.duration && eff.duration.remainingTurns !== null && eff.duration.remainingTurns <= 0) {
        // La durata dell'effetto e quella della concentrazione sono indipendenti.
        // La scadenza di un effetto collegato rimuove solo quell'effetto.
        if (eff.concentrationId && expiredConcentrationIds.has(eff.concentrationId)) continue;
        nonConcentrationEffectsToRemove.push({ targetId: entry.id, effectId: eff.effectId });
      }
    }
  }

  for (const concId of expiredConcentrationIds) {
    const caster = workingEntries.find((entry) => entry.activeConcentration?.concentrationId === concId);
    if (caster) expiredConcentrationsToBreak.add(caster.id);
  }

  for (const casterId of expiredConcentrationsToBreak) {
    stateWithWorkingEntries = breakCombatantConcentration(stateWithWorkingEntries, casterId);
  }

  for (const { targetId, effectId } of nonConcentrationEffectsToRemove) {
    stateWithWorkingEntries = removeCombatEffectInstance(
      stateWithWorkingEntries,
      targetId,
      effectId
    );
  }

  // Pulisci i promemoria per effetti che non sono più attivi
  const activeEffectIds = new Set<string>();
  for (const e of stateWithWorkingEntries.entries) {
    for (const eff of e.activeEffects ?? []) {
      activeEffectIds.add(eff.effectId);
    }
  }
  const validReminders = (stateWithWorkingEntries.pendingSaveReminders ?? []).filter((r) =>
    activeEffectIds.has(r.effectId)
  );

  const finalStateCandidate: InitiativeTrackerState = {
    ...stateWithWorkingEntries,
    pendingSaveReminders: validReminders,
    lastAdvanceUndoSnapshot: null,
  };

  const expectedPostSignature = initiativeStateSyncSignature(finalStateCandidate);
  const undoSnapshot: TurnAdvanceUndoSnapshot = {
    previousTurnIndex: currentIdx,
    previousRoundNumber: currentRound,
    expectedPostSignature,
    previousState,
    timestamp: Date.now(),
  };

  return {
    ...finalStateCandidate,
    lastAdvanceUndoSnapshot: undoSnapshot,
  };
}

export type UndoAdvanceResult = {
  nextState: InitiativeTrackerState;
  undone: boolean;
  message: string;
};

/**
 * Annulla l'ultimo avanzamento di turno verificando la corrispondenza esatta della signature:
 * - Se nessuna mutazione successiva è intervenuta (danni, PF, effetti o telecomando mobile), ripristina lo stato precedente.
 * - Se lo stato è mutato o la signature non coincide, l'annullamento viene bloccato per proteggere l'integrità dei dati.
 */
export function undoAdvanceTurn(state: InitiativeTrackerState): UndoAdvanceResult {
  const snapshot = state.lastAdvanceUndoSnapshot;
  if (!snapshot) {
    return {
      nextState: state,
      undone: false,
      message: "Nessun avanzamento di turno da annullare.",
    };
  }

  // Confronta la firma dello stato ATTUALE con quella attesa subito dopo l'avanzamento
  const currentSig = initiativeStateSyncSignature({
    ...state,
    lastAdvanceUndoSnapshot: null,
  });

  if (currentSig !== snapshot.expectedPostSignature) {
    return {
      nextState: state,
      undone: false,
      message:
        "Impossibile annullare l'avanzamento: sono intervenute modifiche successive (danni, effetti, PF o comandi remoti).",
    };
  }

  const restored = snapshot.previousState;
  return {
    nextState: {
      ...restored,
      lastAdvanceUndoSnapshot: null,
    },
    undone: true,
    message: "Avanzamento di turno annullato con successo.",
  };
}

/**
 * Risolve un promemoria TS (PendingSaveReminder):
 * - Se superato e l'effetto prevede onPass === "remove_effect", rimuove l'istanza dell'effetto.
 * - Rimuove il promemoria dalla coda.
 */
export function resolvePendingSaveReminder(
  state: InitiativeTrackerState,
  reminderId: string,
  outcome: "passed" | "failed"
): InitiativeTrackerState {
  const queue = state.pendingSaveReminders ?? [];
  const reminder = queue.find((r) => r.reminderId === reminderId);
  if (!reminder) return state;

  const nextQueue = queue.filter((r) => r.reminderId !== reminderId);
  let workingState: InitiativeTrackerState = {
    ...state,
    pendingSaveReminders: nextQueue,
    lastAdvanceUndoSnapshot: null,
  };

  if (outcome === "passed" && reminder.onPass === "remove_effect") {
    workingState = removeCombatEffectInstance(workingState, reminder.targetId, reminder.effectId);
  }

  return {
    ...workingState,
    lastAdvanceUndoSnapshot: null,
  };
}

/**
 * Consuma manualmente un effetto monouso (es. Ispirazione Bardica, Guida, Aiuto) rimuovendo
 * quella specifica istanza dal bersaglio.
 */
export function consumeSingleUseEffect(
  state: InitiativeTrackerState,
  targetId: string,
  effectId: string
): InitiativeTrackerState {
  const updated = removeCombatEffectInstance(state, targetId, effectId);
  return {
    ...updated,
    lastAdvanceUndoSnapshot: null,
  };
}

export type ApplyCombatCommandResult = {
  nextState: InitiativeTrackerState;
  success: boolean;
  message: string;
  appliedOperationIds?: string[];
};

export type UndoCombatCommandResult = {
  nextState: InitiativeTrackerState;
  undone: boolean;
  message: string;
};

/**
 * Applica una proposta di comando in modo atomico:
 * 1. Verifica che la proposta non sia già stata applicata (idempotenza via appliedProposalIds);
 * 2. Verifica che lo stato non sia mutato rispetto al momento della generazione della proposta (stale state check via initiativeStateSyncSignature);
 * 3. Applica selettivamente le sole operazioni confermate dal Master (selectedOpIds);
 * 4. Utilizza le funzioni di transizione deterministiche preesistenti (applyCombatHpMutation, addCombatEffectInstances, removeCombatEffectInstance, startCombatantConcentration, breakCombatantConcentration);
 * 5. Registra uno snapshot per l'annullamento sicuro (lastCommandUndoSnapshot).
 */
export function applyCombatCommandProposal(
  state: InitiativeTrackerState,
  proposal: CombatCommandProposal,
  selectedOpIds?: string[]
): ApplyCombatCommandResult {
  if (!validateCombatCommandProposal(proposal)) {
    return { nextState: state, success: false, message: "La proposta non supera la validazione runtime. Nessuna modifica è stata applicata." };
  }
  if (state.appliedProposalIds?.includes(proposal.proposalId)) {
    return {
      nextState: state,
      success: false,
      message: "Questa proposta di comando è già stata applicata.",
    };
  }

  const currentSig = initiativeStateSyncSignature(state);
  if (currentSig !== proposal.stateSignatureAtCreation) {
    return {
      nextState: state,
      success: false,
      message:
        "Lo stato del combattimento è cambiato dopo la formulazione della proposta. Rianalizza il comando prima di applicarlo.",
    };
  }

  const selectedSet = selectedOpIds ? new Set(selectedOpIds) : null;
  if (selectedSet && Array.from(selectedSet).some((id) => !proposal.operations.some((op) => op.id === id))) {
    return { nextState: state, success: false, message: "La selezione contiene operazioni non presenti nella proposta." };
  }
  const opsToApply = proposal.operations.filter((op) => !selectedSet || selectedSet.has(op.id));
  if (opsToApply.length === 0) {
    return {
      nextState: state,
      success: false,
      message: "Nessuna operazione selezionata da applicare.",
    };
  }
  if (proposal.unresolvedTargets.length > 0) {
    return { nextState: state, success: false, message: "Completa tutti i bersagli e i dati mancanti prima di applicare la proposta." };
  }
  if (opsToApply.some((op) => proposal.missingData.some((missing) => missing.operationId === op.id))) {
    return { nextState: state, success: false, message: "Completa i dati richiesti per tutte le operazioni selezionate." };
  }
  const entryById = new Map(state.entries.map((entry) => [entry.id, entry]));
  for (const op of opsToApply) {
    if (op.kind === "damage" || op.kind === "heal") {
      if (!entryById.has(op.targetId) || !Number.isInteger(op.amount) || op.amount === null || op.amount <= 0 || op.amount > 10000) return { nextState: state, success: false, message: "Danno o cura incompleti o fuori limite." };
    } else if (op.kind === "set_exact_hp") {
      if (!entryById.has(op.targetId) || !Number.isInteger(op.exactHp) || op.exactHp === null || op.exactHp < 0 || op.exactHp > 10000) return { nextState: state, success: false, message: "PF esatti incompleti o fuori limite." };
    } else if (op.kind === "add_effect") {
      const definition = getCombatStatusDefinition(op.statusId);
      const knownStatus = Boolean(definition) || /^custom:[a-z0-9àèéìòù_-]{1,80}$/i.test(op.statusId);
      const concentrationRequired = op.linkToConcentration ?? Boolean(definition?.requiresConcentration);
      const caster = op.sourceCasterId ? entryById.get(op.sourceCasterId) : undefined;
      if (!entryById.has(op.targetId) || (op.sourceCasterId && !caster) || !knownStatus || !op.label.trim() || op.label.length > 160 || (op.durationTurns != null && (!Number.isInteger(op.durationTurns) || op.durationTurns < 1 || op.durationTurns > 10000)) || (concentrationRequired && (!caster || isUnableToConcentrate(caster)))) return { nextState: state, success: false, message: "Effetto incompleto, stato non riconosciuto o caster incapacitato." };
    } else if (op.kind === "remove_effect") {
      if (!entryById.has(op.targetId) || (!op.statusId && !op.effectId)) return { nextState: state, success: false, message: "Rimozione senza bersaglio o stato da rimuovere." };
    } else if (op.kind === "start_concentration") {
      const caster = entryById.get(op.casterId);
      if (!caster || !op.spellName.trim() || op.spellName.length > 160 || isUnableToConcentrate(caster) || (op.targetIds ?? []).some((id) => !entryById.has(id))) return { nextState: state, success: false, message: "Concentrazione incompleta o caster incapacitato." };
    } else if (!entryById.has(op.casterId)) {
      return { nextState: state, success: false, message: "Caster non presente nel combattimento." };
    }
  }

  const previousState: InitiativeTrackerState = {
    ...buildInitiativeDraftState(state),
    appliedProposalIds: state.appliedProposalIds ?? [],
    // Lo snapshot undo non va mai ricopiato dentro se stesso.
    lastCommandUndoSnapshot: null,
  };

  let workingState: InitiativeTrackerState = state;
  const appliedIds: string[] = [];

  for (const op of opsToApply) {
    const beforeOpState = workingState;
    switch (op.kind) {
      case "damage": {
        if (Number.isInteger(op.amount) && op.amount > 0 && workingState.entries.some((e) => e.id === op.targetId)) {
          workingState = applyCombatHpMutation(workingState, {
            targetId: op.targetId,
            kind: "damage",
            amount: op.amount!,
            sourceLabel: op.sourceLabel,
          });
          appliedIds.push(op.id);
        }
        break;
      }
      case "heal": {
        if (Number.isInteger(op.amount) && op.amount > 0 && workingState.entries.some((e) => e.id === op.targetId)) {
          workingState = applyCombatHpMutation(workingState, {
            targetId: op.targetId,
            kind: "heal",
            amount: op.amount!,
          });
          appliedIds.push(op.id);
        }
        break;
      }
      case "set_exact_hp": {
        if (op.exactHp! >= 0 && workingState.entries.some((e) => e.id === op.targetId)) {
          workingState = applyCombatHpMutation(workingState, {
            targetId: op.targetId,
            kind: "set_exact",
            exactHp: op.exactHp!,
          });
          appliedIds.push(op.id);
        }
        break;
      }
      case "add_effect": {
        if (op.statusId && workingState.entries.some((e) => e.id === op.targetId)) {
          workingState = addCombatEffectInstances(workingState, {
            targetIds: [op.targetId],
            statusId: op.statusId,
            customLabel: op.label,
            sourceCasterId: op.sourceCasterId,
            sourceName: op.sourceName,
            linkToConcentration: op.linkToConcentration,
            concentrationSpellName: op.spellName,
            remainingTurns: op.durationTurns,
          });
          appliedIds.push(op.id);
        }
        break;
      }
      case "remove_effect": {
        const target = workingState.entries.find((e) => e.id === op.targetId);
        if (target) {
          if (op.effectId) {
            workingState = removeCombatEffectInstance(workingState, op.targetId, op.effectId);
            appliedIds.push(op.id);
          } else if (op.statusId) {
            const normStatus = op.statusId === "privo_di_sensi" ? "privo-di-sensi" : op.statusId;
            const matching = (target.activeEffects ?? []).filter(
              (e) => e.statusId === normStatus || e.statusId === op.statusId
            );
            if (matching.length > 0) {
              for (const eff of matching) {
                workingState = removeCombatEffectInstance(workingState, op.targetId, eff.effectId);
              }
            } else if (isCanonicalCombatConditionId(normStatus)) {
              workingState = setCanonicalConditionsOnEntry(
                workingState,
                op.targetId,
                (target.conditions ?? []).filter((c) => c !== normStatus)
              );
            }
            appliedIds.push(op.id);
          }
        }
        break;
      }
      case "start_concentration": {
        if (op.spellName && workingState.entries.some((e) => e.id === op.casterId)) {
          workingState = startCombatantConcentration(workingState, {
            casterId: op.casterId,
            spellName: op.spellName,
            effectStatusId: op.linkedStatusId,
            targetIds: op.targetIds,
          });
          appliedIds.push(op.id);
        }
        break;
      }
      case "break_concentration": {
        if (workingState.entries.some((e) => e.id === op.casterId)) {
          workingState = breakCombatantConcentration(workingState, op.casterId);
          appliedIds.push(op.id);
        }
        break;
      }
    }
    if (!appliedIds.includes(op.id) || workingState === beforeOpState) {
      return { nextState: state, success: false, message: `Operazione non valida o non applicabile: ${op.id}. Nessuna modifica è stata applicata.` };
    }
  }

  const expectedPostSignature = initiativeStateSyncSignature(workingState);
  const undoSnapshot: CommandUndoSnapshot = {
    proposalId: proposal.proposalId,
    expectedPostSignature,
    previousState,
    appliedAt: Date.now(),
  };

  const nextApplied = Array.from(
    new Set([...(workingState.appliedProposalIds ?? []), proposal.proposalId])
  );

  return {
    nextState: {
      ...workingState,
      appliedProposalIds: nextApplied,
      lastCommandUndoSnapshot: undoSnapshot,
      lastAdvanceUndoSnapshot: null, // qualsiasi mutazione tattica invalida l'annullamento dell'avanzamento turno
    },
    success: true,
    message: `${appliedIds.length} operazion${appliedIds.length === 1 ? "e applicata" : "i applicate"} con successo.`,
    appliedOperationIds: appliedIds,
  };
}

/**
 * Annulla l'ultimo comando applicato verificando che lo stato attuale corrisponda esattamente
 * a quello atteso subito dopo l'esecuzione del comando (senza mutazioni successive).
 */
export function undoLastCommand(state: InitiativeTrackerState): UndoCombatCommandResult {
  const snapshot = state.lastCommandUndoSnapshot;
  if (!snapshot) {
    return {
      nextState: state,
      undone: false,
      message: "Nessun comando da annullare.",
    };
  }

  const currentSig = initiativeStateSyncSignature(state);
  if (currentSig !== snapshot.expectedPostSignature) {
    return {
      nextState: state,
      undone: false,
      message:
        "Impossibile annullare il comando: sono intervenute modifiche successive (danni, effetti, turni o comandi remoti).",
    };
  }

  const restored = snapshot.previousState;
  return {
    nextState: {
      ...restored,
      // L'undo ripristina l'effetto sul combattimento, ma il marker d'idempotenza resta.
      appliedProposalIds: Array.from(new Set([...(state.appliedProposalIds ?? []), snapshot.proposalId])),
      lastCommandUndoSnapshot: null,
      lastAdvanceUndoSnapshot: null,
    },
    undone: true,
    message: "Ultimo comando annullato con successo.",
  };
}
