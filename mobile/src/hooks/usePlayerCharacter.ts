import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../api/supabase';
import { operationTouchesSessionLiveResources, type MobileCharacterOperation } from '../lib/character-state';
import { SESSION_LIVE_RESOURCES_LOCKED } from '../lib/session-live';
import { useSessionLiveCharacter } from './useSessionLiveCharacter';
import type {
  CharacterSheetPersonality,
  CharacterSheetSpell,
  CharacterSheetWeapon,
} from '../lib/character-sheet';
import { useAuth } from '../contexts/AuthContext';
import { useCampaign } from '../contexts/CampaignContext';
import {
  PlayerCharacter,
  AbilityKey,
  AbilityScoreEntry,
  SkillKey,
  SkillEntry,
  SavingThrowEntry,
} from '../types';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  SKILL_METADATA,
  deriveMobileCharacterStats,
  projectMobileCharacter as projectCharacter,
} from '../lib/character-projection';

export { SKILL_METADATA, projectCharacter };

export const EMPTY_CHARACTER_FALLBACK: PlayerCharacter = {
  id: '', campaign_id: '', name: 'Nessun Personaggio Assegnato', image_url: null,
  sheet_file_path: null, current_xp: 0, level: 0, character_class: null,
  class_subclass: null, armor_class: null, hit_points: null, background: null,
  race_slug: null, subclass_slug: null, background_slug: null, assigned_to: null,
  coins_gp: 0, coins_sp: 0, coins_cp: 0, created_at: '', updated_at: '', rules_snapshot: {},
};
export const DEFAULT_FALLBACK_CHARACTER = EMPTY_CHARACTER_FALLBACK;

export function usePlayerCharacter(overrideCampaignId?: string | null, enableSessionLive = false) {
  const { user, role } = useAuth();
  const { activeCampaignId } = useCampaign();

  const campaignId = overrideCampaignId !== undefined ? overrideCampaignId : activeCampaignId;

  const scope = `${campaignId ?? ''}:${user?.id ?? ''}:${role ?? ''}`;
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const fetchRevision = useRef(0);
  const [loaded, setLoaded] = useState<{ scope: string; characters: PlayerCharacter[] }>();
  const loadedScopeRef = useRef(loaded?.scope);
  loadedScopeRef.current = loaded?.scope;
  const characters = useMemo(() => loaded?.scope === scope ? loaded.characters : [], [loaded, scope]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pendingSaves, setPendingSaves] = useState(0);
  const charactersRef = useRef(characters);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => { charactersRef.current = characters; }, [characters]);

  // Fetch characters for the current user in this specific campaign
  const fetchCharacters = useCallback(async (quiet = false) => {
    const revision = ++fetchRevision.current;
    const current = () => scopeRef.current === scope && fetchRevision.current === revision;
    if (!campaignId || !user?.id) {
      setLoaded({ scope, characters: [] });
      setSelectedCharacterId(null);
      setLoading(false);
      return;
    }

    try {
      if (!quiet) {
        setLoading(true);
        setError(null);
        setSaveError(null);
      }

      let charRows: any[] = [];

      // 1. Try to find characters assigned to user if authenticated
      if (user?.id) {
        const { data: userChars, error: userErr } = await supabase
          .from('campaign_characters')
          .select('*, campaigns(id, name)')
          .eq('campaign_id', campaignId)
          .eq('assigned_to', user.id)
          .order('created_at', { ascending: false });

        if (userErr) throw userErr;
        if (userChars && userChars.length > 0) {
          charRows = userChars;
        }
      }

      // 2. Solo GM/Admin possono ispezionare tutti i PG della campagna se non ne hanno uno assegnato
      if (charRows.length === 0 && (role === 'gm' || role === 'admin')) {
        const { data: allCampChars, error: campErr } = await supabase
          .from('campaign_characters')
          .select('*, campaigns(id, name)')
          .eq('campaign_id', campaignId)
          .order('name', { ascending: true });

        if (campErr) throw campErr;
        if (allCampChars && allCampChars.length > 0) {
          charRows = allCampChars;
        }
      }

      if (!current()) return;
      if (charRows.length > 0) {
        const normalized: PlayerCharacter[] = charRows.map(projectCharacter);

        setLoaded({ scope, characters: normalized });
        setSelectedCharacterId((prev) => {
          if (prev && normalized.some((c) => c.id === prev)) {
            return prev;
          }
          return normalized[0].id;
        });
      } else {
        // No character assigned yet for this campaign
        setLoaded({ scope, characters: [] });
        setSelectedCharacterId(null);
      }
    } catch (err: any) {
      console.warn('[usePlayerCharacter] Eccezione:', err);
      if (!quiet && current()) {
        setError(err?.message ?? 'Errore nel caricamento del personaggio');
        setLoaded({ scope, characters: [] });
        setSelectedCharacterId(null);
      }
    } finally {
      if (current()) setLoading(false);
    }
  }, [campaignId, user?.id, role, scope]);

  useFocusEffect(useCallback(() => {
    void fetchCharacters(loadedScopeRef.current === scope);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void fetchCharacters(true);
    });
    return () => subscription.remove();
  }, [fetchCharacters, scope]));

  // Active character currently viewed/edited
  const activeCharacter = useMemo<PlayerCharacter | null>(() => {
    if (!characters.length) {
      return null;
    }
    const found = characters.find((c) => c.id === selectedCharacterId);
    return found ?? characters[0] ?? null;
  }, [characters, selectedCharacterId]);

  const refreshAfterLive = useCallback(() => { void fetchCharacters(true); }, [fetchCharacters]);
  const liveState = useSessionLiveCharacter(enableSessionLive ? activeCharacter?.id : undefined, user?.id, refreshAfterLive);
  const liveResources = liveState?.row?.resources;

  // Overlay shared match/session resources for display. Mutations still use the base sheet revision.
  const safeCharacter = useMemo<PlayerCharacter>(() => {
    if (!activeCharacter) return DEFAULT_FALLBACK_CHARACTER;
    if (!liveResources) return activeCharacter;
    return {
      ...activeCharacter,
      hit_points: liveResources.hitPoints,
      rules_snapshot: {
        ...activeCharacter.rules_snapshot,
        temp_hp: liveResources.tempHp,
        death_saves: liveResources.deathSaves,
        usedSpellSlots: liveResources.usedSpellSlots,
      },
    };
  }, [activeCharacter, liveResources]);

  const hasAssignedCharacter = Boolean(activeCharacter);

  const {
    abilityScores,
    proficiencyBonus,
    passivePerception,
    savingThrows,
    skills,
  } = useMemo(() => deriveMobileCharacterStats(safeCharacter), [safeCharacter]);

  const saveOperation = useCallback((operation: MobileCharacterOperation) => {
    if (!activeCharacter) return Promise.resolve(false);
    if (liveResources && operationTouchesSessionLiveResources(activeCharacter, operation)) return Promise.resolve(false);
    const charId = activeCharacter.id;
    setSaveError(null);
    setPendingSaves((count) => count + 1);
    const save = async () => {
      if (scopeRef.current !== scope) return false;
      const current = charactersRef.current.find((character) => character.id === charId);
      if (!current?.updated_at) throw new Error('La scheda non ha una revisione salvabile. Aggiorna la schermata.');
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Sessione scaduta. Accedi di nuovo.');
      let expectedUpdatedAt = current.updated_at;
      if (liveResources) {
        const { data: revision, error: revisionError } = await supabase.from('campaign_characters')
          .select('updated_at').eq('id', charId).maybeSingle();
        if (revisionError || !revision?.updated_at) throw new Error('Impossibile leggere la revisione della scheda.');
        expectedUpdatedAt = revision.updated_at;
      }
      const baseUrl = (process.env.EXPO_PUBLIC_WEB_APP_URL || 'https://barberanddragons.com').replace(/\/$/, '');
      const response = await fetch(`${baseUrl}/api/mobile/characters/${encodeURIComponent(charId)}/state`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ expectedUpdatedAt, operation }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.character) {
        if (response.status === 409) throw new Error('La scheda è cambiata su un altro dispositivo. Aggiorna la scheda per ricaricare i dati aggiornati.');
        if (payload.error === SESSION_LIVE_RESOURCES_LOCKED) throw new Error('Sessione live · Risorse gestite dal GM.');
        if (payload.error === 'max_hp_unavailable') throw new Error('Impossibile salvare i PF: il massimo PF non è presente nella scheda. Chiedi al GM di correggerla.');
        if (payload.error === 'hit_dice_unavailable') throw new Error('Non risultano Dadi Vita disponibili nella scheda.');
        if (payload.error === 'long_campaign_only') throw new Error('Questa modifica è disponibile solo per le campagne Long.');
        throw new Error(payload.error === 'forbidden' ? 'Non hai i permessi per salvare questa scheda.' : 'Salvataggio non riuscito. Riprova.');
      }
      if (scopeRef.current !== scope) return false;
      const saved = projectCharacter(payload.character);
      const next = charactersRef.current.map((character) => character.id === charId ? saved : character);
      charactersRef.current = next;
      setLoaded({ scope, characters: next });
      return true;
    };
    const result = saveQueueRef.current.catch(() => undefined).then(save);
    saveQueueRef.current = result.then(() => undefined, () => undefined);
    return result.catch((error: unknown) => {
      if (scopeRef.current === scope) setSaveError(error instanceof Error ? error.message : 'Salvataggio non riuscito.');
      return false;
    }).finally(() => setPendingSaves((count) => Math.max(0, count - 1)));
  }, [activeCharacter, liveResources, scope]);

  const updateHp = useCallback((hitPoints: number, tempHp?: number) => saveOperation({ type: 'hp', hitPoints: Math.max(0, Math.round(hitPoints)), ...(tempHp === undefined ? {} : { tempHp: Math.max(0, Math.round(tempHp)) }) }), [saveOperation]);
  const toggleInspiration = useCallback(() => saveOperation({ type: 'toggleInspiration' }), [saveOperation]);
  const spendHitDie = useCallback((count = 1) => saveOperation({ type: 'spendHitDie', count }), [saveOperation]);
  const useFeature = useCallback((featureId: string) => saveOperation({ type: 'useFeature', featureId }), [saveOperation]);
  const restoreFeature = useCallback((featureId: string) => saveOperation({ type: 'restoreFeature', featureId }), [saveOperation]);
  const shortRest = useCallback(() => saveOperation({ type: 'shortRest' }), [saveOperation]);
  const shortRestWithHitDie = useCallback((hitPoints: number) => saveOperation({ type: 'shortRestHitDie', hitPoints: Math.max(0, Math.round(hitPoints)) }), [saveOperation]);
  const updateSpellSlot = useCallback((level: number, usedCount: number) => saveOperation({ type: 'spellSlot', level, usedCount }), [saveOperation]);
  const updateCoins = useCallback((gp: number, sp: number, cp: number) => saveOperation({ type: 'coins', gp: Math.max(0, Math.round(gp)), sp: Math.max(0, Math.round(sp)), cp: Math.max(0, Math.round(cp)) }), [saveOperation]);
  const updateDeathSaves = useCallback((successes: number, failures: number) => saveOperation({ type: 'deathSaves', successes: Math.max(0, Math.min(3, successes)), failures: Math.max(0, Math.min(3, failures)) }), [saveOperation]);
  const setExhaustion = useCallback((level: number) => saveOperation({ type: 'exhaustion', level: Math.max(0, Math.min(6, Math.round(level))) }), [saveOperation]);
  const longRest = useCallback(() => saveOperation({ type: 'longRest' }), [saveOperation]);
  const upsertWeapon = useCallback(
    (weapon: CharacterSheetWeapon, index?: number) =>
      saveOperation({ type: 'upsertWeapon', ...(index === undefined ? {} : { index }), weapon }),
    [saveOperation],
  );
  const removeWeapon = useCallback((index: number) => saveOperation({ type: 'removeWeapon', index }), [saveOperation]);
  const upsertSpell = useCallback(
    (spell: CharacterSheetSpell, index?: number) =>
      saveOperation({ type: 'upsertSpell', ...(index === undefined ? {} : { index }), spell }),
    [saveOperation],
  );
  const removeSpell = useCallback((index: number) => saveOperation({ type: 'removeSpell', index }), [saveOperation]);
  const toggleSpellPrepared = useCallback((index: number) => saveOperation({ type: 'toggleSpellPrepared', index }), [saveOperation]);
  const updateInventory = useCallback((items: string[]) => saveOperation({ type: 'updateInventory', items }), [saveOperation]);
  const updateBioNotes = useCallback(
    (personality?: CharacterSheetPersonality, playerNotes?: string | null) =>
      saveOperation({
        type: 'updateBioNotes',
        ...(personality === undefined ? {} : { personality }),
        ...(playerNotes === undefined ? {} : { playerNotes }),
      }),
    [saveOperation],
  );

  const refresh = useCallback(() => fetchCharacters(), [fetchCharacters]);

  return {
    characters,
    activeCharacter,
    safeCharacter,
    liveResources,
    liveStale: Boolean(liveState?.stale),
    hasAssignedCharacter,
    selectedCharacterId,
    selectCharacter: setSelectedCharacterId,
    abilityScores,
    proficiencyBonus,
    passivePerception,
    savingThrows,
    skills,
    loading,
    error,
    saveError,
    isSaving: pendingSaves > 0,
    refresh,
    updateHp,
    toggleInspiration,
    spendHitDie,
    useFeature,
    restoreFeature,
    shortRest,
    shortRestWithHitDie,
    updateSpellSlot,
    updateCoins,
    updateDeathSaves,
    setExhaustion,
    longRest,
    upsertWeapon,
    removeWeapon,
    upsertSpell,
    removeSpell,
    toggleSpellPrepared,
    updateInventory,
    updateBioNotes,
  };
}

export default usePlayerCharacter;
