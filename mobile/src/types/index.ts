/**
 * Barber & Dragons Mobile - Core Domain Types
 * Aligned with Supabase schema and Web App models
 */

export type UserRole = 'player' | 'gm' | 'admin';

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  nickname: string | null;
  is_player_public: boolean;
  fame_score: number;
  sessions_attended_count: number;
  role: UserRole;
  first_name?: string | null;
  last_name?: string | null;
  date_of_birth?: string | null;
  phone?: string | null;
  username?: string | null;
  bio?: string | null;
  portrait_url?: string | null;
  is_gm_public?: boolean;
  stat_combat?: number;
  stat_roleplay?: number;
  stat_lethality?: string;
  whatsapp_opt_in?: boolean;
  notifications_disabled?: boolean;
  created_at: string;
  updated_at: string;
}

export type CampaignType = 'oneshot' | 'quest' | 'long' | 'torneo';

export interface Campaign {
  id: string;
  gm_id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  type: CampaignType | null;
  image_url: string | null;
  image_style_prompt?: string | null;
  ai_image_style_key?: string | null;
  ai_context?: Record<string, unknown> | null;
  long_calendar_config?: Record<string, unknown> | null;
  long_calendar_base_date?: Record<string, unknown> | null;
  long_registrations_open?: boolean;
  admin_drafts_enabled?: boolean;
  created_at: string;
  updated_at: string;
}

export type SessionStatus = 'scheduled' | 'completed' | 'cancelled';

export interface Session {
  id: string;
  campaign_id: string | null;
  title: string | null;
  scheduled_at: string;
  status: SessionStatus;
  max_players: number;
  notes: string | null;
  location: string | null;
  dm_id: string | null;
  session_summary: string | null;
  gm_private_notes: string | null;
  is_pre_closed?: boolean;
  pre_closed_xp_gained?: number | null;
  pre_closed_xp_awards?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface Character {
  id: string;
  campaign_id: string;
  name: string;
  image_url: string | null;
  sheet_file_path: string | null;
  current_xp: number;
  level: number;
  character_class: string | null;
  class_subclass: string | null;
  armor_class: number | null;
  hit_points: number | null;
  background: string | null;
  race_slug: string | null;
  subclass_slug: string | null;
  background_slug: string | null;
  rules_snapshot?: Record<string, unknown> | null;
  assigned_to: string | null;
  time_offset_hours?: number;
  pos_x_grid?: number;
  pos_y_grid?: number;
  coins_gp?: number;
  coins_sp?: number;
  coins_cp?: number;
  created_at: string;
  updated_at: string;
}

export interface WhisperMessage {
  id: string;
  campaign_id: string;
  sender_id: string;
  receiver_id: string;
  message: string | null;
  image_url: string | null;
  created_at: string;
}

export interface AuthSessionState {
  user: Profile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';

export interface AbilityScoreEntry {
  key: AbilityKey;
  label: string;
  name: string;
  score?: number;
  modifier?: number;
}

export type SkillKey =
  | 'acrobatics'
  | 'animal_handling'
  | 'arcana'
  | 'athletics'
  | 'deception'
  | 'history'
  | 'insight'
  | 'intimidation'
  | 'investigation'
  | 'medicine'
  | 'nature'
  | 'perception'
  | 'performance'
  | 'persuasion'
  | 'religion'
  | 'sleight_of_hand'
  | 'stealth'
  | 'survival';

export interface SkillEntry {
  key: SkillKey;
  name: string;
  ability: AbilityKey;
  abilityLabel: string;
  bonus?: number;
  proficient?: boolean;
  expertise?: boolean;
}

export interface SavingThrowEntry {
  key: AbilityKey;
  label: string;
  name: string;
  bonus?: number;
  proficient?: boolean;
}

export interface WeaponAttackEntry {
  id: string;
  name: string;
  attackBonus?: number;
  damage: string;
  damageType: string;
  range?: string;
  properties?: string;
  notes?: string;
}

export interface ClassFeatureEntry {
  id: string;
  name: string;
  source: 'class' | 'subclass' | 'race' | 'feat' | 'background';
  description: string;
  usesCurrent?: number;
  usesMax?: number;
  resetOn?: 'shortRest' | 'longRest';
}

export interface SpellEntry {
  id: string;
  level: number;
  name: string;
  summary?: string;
  castingTime: string;
  range: string;
  duration: string;
  components?: string;
  concentration?: boolean;
  ritual?: boolean;
  school?: string;
  description?: string;
  prepared?: boolean;
}

export interface InventoryItemEntry {
  id: string;
  name: string;
  quantity?: number;
  weight?: string;
  equipped?: boolean;
  category?: string;
  notes?: string;
}

export interface CharacterRulesSnapshot {
  version?: number;
  max_hp?: number;
  temp_hp?: number;
  death_saves?: {
    successes: number;
    failures: number;
  };
  hit_dice?: {
    total: number;
    current: number;
    die: string;
  };
  inspiration?: boolean;
  speed?: string;
  initiative?: number;
  proficiency_bonus?: number;
  passive_perception?: number;
  spellcasting?: {
    ability?: AbilityKey;
    saveDc?: number;
    attackBonus?: number;
  };
  spellSlots?: Array<{ level: number; count: number }>;
  usedSpellSlots?: Record<number, number>;
  spells?: SpellEntry[];
  weapons?: WeaponAttackEntry[];
  features?: ClassFeatureEntry[];
  inventory?: InventoryItemEntry[];
  proficiencies?: {
    armor?: string[];
    weapons?: string[];
    tools?: string[];
    languages?: string[];
  };
  personality?: {
    traits?: string;
    ideals?: string;
    bonds?: string;
    flaws?: string;
  };
  abilities?: {
    str?: number;
    dex?: number;
    con?: number;
    int?: number;
    wis?: number;
    cha?: number;
  };
  saving_throw_proficiencies?: AbilityKey[];
  skill_proficiencies?: SkillKey[];
  skill_expertises?: SkillKey[];
  [key: string]: unknown;
}

export interface PlayerCharacter extends Character {
  campaigns?: {
    id: string;
    name: string;
  } | null;
  rules_snapshot?: CharacterRulesSnapshot | null;
}

export type SessionSignupStatus =
  | 'pending'
  | 'approved'
  | 'attended'
  | 'rejected'
  | 'absent'
  | 'confirmed'
  | 'waitlist'
  | 'cancelled';

export interface SessionSignup {
  id: string;
  session_id: string;
  player_id: string;
  status: SessionSignupStatus;
  signed_up_at?: string;
  created_at?: string;
}

export interface SessionSignupDetail extends SessionSignup {
  playerProfile?: {
    id: string;
    display_name: string | null;
    nickname: string | null;
    avatar_url: string | null;
    email?: string | null;
  } | null;
  character?: {
    id: string;
    name: string;
    level: number;
    character_class: string | null;
    class_subclass: string | null;
    image_url: string | null;
    armor_class: number | null;
    hit_points: number | null;
  } | null;
}

export interface CreateSessionInput {
  campaign_id: string;
  title: string;
  scheduled_at: string;
  max_players: number;
  location?: string | null;
  notes?: string | null;
  gm_private_notes?: string | null;
  dm_id?: string | null;
}

export interface UpdateSessionInput {
  title?: string | null;
  scheduled_at?: string;
  status?: SessionStatus;
  max_players?: number;
  location?: string | null;
  notes?: string | null;
  gm_private_notes?: string | null;
}

export interface PlayerSession extends Session {
  campaigns?: {
    id?: string;
    name: string;
    image_url?: string | null;
    type?: CampaignType | null;
    description?: string | null;
  } | null;
  session_signups?: SessionSignup[];
  mySignup?: SessionSignup | null;
  confirmedCount?: number;
  isConfirmed?: boolean;
  isWaitlist?: boolean;
  isFull?: boolean;
  duration_hours?: number | null;
  description?: string | null;
}

export type DieType = 'd20' | 'd12' | 'd10' | 'd8' | 'd6' | 'd4' | 'd2';
export type RollMode = 'normal' | 'advantage' | 'disadvantage';

export interface DiceRollResult {
  id: string;
  die: DieType;
  mode: RollMode;
  modifier: number;
  rolls: number[];
  selectedRoll: number;
  total: number;
  isNat20: boolean;
  isNat1: boolean;
  label?: string;
  timestamp: string;
}

export type CombatCondition =
  | 'Avvelenato'
  | 'Barcollante'
  | 'Invisibile'
  | 'Paralizzato'
  | 'Privo di sensi'
  | 'Prono'
  | 'Stordito'
  | 'Trattenuto';

export interface Combatant {
  id: string;
  name: string;
  initiative: number;
  hp: number;
  maxHp: number;
  ac: number;
  isEnemy: boolean;
  conditions: CombatCondition[];
  characterId?: string;
  playerId?: string;
  notes?: string;
}

export type GmRemoteAudioCommandType =
  | 'audio.music_play_pause'
  | 'audio.music_next'
  | 'audio.music_prev'
  | 'audio.music_select_track'
  | 'audio.music_master_volume'
  | 'audio.music_mute'
  | 'audio.atmos_master_volume'
  | 'audio.sfx_master_volume'
  | 'audio.sfx_pad_slot'
  | 'audio.sfx_category_random'
  | 'audio.stop_all';

export interface GmRemoteCommand {
  id?: string;
  command_id: string;
  session_public_id: string;
  campaign_id: string;
  type: string;
  payload: Record<string, unknown>;
  issued_at: string;
  seq?: number | null;
  source?: 'remote' | 'gm_screen';
  created_at?: string;
}

export interface GmRemoteSession {
  id: string;
  public_id: string;
  campaign_id: string;
  expires_at: string;
  revoked_at: string | null;
  created_by: string;
  created_at: string;
}

export type WikiEntityType = 'npc' | 'monster' | 'item' | 'location' | 'lore' | 'faction';

export interface WikiEntity {
  id: string;
  campaign_id: string;
  type: WikiEntityType;
  name: string;
  content: any;
  image_url: string | null;
  tags?: string[];
  admin_only?: boolean;
  created_at?: string;
  updated_at?: string;
}

export type MissionStatus = 'open' | 'in_progress' | 'completed' | string;
export type MissionDifficulty = 'Facile' | 'Media' | 'Letale' | 'Difficile';

export interface CampaignMission {
  id: string;
  campaign_id: string;
  grade: string;
  title: string;
  committente: string;
  ubicazione: string;
  paga: string;
  urgenza: string;
  description: string;
  status: MissionStatus;
  points_reward?: number;
  treasure_gp?: number;
  treasure_sp?: number;
  treasure_cp?: number;
  created_at?: string;
  updated_at?: string;
}

export interface PlayerConversationSummary {
  playerId: string;
  playerName: string;
  characterName: string;
  characterAvatar?: string | null;
  lastMessage: WhisperMessage | null;
  unreadCount: number;
  messages: WhisperMessage[];
  updatedAt: string;
}
