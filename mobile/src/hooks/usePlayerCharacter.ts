import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../api/supabase';
import { MobileCharacterOperation } from '../lib/character-state';
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
import { CharacterSheetV1, isCharacterSheetV1 } from '../lib/character-sheet';

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
 * The sheet is read from the shared persisted contract. Optional fields stay
 * absent so the UI can identify what the GM still needs to compile.
 */
function parseSnapshot(raw: unknown): Record<string, any> {
  if (typeof raw === 'string') {
    try {
      const parsed: unknown = JSON.parse(raw);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, any> : {};
    } catch {
      return {};
    }
  }
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? { ...(raw as Record<string, any>) } : {};
}

function readSheet(snapshot: Record<string, any>): CharacterSheetV1 | null {
  return isCharacterSheetV1(snapshot.character_sheet) ? snapshot.character_sheet : null;
}

function projectCharacter(item: any): PlayerCharacter {
  const snapshot = parseSnapshot(item.rules_snapshot);
  const sheet = readSheet(snapshot);
  const legacyAbilities = snapshot.abilities && typeof snapshot.abilities === 'object' ? snapshot.abilities : {};
  const abilities = { ...legacyAbilities, ...(sheet?.abilities ?? {}) };
  const maxHp = typeof snapshot.max_hp === 'number' ? snapshot.max_hp : sheet?.hpMax;
  const hitDice = snapshot.hit_dice && typeof snapshot.hit_dice === 'object' ? snapshot.hit_dice : undefined;
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
    description: spell.fullTextMd ?? undefined,
    components: spell.verbal !== undefined && spell.somatic !== undefined && spell.material !== undefined
      ? [spell.verbal && 'V', spell.somatic && 'S', spell.material && 'M'].filter(Boolean).join(', ')
      : undefined,
    castingTime: '', range: '', duration: '',
    ritual: spell.ritual, concentration: spell.concentration,
  }));
  const sheetFeatures = sheet ? [
    ['raceTraitsMd', 'race'], ['subraceTraitsMd', 'race'], ['classFeaturesMd', 'class'],
    ['subclassFeaturesMd', 'subclass'], ['backgroundMd', 'background'],
  ].flatMap(([field, source]) => {
    const markdown = sheet[field as keyof CharacterSheetV1];
    if (typeof markdown !== 'string' || !markdown.trim()) return [];
    const blocks = markdown.split(/(?=^#{1,4}\s)/m).map((block) => block.trim()).filter(Boolean);
    return blocks.map((block, index) => {
      const [firstLine, ...rest] = block.split('\n');
      return {
        id: `sheet-${source}-${index}`,
      name: firstLine.match(/^#{1,4}\s+(.+)$/)?.[1]?.trim() || ({
        race: 'Tratti razziali', class: 'Privilegi di classe', subclass: 'Privilegi di sottoclasse', background: 'Background',
      } as Record<string, string>)[String(source)],
        source,
        description: rest.join('\n').trim() || block,
      };
    });
  }) : [];

  const projectedSnapshot = {
    ...snapshot,
    ...(sheet ? {
      abilities,
      proficiency_bonus: sheet.proficiencyBonus ?? snapshot.proficiency_bonus,
      passive_perception: sheet.passivePerception ?? snapshot.passive_perception,
      speed: sheet.speed ?? snapshot.speed,
      initiative: sheet.initiative ?? snapshot.initiative,
      ...(maxHp !== undefined ? { max_hp: maxHp } : {}),
      ...(hitDice ? { hit_dice: hitDice } : {}),
      spellcasting: {
        ...(snapshot.spellcasting && typeof snapshot.spellcasting === 'object' ? snapshot.spellcasting : {}),
        ...(sheet.spellcastingAbility ? { ability: sheet.spellcastingAbility } : {}),
        ...(sheet.spellSaveDc !== undefined && sheet.spellSaveDc !== null ? { saveDc: sheet.spellSaveDc } : {}),
        ...(sheet.spellAttackBonus !== undefined && sheet.spellAttackBonus !== null ? { attackBonus: sheet.spellAttackBonus } : {}),
      },
      ...(sheet.spellSlots ? { spellSlots: Object.entries(sheet.spellSlots).flatMap(([level, count]) => typeof count === 'number'
        ? [{ level: Number(level), count }]
        : []) } : {}),
      ...(mappedWeapons ? { weapons: mappedWeapons } : {}),
      ...(sheet.inventory ? { inventory: sheet.inventory.map((name, index) => ({ id: `sheet-item-${index}`, name })) } : {}),
      ...(mappedSpells ? { spells: mappedSpells } : {}),
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
    ...(maxHp !== undefined ? { max_hp: maxHp } : {}),
    ...(hitDice ? { hit_dice: hitDice } : {}),
  };

  return {
    ...item,
    character_class: sheet?.classLabel ?? item.character_class ?? null,
    class_subclass: sheet?.classSubclass ?? item.class_subclass ?? null,
    level: item.level ?? null,
    armor_class: sheet?.armorClass ?? item.armor_class ?? null,
    background: item.background ?? null,
    rules_snapshot: projectedSnapshot,
    coins_gp: item.coins_gp ?? 0,
    coins_sp: item.coins_sp ?? 0,
    coins_cp: item.coins_cp ?? 0,
  } as PlayerCharacter;
}

export const EMPTY_CHARACTER_FALLBACK: PlayerCharacter = {
  id: '', campaign_id: '', name: 'Nessun Personaggio Assegnato', image_url: null,
  sheet_file_path: null, current_xp: 0, level: 0, character_class: null,
  class_subclass: null, armor_class: null, hit_points: null, background: null,
  race_slug: null, subclass_slug: null, background_slug: null, assigned_to: null,
  coins_gp: 0, coins_sp: 0, coins_cp: 0, created_at: '', updated_at: '', rules_snapshot: {},
};
export const DEFAULT_FALLBACK_CHARACTER = EMPTY_CHARACTER_FALLBACK;

export function usePlayerCharacter(overrideCampaignId?: string | null) {
  const { user } = useAuth();
  const { activeCampaignId } = useCampaign();

  const campaignId = overrideCampaignId !== undefined ? overrideCampaignId : activeCampaignId;

  const [characters, setCharacters] = useState<PlayerCharacter[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pendingSaves, setPendingSaves] = useState(0);
  const charactersRef = useRef(characters);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => { charactersRef.current = characters; }, [characters]);

  // Fetch characters for the current user in this specific campaign
  const fetchCharacters = useCallback(async () => {
    if (!campaignId) {
      setCharacters([]);
      setSelectedCharacterId(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSaveError(null);

      let charRows: any[] = [];

      // 1. Try to find characters assigned to user if authenticated
      if (user?.id) {
        const { data: userChars, error: userErr } = await supabase
          .from('campaign_characters')
          .select('*, campaigns(id, name)')
          .eq('campaign_id', campaignId)
          .eq('assigned_to', user.id)
          .order('created_at', { ascending: false });

        if (!userErr && userChars && userChars.length > 0) {
          charRows = userChars;
        }
      }

      // 2. If no assigned character found for this user in this campaign,
      // load all campaign characters so GM, Admin, or player can inspect and select real heroes
      if (charRows.length === 0) {
        const { data: allCampChars, error: campErr } = await supabase
          .from('campaign_characters')
          .select('*, campaigns(id, name)')
          .eq('campaign_id', campaignId)
          .order('name', { ascending: true });

        if (!campErr && allCampChars && allCampChars.length > 0) {
          charRows = allCampChars;
        }
      }

      if (charRows.length > 0) {
      const normalized: PlayerCharacter[] = charRows.map(projectCharacter);

        setCharacters(normalized);
        setSelectedCharacterId((prev) => {
          if (prev && normalized.some((c) => c.id === prev)) {
            return prev;
          }
          return normalized[0].id;
        });
      } else {
        // No character assigned yet for this campaign
        setCharacters([]);
        setSelectedCharacterId(null);
      }
    } catch (err: any) {
      console.warn('[usePlayerCharacter] Eccezione:', err);
      setError(err?.message ?? 'Errore nel caricamento del personaggio');
      setCharacters([]);
      setSelectedCharacterId(null);
    } finally {
      setLoading(false);
    }
  }, [campaignId, user?.id]);

  useFocusEffect(useCallback(() => {
    void fetchCharacters();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void fetchCharacters();
    });
    return () => subscription.remove();
  }, [fetchCharacters]));

  // Active character currently viewed/edited
  const activeCharacter = useMemo<PlayerCharacter | null>(() => {
    if (!characters.length) {
      return null;
    }
    const found = characters.find((c) => c.id === selectedCharacterId);
    return found ?? characters[0] ?? null;
  }, [characters, selectedCharacterId]);

  // Fallback safe character to prevent crashes when accessing properties
  const safeCharacter = useMemo<PlayerCharacter>(() => {
    return activeCharacter || DEFAULT_FALLBACK_CHARACTER;
  }, [activeCharacter]);

  const hasAssignedCharacter = Boolean(activeCharacter);

  // Derived ability score entries (FOR, DES, COS, INT, SAG, CAR)
  const abilityScores = useMemo<AbilityScoreEntry[]>(() => {
    const snapAbilities = safeCharacter.rules_snapshot?.abilities ?? {};
    const sheet = readSheet(safeCharacter.rules_snapshot ?? {});
    const keys: Array<{ key: AbilityKey; label: string; name: string }> = [
      { key: 'str', label: 'FOR', name: 'Forza' },
      { key: 'dex', label: 'DES', name: 'Destrezza' },
      { key: 'con', label: 'COS', name: 'Costituzione' },
      { key: 'int', label: 'INT', name: 'Intelligenza' },
      { key: 'wis', label: 'SAG', name: 'Saggezza' },
      { key: 'cha', label: 'CAR', name: 'Carisma' },
    ];

    return keys.map(({ key, label, name }) => {
      const score = sheet?.abilities?.[key] ?? (snapAbilities as any)[key];
      const modifier = sheet?.abilityMods?.[key] ?? (typeof score === 'number' ? Math.floor((score - 10) / 2) : undefined);
      return {
        key,
        label,
        name,
        score,
        modifier,
      };
    });
  }, [safeCharacter]);

  // Derived proficiency bonus
  const proficiencyBonus = useMemo(() => {
    const sheet = readSheet(safeCharacter.rules_snapshot ?? {});
    const value = sheet?.proficiencyBonus ?? safeCharacter.rules_snapshot?.proficiency_bonus;
    return typeof value === 'number' ? value : undefined;
  }, [safeCharacter]);

  // Ability modifier lookup helper
  const abilityModMap = useMemo(() => {
  const map: Partial<Record<AbilityKey, number>> = {};
  for (const ab of abilityScores) {
      if (ab.modifier !== undefined) map[ab.key] = ab.modifier;
    }
    return map;
  }, [abilityScores]);

  // Derived Saving Throws with Proficiency
  const savingThrows = useMemo<SavingThrowEntry[]>(() => {
    const sheet = readSheet(safeCharacter.rules_snapshot ?? {});
    const proficienciesCompiled = Array.isArray(safeCharacter.rules_snapshot?.saving_throw_proficiencies);
    const proficientKeys = new Set(safeCharacter.rules_snapshot?.saving_throw_proficiencies ?? []);

    return abilityScores.map((ab) => {
      const check = sheet?.savingThrows?.[ab.key];
      const isProf = check ? check.proficient : proficienciesCompiled ? proficientKeys.has(ab.key) : undefined;
      const bonus = check?.value ?? (ab.modifier !== undefined && proficienciesCompiled
        ? ab.modifier + (isProf ? (proficiencyBonus ?? 0) : 0)
        : undefined);
      return {
        key: ab.key,
        label: ab.label,
        name: ab.name,
        bonus,
        proficient: isProf,
      };
    });
  }, [abilityScores, safeCharacter.rules_snapshot, proficiencyBonus]);

  // Derived 18 D&D 5e Skills with full bonuses and expertises
  const skills = useMemo<SkillEntry[]>(() => {
    const sheet = readSheet(safeCharacter.rules_snapshot ?? {});
    const proficienciesCompiled = Array.isArray(safeCharacter.rules_snapshot?.skill_proficiencies);
    const expertiseCompiled = Array.isArray(safeCharacter.rules_snapshot?.skill_expertises);
    const profSet = new Set(safeCharacter.rules_snapshot?.skill_proficiencies ?? []);
    const expSet = new Set(safeCharacter.rules_snapshot?.skill_expertises ?? []);

    return (Object.keys(SKILL_METADATA) as SkillKey[]).map((k) => {
      const meta = SKILL_METADATA[k];
      const check = sheet?.skills?.[k];
      const baseMod = abilityModMap[meta.ability];
      const isProf = check ? check.proficient : proficienciesCompiled ? profSet.has(k) : undefined;
      const isExp = check ? check.expertise : expertiseCompiled ? expSet.has(k) : undefined;
      const bonus = check?.value ?? (proficienciesCompiled && expertiseCompiled && baseMod !== undefined
        ? baseMod + (isProf ? (proficiencyBonus ?? 0) : 0) + (isExp ? (proficiencyBonus ?? 0) : 0)
        : undefined);

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
  }, [abilityModMap, safeCharacter.rules_snapshot, proficiencyBonus]);

  // Passive Perception (10 + bonus)
  const passivePerception = useMemo(() => {
    const percSkill = skills.find((s) => s.key === 'perception');
    const sheet = readSheet(safeCharacter.rules_snapshot ?? {});
    return sheet?.passivePerception ?? safeCharacter.rules_snapshot?.passive_perception ??
      (percSkill?.bonus !== undefined ? 10 + percSkill.bonus : undefined);
  }, [skills, safeCharacter.rules_snapshot]);

  const saveOperation = useCallback((operation: MobileCharacterOperation) => {
    if (!activeCharacter) return Promise.resolve(false);
    const charId = activeCharacter.id;
    setSaveError(null);
    setPendingSaves((count) => count + 1);
    const save = async () => {
      const current = charactersRef.current.find((character) => character.id === charId);
      if (!current?.updated_at) throw new Error('La scheda non ha una revisione salvabile. Aggiorna la schermata.');
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Sessione scaduta. Accedi di nuovo.');
      const baseUrl = (process.env.EXPO_PUBLIC_WEB_APP_URL || 'https://barberanddragons.com').replace(/\/$/, '');
      const response = await fetch(`${baseUrl}/api/mobile/characters/${encodeURIComponent(charId)}/state`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ expectedUpdatedAt: current.updated_at, operation }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.character) {
        if (response.status === 409) throw new Error('La scheda è cambiata su un altro dispositivo. Aggiorna la scheda per ricaricare i dati aggiornati.');
        if (payload.error === 'max_hp_unavailable') throw new Error('Impossibile salvare i PF: il massimo PF non è presente nella scheda. Chiedi al GM di correggerla.');
        if (payload.error === 'hit_dice_unavailable') throw new Error('Non risultano Dadi Vita disponibili nella scheda.');
        throw new Error(payload.error === 'forbidden' ? 'Non hai i permessi per salvare questa scheda.' : 'Salvataggio non riuscito. Riprova.');
      }
      const saved = projectCharacter(payload.character);
      const next = charactersRef.current.map((character) => character.id === charId ? saved : character);
      charactersRef.current = next;
      setCharacters(next);
      return true;
    };
    const result = saveQueueRef.current.catch(() => undefined).then(save);
    saveQueueRef.current = result.then(() => undefined, () => undefined);
    return result.catch((error: unknown) => {
      setSaveError(error instanceof Error ? error.message : 'Salvataggio non riuscito.');
      return false;
    }).finally(() => setPendingSaves((count) => Math.max(0, count - 1)));
  }, [activeCharacter]);

  const updateHp = useCallback((hitPoints: number, tempHp?: number) => saveOperation({ type: 'hp', hitPoints: Math.max(0, Math.round(hitPoints)), ...(tempHp === undefined ? {} : { tempHp: Math.max(0, Math.round(tempHp)) }) }), [saveOperation]);
  const spendHitDie = useCallback((count = 1) => saveOperation({ type: 'spendHitDie', count }), [saveOperation]);
  const useFeature = useCallback((featureId: string) => saveOperation({ type: 'useFeature', featureId }), [saveOperation]);
  const shortRest = useCallback(() => saveOperation({ type: 'shortRest' }), [saveOperation]);
  const shortRestWithHitDie = useCallback((hitPoints: number) => saveOperation({ type: 'shortRestHitDie', hitPoints: Math.max(0, Math.round(hitPoints)) }), [saveOperation]);
  const updateSpellSlot = useCallback((level: number, usedCount: number) => saveOperation({ type: 'spellSlot', level, usedCount }), [saveOperation]);
  const updateCoins = useCallback((gp: number, sp: number, cp: number) => saveOperation({ type: 'coins', gp: Math.max(0, Math.round(gp)), sp: Math.max(0, Math.round(sp)), cp: Math.max(0, Math.round(cp)) }), [saveOperation]);
  const updateDeathSaves = useCallback((successes: number, failures: number) => saveOperation({ type: 'deathSaves', successes: Math.max(0, Math.min(3, successes)), failures: Math.max(0, Math.min(3, failures)) }), [saveOperation]);
  const longRest = useCallback(() => saveOperation({ type: 'longRest' }), [saveOperation]);

  return {
    characters,
    activeCharacter,
    safeCharacter,
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
    refresh: fetchCharacters,
    updateHp,
    spendHitDie,
    useFeature,
    shortRest,
    shortRestWithHitDie,
    updateSpellSlot,
    updateCoins,
    updateDeathSaves,
    longRest,
  };
}

export default usePlayerCharacter;
