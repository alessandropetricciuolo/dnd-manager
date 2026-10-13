import { CombatCondition, Combatant } from '../types';

export type CombatSnapshot = {
  combatants: Combatant[];
  round: number;
  currentTurnIndex: number;
};

export type CombatStorageManifest = {
  version: 2;
  revision: string;
  chunks: number;
};

export const COMBAT_STORAGE_CHUNK_SIZE = 400;
export const COMBAT_STORAGE_MAX_CHUNKS = 1000;
const CONDITIONS: CombatCondition[] = [
  'Avvelenato',
  'Barcollante',
  'Invisibile',
  'Paralizzato',
  'Privo di sensi',
  'Prono',
  'Stordito',
  'Trattenuto',
];

export function getCombatStorageKey(userId: string | null | undefined, campaignId: string | null | undefined): string | null {
  if (!userId || !campaignId) return null;
  return `bnd_combat_v2_${encodeURIComponent(userId)}_${encodeURIComponent(campaignId)}`;
}

export function parseCombatStorageManifest(value: string): CombatStorageManifest {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error('invalid_combat_manifest');
  }

  if (!parsed || typeof parsed !== 'object') throw new Error('invalid_combat_manifest');
  const manifest = parsed as Partial<CombatStorageManifest>;
  if (
    manifest.version !== 2 ||
    typeof manifest.revision !== 'string' ||
    manifest.revision.length < 1 ||
    manifest.revision.length > 100 ||
    !Number.isInteger(manifest.chunks) ||
    (manifest.chunks ?? 0) < 1 ||
    (manifest.chunks ?? 0) > COMBAT_STORAGE_MAX_CHUNKS
  ) {
    throw new Error('invalid_combat_manifest');
  }

  return manifest as CombatStorageManifest;
}

function isCombatant(value: unknown): value is Combatant {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<Combatant>;
  return (
    typeof candidate.id === 'string' &&
    candidate.id.length > 0 &&
    typeof candidate.name === 'string' &&
    Number.isFinite(candidate.initiative) &&
    Number.isFinite(candidate.hp) &&
    Number.isFinite(candidate.maxHp) &&
    Number.isFinite(candidate.ac) &&
    typeof candidate.isEnemy === 'boolean' &&
    Array.isArray(candidate.conditions) &&
    candidate.conditions.every((condition) => CONDITIONS.includes(condition)) &&
    (candidate.characterId === undefined || typeof candidate.characterId === 'string') &&
    (candidate.playerId === undefined || typeof candidate.playerId === 'string') &&
    (candidate.notes === undefined || typeof candidate.notes === 'string')
  );
}

export function parseCombatSnapshot(value: string): CombatSnapshot {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error('invalid_combat_snapshot');
  }

  if (!parsed || typeof parsed !== 'object') throw new Error('invalid_combat_snapshot');
  const snapshot = parsed as Partial<CombatSnapshot>;
  if (
    !Array.isArray(snapshot.combatants) ||
    snapshot.combatants.length > COMBAT_STORAGE_MAX_CHUNKS ||
    !snapshot.combatants.every(isCombatant) ||
    !Number.isInteger(snapshot.round) ||
    (snapshot.round ?? 0) < 1 ||
    !Number.isInteger(snapshot.currentTurnIndex) ||
    (snapshot.currentTurnIndex ?? -1) < 0 ||
    (snapshot.combatants.length === 0 && snapshot.currentTurnIndex !== 0) ||
    (snapshot.combatants.length > 0 && (snapshot.currentTurnIndex ?? -1) >= snapshot.combatants.length)
  ) {
    throw new Error('invalid_combat_snapshot');
  }

  return snapshot as CombatSnapshot;
}

export function createCombatStorageWritePlan(
  storageKey: string,
  snapshot: CombatSnapshot,
  revision: string
): { manifest: CombatStorageManifest; chunks: Array<{ key: string; value: string }> } {
  if (!storageKey || !revision || revision.length > 100) throw new Error('invalid_combat_write_target');
  const encoded = JSON.stringify(snapshot);
  const pieces = encoded.match(new RegExp(`.{1,${COMBAT_STORAGE_CHUNK_SIZE}}`, 'gs')) ?? [''];
  if (pieces.length > COMBAT_STORAGE_MAX_CHUNKS) throw new Error('combat_snapshot_too_large');

  return {
    manifest: { version: 2, revision, chunks: pieces.length },
    chunks: pieces.map((value, index) => ({ key: `${storageKey}_${revision}_${index}`, value })),
  };
}
