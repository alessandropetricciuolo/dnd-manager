import { isUuidString, isRecord } from './protocol';
import type { CombatCommandProposal } from '@/lib/fight-mode/types';

export const GM_REMOTE_COMBAT_REQUEST_TYPE = 'combat.command_request';
export const GM_REMOTE_COMBAT_CONFIRM_TYPE = 'combat.command_confirm';
export const GM_REMOTE_COMBAT_COMMAND_MAX_AGE_MS = 30_000;

export type RemoteCombatCommandRequest = {
  request_id: string;
  text: string;
  mode: 'local' | 'ai';
  campaign_id: string;
  session_id: string;
  match_id: string | null;
  state_signature: string;
};

export type RemoteCombatCommandConfirm = {
  request_id: string;
  proposal_id: string;
  operation_ids: string[];
  campaign_id: string;
  session_id: string;
  match_id: string | null;
  state_signature: string;
};

export type RemoteCombatCommandSnapshot = {
  requestId: string;
  proposalId?: string;
  status: 'awaiting' | 'proposal' | 'applied' | 'rejected';
  campaignId: string;
  remoteSessionPublicId: string;
  sessionId: string;
  matchId: string | null;
  stateSignature: string;
  message?: string;
  rawInput?: string;
  proposal?: CombatCommandProposal;
  receipt?: { appliedAt: string; stateSignature: string };
};

function validText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= 2000;
}

function validSignature(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 20_000;
}

function validMatchId(value: unknown): value is string | null {
  return value === null || (typeof value === 'string' && value.length <= 120);
}

export function parseRemoteCombatCommandRequest(value: unknown): RemoteCombatCommandRequest | null {
  if (!isRecord(value)) return null;
  const keys = Object.keys(value).sort().join(',');
  if (keys !== 'campaign_id,match_id,mode,request_id,session_id,state_signature,text') return null;
  if (!isUuidString(String(value.request_id)) || !validText(value.text)) return null;
  if (value.mode !== 'local' && value.mode !== 'ai') return null;
  if (typeof value.campaign_id !== 'string' || !isUuidString(value.session_id as string)) return null;
  if (value.match_id !== null || !validMatchId(value.match_id) || !validSignature(value.state_signature)) return null;
  return {
    request_id: value.request_id as string,
    text: value.text.trim(),
    mode: value.mode,
    campaign_id: value.campaign_id,
    session_id: value.session_id as string,
    match_id: value.match_id,
    state_signature: value.state_signature,
  };
}

export function parseRemoteCombatCommandConfirm(value: unknown): RemoteCombatCommandConfirm | null {
  if (!isRecord(value)) return null;
  const keys = Object.keys(value).sort().join(',');
  if (keys !== 'campaign_id,match_id,operation_ids,proposal_id,request_id,session_id,state_signature') return null;
  if (!isUuidString(String(value.request_id)) || typeof value.proposal_id !== 'string' || value.proposal_id.length > 120) return null;
  if (!Array.isArray(value.operation_ids) || value.operation_ids.length > 100 || value.operation_ids.some((id) => typeof id !== 'string' || !id || id.length > 120)) return null;
  if (new Set(value.operation_ids).size !== value.operation_ids.length) return null;
  if (typeof value.campaign_id !== 'string' || !isUuidString(value.session_id as string)) return null;
  if (!validMatchId(value.match_id) || !validSignature(value.state_signature)) return null;
  return {
    request_id: value.request_id as string,
    proposal_id: value.proposal_id,
    operation_ids: value.operation_ids as string[],
    campaign_id: value.campaign_id,
    session_id: value.session_id as string,
    match_id: value.match_id,
    state_signature: value.state_signature,
  };
}

export function isRemoteCombatCommandFresh(issuedAt: string, now = Date.now()): boolean {
  const time = Date.parse(issuedAt);
  return Number.isFinite(time) && now - time >= -5_000 && now - time <= GM_REMOTE_COMBAT_COMMAND_MAX_AGE_MS;
}

export function isRemoteCombatCommandContextCurrent(
  proposal: RemoteCombatCommandSnapshot,
  current: {
    campaignId: string;
    remoteSessionPublicId: string;
    sessionId: string | null;
    matchId: string | null;
    stateSignature: string;
  }
): boolean {
  return proposal.campaignId === current.campaignId &&
    proposal.remoteSessionPublicId === current.remoteSessionPublicId &&
    proposal.sessionId === current.sessionId &&
    proposal.matchId === current.matchId &&
    proposal.stateSignature === current.stateSignature;
}
