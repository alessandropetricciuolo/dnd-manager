import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../api/supabase';
import { applyMobileCharacterOperation, MobileCharacterOperation } from '../lib/character-state';
import { useAuth } from '../contexts/AuthContext';
import { useCampaign } from '../contexts/CampaignContext';
import {
  PlayerCharacter,
  CharacterRulesSnapshot,
  AbilityKey,
  AbilityScoreEntry,
  SkillKey,
  SkillEntry,
  SavingThrowEntry,
  WeaponAttackEntry,
  ClassFeatureEntry,
  SpellEntry,
  InventoryItemEntry,
} from '../types';

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
 * 100% Complete authentic D&D 5e Fallback Character
 * Gorath Spaccagelo - Nano delle Colline, Guerriero (Campione) Lv. 4
 */
export const DEMO_CHAR_QUEST: PlayerCharacter = {
  id: 'char-gorath',
  campaign_id: 'demo-campaign-quest',
  name: 'Gorath Spaccagelo',
  image_url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80',
  sheet_file_path: null,
  current_xp: 3850,
  level: 4,
  character_class: 'Guerriero',
  class_subclass: 'Campione',
  armor_class: 18,
  hit_points: 42,
  background: 'Nano delle Colline • Soldato',
  race_slug: 'dwarf-hill',
  subclass_slug: 'champion',
  background_slug: 'soldier',
  assigned_to: 'player-alessandro',
  coins_gp: 145,
  coins_sp: 32,
  coins_cp: 18,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  campaigns: {
    id: 'demo-campaign-quest',
    name: 'I Segreti del Pozzo Nero',
  },
  rules_snapshot: {
    version: 1,
    max_hp: 42,
    temp_hp: 0,
    death_saves: { successes: 0, failures: 0 },
    hit_dice: { total: 4, current: 4, die: '1d10' },
    inspiration: false,
    speed: '7.5 m (25 ft)',
    initiative: 2,
    proficiency_bonus: 2,
    passive_perception: 13,
    abilities: {
      str: 17,
      dex: 14,
      con: 16,
      int: 10,
      wis: 12,
      cha: 8,
    },
    saving_throw_proficiencies: ['str', 'con'],
    skill_proficiencies: ['athletics', 'intimidation', 'perception', 'survival'],
    skill_expertises: [],
    weapons: [
      {
        id: 'w1',
        name: 'Ascia da Battaglia a Una Mano',
        attackBonus: 5,
        damage: '1d8 + 3',
        damageType: 'Tagliente',
        properties: 'Versatile (1d10)',
        notes: 'Forgiata nella roccia vulcanica.',
      },
      {
        id: 'w2',
        name: 'Balestra Pesante',
        attackBonus: 4,
        damage: '1d10 + 2',
        damageType: 'Perforante',
        range: '30/120 m',
        properties: 'Munizioni, Pesante, Ricarica',
      },
    ],
    features: [
      {
        id: 'f1',
        name: 'Scurovisione Nanica',
        source: 'race',
        description: 'Vedi nell’oscurità fino a 18 metri (60 ft).',
      },
      {
        id: 'f2',
        name: 'Resilienza Nanica',
        source: 'race',
        description: 'Vantaggio ai TS contro veleno e resistenza ai danni da veleno.',
      },
      {
        id: 'f6',
        name: 'Secondo Fiato',
        source: 'class',
        description: 'Azione bonus per recuperare 1d10 + 4 PF una volta per riposo breve.',
        usesCurrent: 1,
        usesMax: 1,
        resetOn: 'shortRest',
      },
      {
        id: 'f7',
        name: 'Azione Impetuosa',
        source: 'class',
        description: 'Compi un’azione addizionale una volta per riposo breve.',
        usesCurrent: 1,
        usesMax: 1,
        resetOn: 'shortRest',
      },
      {
        id: 'f8',
        name: 'Critico Migliorato',
        source: 'subclass',
        description: 'I tuoi attacchi ottengono un critico con 19 o 20 sul d20.',
      },
    ],
    spellSlots: [],
    usedSpellSlots: {},
    spells: [],
    proficiencies: {
      armor: ['Tutte le armature', 'Scudi'],
      weapons: ['Armi semplici', 'Armi da guerra'],
      tools: ['Strumenti da Fabbro'],
      languages: ['Comune', 'Nanico'],
    },
    inventory: [
      { id: 'i1', name: 'Corazza a Strisce', quantity: 1, weight: '20 kg', equipped: true, category: 'Armatura' },
      { id: 'i2', name: 'Scudo Pesante di Ferro', quantity: 1, weight: '3 kg', equipped: true, category: 'Scudo' },
      { id: 'i3', name: 'Ascia da Battaglia', quantity: 1, weight: '2 kg', equipped: true, category: 'Arma' },
      { id: 'i7', name: 'Pozione di Guarigione', quantity: 2, weight: '0.5 kg', equipped: false, category: 'Pozione' },
    ],
    personality: {
      traits: 'Non indietreggio mai davanti a una minaccia. Più il nemico è grosso, più fa rumore quando crolla.',
      ideals: 'Onore della Gilda: La lealtà ai compagni vale più di un forziere colmo di gemme.',
      bonds: 'Difenderò i membri del mio party a costo del mio ultimo respiro.',
      flaws: 'La mia cocciutaggine mi impedisce di ritirarmi.',
    },
  },
};

export const DEMO_CHAR_LONG: PlayerCharacter = {
  id: 'char-thorne',
  campaign_id: 'demo-campaign-long',
  name: 'Thorne Barbaforgiata',
  image_url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
  sheet_file_path: null,
  current_xp: 2100,
  level: 3,
  character_class: 'Chierico',
  class_subclass: 'Dominio della Forgia',
  armor_class: 18,
  hit_points: 27,
  background: 'Nano delle Montagne • Artigiano',
  race_slug: 'dwarf-mountain',
  subclass_slug: 'forge',
  background_slug: 'guild-artisan',
  assigned_to: 'player-alessandro',
  coins_gp: 85,
  coins_sp: 40,
  coins_cp: 25,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  campaigns: {
    id: 'demo-campaign-long',
    name: 'I Figli della Forgia Ancestrale',
  },
  rules_snapshot: {
    version: 1,
    max_hp: 27,
    temp_hp: 0,
    death_saves: { successes: 0, failures: 0 },
    hit_dice: { total: 3, current: 3, die: '1d8' },
    inspiration: true,
    speed: '7.5 m (25 ft)',
    initiative: 0,
    proficiency_bonus: 2,
    passive_perception: 15,
    abilities: {
      str: 16,
      dex: 10,
      con: 15,
      int: 12,
      wis: 16,
      cha: 8,
    },
    saving_throw_proficiencies: ['wis', 'cha'],
    skill_proficiencies: ['history', 'insight', 'medicine', 'religion'],
    skill_expertises: [],
    weapons: [
      {
        id: 'w-t1',
        name: 'Martello da Guerra Runico',
        attackBonus: 5,
        damage: '1d8 + 3',
        damageType: 'Contundente',
        properties: 'Versatile (1d10)',
        notes: 'Inciso con le rune della forgia.',
      },
    ],
    features: [
      {
        id: 'f-t1',
        name: 'Benedizione della Forgia',
        source: 'subclass',
        description: 'All’alba infondi un’arma o armatura con un bonus di +1 alla CA o a tiri per colpire e danni.',
      },
      {
        id: 'f-t2',
        name: 'Incanalare Divinità: Benedizione dell’Artigiano',
        source: 'subclass',
        description: 'Rituale di 1 ora per creare un oggetto metallico del valore massimo di 100 mo.',
        usesCurrent: 1,
        usesMax: 1,
        resetOn: 'shortRest',
      },
    ],
    spellcasting: {
      ability: 'wis',
      saveDc: 13,
      attackBonus: 5,
    },
    spellSlots: [
      { level: 1, count: 4 },
      { level: 2, count: 2 },
    ],
    usedSpellSlots: { 1: 1, 2: 0 },
    spells: [
      {
        id: 'sp-1',
        level: 0,
        name: 'Fiamma Sacra',
        summary: '1d8 danni radiosi (TS Des CD 13)',
        castingTime: '1 Azione',
        range: '18 m',
        duration: 'Istantanea',
      },
      {
        id: 'sp-2',
        level: 1,
        name: 'Curare Ferite',
        summary: 'Ripristina 1d8 + 3 PF al tocco',
        castingTime: '1 Azione',
        range: 'Contatto',
        duration: 'Istantanea',
      },
      {
        id: 'sp-3',
        level: 1,
        name: 'Parola Guaritrice',
        summary: 'Ripristina 1d4 + 3 PF con azione bonus',
        castingTime: '1 Azione Bonus',
        range: '18 m',
        duration: 'Istantanea',
      },
      {
        id: 'sp-4',
        level: 2,
        name: 'Arma Spirituale',
        summary: 'Crea martello spettrale che infligge 1d8 + 3 danni da forza',
        castingTime: '1 Azione Bonus',
        range: '18 m',
        duration: '1 Minuto',
      },
    ],
    proficiencies: {
      armor: ['Tutte le armature', 'Scudi'],
      weapons: ['Armi semplici', 'Armi da guerra'],
      tools: ['Strumenti da Fabbro', 'Strumenti da Muratore'],
      languages: ['Comune', 'Nanico', 'Ignan'],
    },
    inventory: [
      { id: 'it-1', name: 'Corazza di Piastre Forgiata', quantity: 1, weight: '22 kg', equipped: true, category: 'Armatura' },
      { id: 'it-2', name: 'Scudo con Simbolo Sacro', quantity: 1, weight: '3 kg', equipped: true, category: 'Scudo' },
      { id: 'it-3', name: 'Martello da Guerra', quantity: 1, weight: '2 kg', equipped: true, category: 'Arma' },
    ],
    personality: {
      traits: 'Vedo la vita come un blocco di metallo da temprare col fuoco e il martello.',
      ideals: 'Creazione: Creare cose durevoli è il servizio più alto agli dei.',
      bonds: 'La mia forgia e il santuario del clan sono la mia casa.',
      flaws: 'Disprezzo chiunque realizzi manufatti scadenti o difettosi.',
    },
  },
};

export const DEMO_CHAR_ONESHOT: PlayerCharacter = {
  id: 'char-lyra',
  campaign_id: 'demo-campaign-oneshot',
  name: 'Lyra Danzaombre',
  image_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&auto=format&fit=crop&q=80',
  sheet_file_path: null,
  current_xp: 950,
  level: 2,
  character_class: 'Ladro',
  class_subclass: 'Assassino',
  armor_class: 15,
  hit_points: 17,
  background: 'Elfa dei Boschi • Monella di Strada',
  race_slug: 'elf-wood',
  subclass_slug: 'assassin',
  background_slug: 'urchin',
  assigned_to: 'player-alessandro',
  coins_gp: 45,
  coins_sp: 12,
  coins_cp: 5,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  campaigns: {
    id: 'demo-campaign-oneshot',
    name: 'Il Colpo alla Taverna del Cinghiale',
  },
  rules_snapshot: {
    version: 1,
    max_hp: 17,
    temp_hp: 0,
    death_saves: { successes: 0, failures: 0 },
    hit_dice: { total: 2, current: 2, die: '1d8' },
    inspiration: false,
    speed: '10.5 m (35 ft)',
    initiative: 4,
    proficiency_bonus: 2,
    passive_perception: 16,
    abilities: {
      str: 10,
      dex: 18,
      con: 14,
      int: 12,
      wis: 14,
      cha: 10,
    },
    saving_throw_proficiencies: ['dex', 'int'],
    skill_proficiencies: ['acrobatics', 'deception', 'investigation', 'perception', 'sleight_of_hand', 'stealth'],
    skill_expertises: ['stealth', 'sleight_of_hand'],
    weapons: [
      {
        id: 'w-l1',
        name: 'Stocco d’Argento',
        attackBonus: 6,
        damage: '1d8 + 4',
        damageType: 'Perforante',
        properties: 'Accuratezza',
      },
      {
        id: 'w-l2',
        name: 'Pugnale di Ferro Nero',
        attackBonus: 6,
        damage: '1d4 + 4',
        damageType: 'Perforante',
        range: '6/18 m',
        properties: 'Accuratezza, Leggera, Lancio',
      },
    ],
    features: [
      {
        id: 'f-l1',
        name: 'Attacco Furtivo (Sneak Attack)',
        source: 'class',
        description: 'Infliggi +1d6 danni extra a una creatura colpita se hai vantaggio o un alleato vicino.',
      },
      {
        id: 'f-l2',
        name: 'Azione Scaltra (Cunning Action)',
        source: 'class',
        description: 'Puoi usare un’azione bonus per Scattare, Disimpegnarti o Nasconderti.',
      },
    ],
    spellSlots: [],
    usedSpellSlots: {},
    spells: [],
    proficiencies: {
      armor: ['Armature leggere'],
      weapons: ['Armi semplici', 'Balestre a mano', 'Spade corte', 'Stocchi'],
      tools: ['Strumenti da Scasso', 'Kit per Camuffamento'],
      languages: ['Comune', 'Elfico', 'Gergo Ladresco'],
    },
    inventory: [
      { id: 'il-1', name: 'Armatura di Cuoio Borchiato', quantity: 1, weight: '6 kg', equipped: true, category: 'Armatura' },
      { id: 'il-2', name: 'Stocco Elegante', quantity: 1, weight: '1 kg', equipped: true, category: 'Arma' },
      { id: 'il-3', name: 'Pugnali da Lancio', quantity: 3, weight: '1.5 kg', equipped: true, category: 'Arma' },
      { id: 'il-4', name: 'Strumenti da Scasso di Precisione', quantity: 1, weight: '0.5 kg', equipped: true, category: 'Attrezzi' },
    ],
    personality: {
      traits: 'Nascondo sempre un asso nella manica e un pugnale nello stivale.',
      ideals: 'Libertà: Nessun tiranno o legge ingiusta deve ostacolare la mia strada.',
      bonds: 'Proteggo i reietti e i monelli di strada dei bassifondi.',
      flaws: 'Non so resistere all’impulso di intascare un gioiello non custodito.',
    },
  },
};

export const EMPTY_CHARACTER_FALLBACK: PlayerCharacter = {
  id: '',
  campaign_id: '',
  name: 'Nessun Personaggio Assegnato',
  character_class: 'Avventuriero',
  class_subclass: null,
  level: 1,
  armor_class: 10,
  hit_points: 10,
  background: null,
  race_slug: null,
  subclass_slug: null,
  background_slug: null,
  assigned_to: null,
  current_xp: 0,
  sheet_file_path: null,
  image_url: null,
  created_at: '',
  updated_at: '',
  rules_snapshot: {
    max_hp: 10,
    current_hp: 10,
    temp_hp: 0,
    death_saves: { successes: 0, failures: 0 },
    hit_dice: { total: 1, current: 1, die: 'd8' },
    speed: '9m',
    proficiency_bonus: 2,
    passive_perception: 10,
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    saving_throws: {},
    skills: {},
    weapons: [],
    spells: [],
    spellSlots: [],
    features: [],
    inventory: [],
  },
};

export const DEFAULT_FALLBACK_CHARACTER: PlayerCharacter = EMPTY_CHARACTER_FALLBACK;
export const DEMO_CHARACTERS_LOOKUP: Record<string, PlayerCharacter> = {};

/**
 * Normalizes rules snapshot object ensuring all runtime and 5e fields are present.
 */
function normalizeRulesSnapshot(
  raw: unknown,
  baseHp: number | null,
  level = 1,
  characterClass = 'Guerriero'
): CharacterRulesSnapshot {
  let snap: Record<string, any> = {};

  if (typeof raw === 'string') {
    try {
      snap = JSON.parse(raw);
    } catch {
      snap = {};
    }
  } else if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    snap = { ...(raw as Record<string, any>) };
  }

  const defaultAbilities = {
    str: 15,
    dex: 13,
    con: 14,
    int: 10,
    wis: 12,
    cha: 8,
  };

  const currentAbilities =
    snap.abilities && typeof snap.abilities === 'object'
      ? { ...defaultAbilities, ...snap.abilities }
      : defaultAbilities;

  const maxHp =
    typeof snap.max_hp === 'number' && snap.max_hp > 0
      ? snap.max_hp
      : typeof snap.hpMax === 'number' && snap.hpMax > 0
      ? snap.hpMax
      : (baseHp ?? 24);

  const profBonus = Math.floor((Math.max(1, level) - 1) / 4) + 2;

  // Derive Hit Die based on class name
  let hitDieStr = '1d8';
  const cNorm = (characterClass || '').toLowerCase();
  if (cNorm.includes('barbaro')) hitDieStr = '1d12';
  else if (cNorm.includes('guerriero') || cNorm.includes('paladino') || cNorm.includes('ranger')) hitDieStr = '1d10';
  else if (cNorm.includes('mago') || cNorm.includes('stregone')) hitDieStr = '1d6';

  return {
    version: 1,
    ...snap,
    max_hp: maxHp,
    temp_hp: typeof snap.temp_hp === 'number' ? snap.temp_hp : 0,
    death_saves: {
      successes: Math.min(3, Math.max(0, snap.death_saves?.successes ?? 0)),
      failures: Math.min(3, Math.max(0, snap.death_saves?.failures ?? 0)),
    },
    hit_dice: snap.hit_dice ?? {
      total: level,
      current: level,
      die: hitDieStr,
    },
    inspiration: Boolean(snap.inspiration),
    proficiency_bonus: profBonus,
    speed: snap.speed ?? '9 m (30 ft)',
    initiative: snap.initiative ?? Math.floor((currentAbilities.dex - 10) / 2),
    abilities: currentAbilities,
    saving_throw_proficiencies: Array.isArray(snap.saving_throw_proficiencies)
      ? snap.saving_throw_proficiencies
      : ['str', 'con'],
    skill_proficiencies: Array.isArray(snap.skill_proficiencies)
      ? snap.skill_proficiencies
      : ['athletics', 'perception'],
    skill_expertises: Array.isArray(snap.skill_expertises) ? snap.skill_expertises : [],
    weapons: Array.isArray(snap.weapons) ? snap.weapons : [
      {
        id: 'w-default',
        name: characterClass.toLowerCase().includes('mago') ? 'Bastone Ferrato' : 'Spada Lunga / Attacco Base',
        attackBonus: profBonus + Math.floor((currentAbilities.str - 10) / 2),
        damage: '1d8 + ' + Math.max(0, Math.floor((currentAbilities.str - 10) / 2)),
        damageType: 'Tagliente',
        properties: 'Versatile (1d10)',
      },
    ],
    features: (() => {
      if (Array.isArray(snap.features) && snap.features.length > 0) return snap.features;
      const extracted: ClassFeatureEntry[] = [];
      const parseMd = (md: string | null | undefined, src: 'class' | 'race' | 'background') => {
        if (!md || typeof md !== 'string') return;
        const lines = md.split('\n');
        let currentTitle = '';
        let currentDesc: string[] = [];
        for (const line of lines) {
          const match = line.match(/^#{2,4}\s+(.+)$/);
          if (match) {
            if (currentTitle) {
              extracted.push({
                id: `feat-${src}-${extracted.length}`,
                name: currentTitle,
                source: src,
                description: currentDesc.join('\n').trim(),
              });
            }
            currentTitle = match[1].trim();
            currentDesc = [];
          } else {
            currentDesc.push(line);
          }
        }
        if (currentTitle) {
          extracted.push({
            id: `feat-${src}-${extracted.length}`,
            name: currentTitle,
            source: src,
            description: currentDesc.join('\n').trim(),
          });
        }
      };
      parseMd(snap.classPrivilegesMd, 'class');
      parseMd(snap.classSubclassMd, 'class');
      parseMd(snap.raceTraitsMd, 'race');
      parseMd(snap.subraceTraitsMd, 'race');
      parseMd(snap.backgroundRulesMd, 'background');
      return extracted.length > 0 ? extracted : [];
    })(),
    spellSlots: (() => {
      if (Array.isArray(snap.spellSlots)) {
        return snap.spellSlots.map((item: any, idx: number) => {
          if (typeof item === 'object' && item !== null && 'level' in item && 'count' in item) {
            return {
              level: item.level,
              count: item.count,
              total: item.count,
              current: item.count,
            };
          }
          if (typeof item === 'number') {
            return {
              level: idx + 1,
              count: item,
              total: item,
              current: item,
            };
          }
          return { level: idx + 1, count: 2, total: 2, current: 2 };
        });
      }
      return [];
    })(),
    usedSpellSlots:
      snap.usedSpellSlots && typeof snap.usedSpellSlots === 'object'
        ? snap.usedSpellSlots
        : {},
    spells: (() => {
      if (Array.isArray(snap.spells) && snap.spells.length > 0) return snap.spells;
      const extracted: SpellEntry[] = [];
      if (snap.spellsDetailsMd && typeof snap.spellsDetailsMd === 'object') {
        Object.entries(snap.spellsDetailsMd).forEach(([spellName, spellBody]: [string, any], idx) => {
          if (typeof spellBody === 'string') {
            extracted.push({
              id: `sp-${idx}`,
              name: spellName,
              level: 1,
              school: 'Magia',
              castingTime: '1 Azione',
              range: 'Vedi descrizione',
              components: 'V, S',
              duration: 'Istantanea',
              description: spellBody.trim(),
              summary: spellBody.slice(0, 80).trim(),
            });
          }
        });
      }
      return extracted;
    })(),
    proficiencies: snap.proficiencies ?? {
      armor: ['Armature leggere', 'Armature medie'],
      weapons: ['Armi semplici', 'Armi da guerra'],
      tools: ['Strumenti dell’avventuriero'],
      languages: ['Comune'],
    },
    inventory: Array.isArray(snap.inventory) ? snap.inventory : [
      { id: 'inv-1', name: 'Zaino da Avventuriero', quantity: 1, weight: '5 kg', equipped: true, category: 'Attrezzi' },
      { id: 'inv-2', name: 'Razioni da Viaggio (5 giorni)', quantity: 5, weight: '2.5 kg', equipped: false, category: 'Materiale' },
      { id: 'inv-3', name: 'Otre d’Acqua', quantity: 1, weight: '2 kg', equipped: true, category: 'Materiale' },
    ],
    personality: snap.personality ?? {
      traits: 'Ho affrontato pericoli e non arretro di fronte al destino.',
      ideals: 'Onore: Rispetto la gilda e i miei compagni di viaggio.',
      bonds: 'La mia lama serve la causa dell’avventura.',
      flaws: 'A volte agisco prima di aver ponderato tutti i rischi.',
    },
  };
}

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
        const normalized: PlayerCharacter[] = charRows.map((item: any) => ({
          ...item,
          rules_snapshot: normalizeRulesSnapshot(
            item.rules_snapshot,
            item.hit_points,
            item.level ?? 1,
            item.character_class ?? 'Guerriero'
          ),
          coins_gp: item.coins_gp ?? 0,
          coins_sp: item.coins_sp ?? 0,
          coins_cp: item.coins_cp ?? 0,
        }));

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

  useEffect(() => {
    void fetchCharacters();
  }, [fetchCharacters]);

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
    const keys: Array<{ key: AbilityKey; label: string; name: string; defaultVal: number }> = [
      { key: 'str', label: 'FOR', name: 'Forza', defaultVal: 17 },
      { key: 'dex', label: 'DES', name: 'Destrezza', defaultVal: 14 },
      { key: 'con', label: 'COS', name: 'Costituzione', defaultVal: 16 },
      { key: 'int', label: 'INT', name: 'Intelligenza', defaultVal: 10 },
      { key: 'wis', label: 'SAG', name: 'Saggezza', defaultVal: 12 },
      { key: 'cha', label: 'CAR', name: 'Carisma', defaultVal: 8 },
    ];

    return keys.map(({ key, label, name, defaultVal }) => {
      const score = (snapAbilities as any)[key] ?? defaultVal;
      const modifier = Math.floor((score - 10) / 2);
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
    const lvl = safeCharacter.level ?? 1;
    return Math.floor((lvl - 1) / 4) + 2;
  }, [safeCharacter.level]);

  // Ability modifier lookup helper
  const abilityModMap = useMemo(() => {
    const map: Record<AbilityKey, number> = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
    for (const ab of abilityScores) {
      map[ab.key] = ab.modifier;
    }
    return map;
  }, [abilityScores]);

  // Derived Saving Throws with Proficiency
  const savingThrows = useMemo<SavingThrowEntry[]>(() => {
    const proficientKeys = new Set(
      safeCharacter.rules_snapshot?.saving_throw_proficiencies ?? ['str', 'con']
    );

    return abilityScores.map((ab) => {
      const isProf = proficientKeys.has(ab.key);
      const bonus = ab.modifier + (isProf ? proficiencyBonus : 0);
      return {
        key: ab.key,
        label: ab.label,
        name: ab.name,
        bonus,
        proficient: isProf,
      };
    });
  }, [abilityScores, safeCharacter.rules_snapshot?.saving_throw_proficiencies, proficiencyBonus]);

  // Derived 18 D&D 5e Skills with full bonuses and expertises
  const skills = useMemo<SkillEntry[]>(() => {
    const profSet = new Set(safeCharacter.rules_snapshot?.skill_proficiencies ?? []);
    const expSet = new Set(safeCharacter.rules_snapshot?.skill_expertises ?? []);

    return (Object.keys(SKILL_METADATA) as SkillKey[]).map((k) => {
      const meta = SKILL_METADATA[k];
      const baseMod = abilityModMap[meta.ability] ?? 0;
      const isProf = profSet.has(k);
      const isExp = expSet.has(k);
      const bonus = baseMod + (isProf ? proficiencyBonus : 0) + (isExp ? proficiencyBonus : 0);

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
  }, [abilityModMap, safeCharacter.rules_snapshot?.skill_proficiencies, safeCharacter.rules_snapshot?.skill_expertises, proficiencyBonus]);

  // Passive Perception (10 + bonus)
  const passivePerception = useMemo(() => {
    const percSkill = skills.find((s) => s.key === 'perception');
    return 10 + (percSkill?.bonus ?? 0);
  }, [skills]);

  const saveOperation = useCallback((operation: MobileCharacterOperation) => {
    if (!activeCharacter) return Promise.resolve(false);
    const charId = activeCharacter.id;
    if (charId.startsWith('char-') || charId.startsWith('mock-')) {
      const nextCharacter = { ...activeCharacter, ...applyMobileCharacterOperation({
        ...activeCharacter,
        hit_points: activeCharacter.hit_points ?? 0,
        rules_snapshot: activeCharacter.rules_snapshot ?? {},
        coins_gp: activeCharacter.coins_gp ?? 0,
        coins_sp: activeCharacter.coins_sp ?? 0,
        coins_cp: activeCharacter.coins_cp ?? 0,
      }, operation) } as PlayerCharacter;
      const next = charactersRef.current.map((character) => character.id === charId ? nextCharacter : character);
      charactersRef.current = next;
      setCharacters(next);
      return Promise.resolve(true);
    }
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
        if (response.status === 409) throw new Error('La scheda è cambiata su un altro dispositivo. Aggiorna la schermata prima di continuare.');
        if (payload.error === 'max_hp_unavailable') throw new Error('Impossibile salvare i PF: il massimo PF non è presente nella scheda. Chiedi al GM di correggerla.');
        throw new Error(payload.error === 'forbidden' ? 'Non hai i permessi per salvare questa scheda.' : 'Salvataggio non riuscito. Riprova.');
      }
      const saved = payload.character as PlayerCharacter;
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
  const toggleInspiration = useCallback(() => saveOperation({ type: 'toggleInspiration' }), [saveOperation]);
  const spendHitDie = useCallback((count = 1) => saveOperation({ type: 'spendHitDie', count }), [saveOperation]);
  const useFeature = useCallback((featureId: string) => saveOperation({ type: 'useFeature', featureId }), [saveOperation]);
  const shortRest = useCallback(() => saveOperation({ type: 'shortRest' }), [saveOperation]);
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
    toggleInspiration,
    spendHitDie,
    useFeature,
    shortRest,
    updateSpellSlot,
    updateCoins,
    updateDeathSaves,
    longRest,
  };
}

export default usePlayerCharacter;
