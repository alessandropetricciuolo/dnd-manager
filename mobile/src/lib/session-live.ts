export type SessionLiveResources = {
  hitPoints: number;
  tempHp: number;
  deathSaves: { successes: number; failures: number };
  usedSpellSlots: Record<string, number>;
  conditions: string[];
};

export type SessionLiveProjection = {
  character_id: string;
  active: boolean;
  resources: SessionLiveResources;
};

export const SESSION_LIVE_CHARACTER_TABLE = "session_live_characters";
export const SESSION_LIVE_RESOURCES_LOCKED = "session_live_resources_managed_by_gm";
