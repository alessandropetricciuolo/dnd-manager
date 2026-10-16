import type { InitiativeTrackerState } from '@/components/gm/initiative-tracker';
import { parseLocalCombatCommand } from '@/lib/fight-mode/command-parser';
import { applyCombatCommandProposal, initiativeStateSyncSignature } from '@/lib/fight-mode/state-transitions';
import type { CombatCommandProposal } from '@/lib/fight-mode/types';
import {
  isRemoteCombatCommandContextCurrent,
  parseRemoteCombatCommandConfirm,
  parseRemoteCombatCommandRequest,
  type RemoteCombatCommandSnapshot,
} from './combat-command-remote';

export type RemoteCombatCommandControllerContext = {
  campaignId: string;
  sessionId: string | null;
  remoteSessionPublicId: string | null;
  matchId: string | null;
};

export type RemoteAiProposalResult =
  | { success: true; proposal: CombatCommandProposal }
  | { success: false; error: string };

type Options = {
  getContext: () => RemoteCombatCommandControllerContext;
  getState: () => InitiativeTrackerState;
  setState: (state: InitiativeTrackerState) => void;
  onChange: (proposal: RemoteCombatCommandSnapshot | null) => void;
  parseAi: (text: string, state: InitiativeTrackerState, stateSignature: string) => Promise<RemoteAiProposalResult>;
};

export function createRemoteCombatCommandController(options: Options) {
  let active: RemoteCombatCommandSnapshot | null = null;
  let generation = 0;
  let claimedProposalId: string | null = null;
  const seenRequests = new Map<string, string>();
  let knownRemoteSessionId: string | null = options.getContext().remoteSessionPublicId;
  let knownSessionId: string | null = options.getContext().sessionId;
  let knownCampaignId = options.getContext().campaignId;

  const publish = (next: RemoteCombatCommandSnapshot | null) => {
    active = next;
    options.onChange(next);
  };

  const currentContext = () => {
    const context = options.getContext();
    return {
      ...context,
      stateSignature: initiativeStateSyncSignature(options.getState()),
    };
  };

  const onRemoteSessionContextChange = (remoteSessionPublicId: string | null) => {
    if (knownRemoteSessionId === remoteSessionPublicId) return;
    knownRemoteSessionId = remoteSessionPublicId;
    generation += 1;
    if (active && active.remoteSessionPublicId !== remoteSessionPublicId) {
      publish({ ...active, status: 'rejected', message: 'Il collegamento remoto è cambiato. Richiedi una nuova analisi dal telefono.' });
    }
  };

  const onSessionContextChange = (sessionId: string | null) => {
    if (knownSessionId === sessionId) return;
    knownSessionId = sessionId;
    generation += 1;
    if (active) publish({ ...active, status: 'rejected', message: 'La sessione è cambiata. Richiedi una nuova analisi.' });
  };

  const onCampaignContextChange = (campaignId: string) => {
    if (knownCampaignId === campaignId) return;
    knownCampaignId = campaignId;
    generation += 1;
    if (active) publish({ ...active, status: 'rejected', message: 'La campagna è cambiata. Richiedi una nuova analisi.' });
  };

  const request = async (payload: Record<string, unknown>, remoteSessionPublicId: string) => {
    const request = parseRemoteCombatCommandRequest(payload);
    if (!request) return;
    if (knownRemoteSessionId === null) knownRemoteSessionId = remoteSessionPublicId;
    if (knownRemoteSessionId !== remoteSessionPublicId) return;
    const requestFingerprint = JSON.stringify(request);
    const seenRequestFingerprint = seenRequests.get(request.request_id);
    if (seenRequestFingerprint !== undefined) {
      if (seenRequestFingerprint !== requestFingerprint && active?.requestId === request.request_id) {
        publish({ ...active, status: 'rejected', message: 'ID richiesta già usato con contenuti diversi. Crea una nuova richiesta.' });
      }
      return;
    }
    seenRequests.set(request.request_id, requestFingerprint);
    if (seenRequests.size > 128) seenRequests.delete(seenRequests.keys().next().value!);

    const generationAtStart = ++generation;
    const state = options.getState();
    const stateSignature = initiativeStateSyncSignature(state);
    const context = options.getContext();
    const base: RemoteCombatCommandSnapshot = {
      requestId: request.request_id,
      status: 'awaiting',
      campaignId: context.campaignId,
      remoteSessionPublicId,
      sessionId: request.session_id,
      matchId: request.match_id,
      stateSignature: request.state_signature,
      rawInput: request.text,
    };

    if (context.remoteSessionPublicId && context.remoteSessionPublicId !== remoteSessionPublicId ||
      request.campaign_id !== context.campaignId || request.session_id !== context.sessionId || request.match_id !== null ||
      context.matchId !== null || request.state_signature !== stateSignature || !context.sessionId) {
      publish({ ...base, status: 'rejected', message: 'La sessione o il combattimento è cambiato. Aggiorna lo snapshot e invia di nuovo.' });
      return;
    }
    publish(base);
    try {
      const combatants = state.entries.map((entry) => ({ id: entry.id, name: entry.name, type: entry.type, hp: entry.hp, maxHp: entry.maxHp }));
      const result = request.mode === 'ai'
        ? await options.parseAi(request.text, state, stateSignature)
        : { success: true as const, proposal: parseLocalCombatCommand(request.text, combatants, stateSignature) };
      const latest = currentContext();
      if (generation !== generationAtStart || active?.requestId !== request.request_id) return;
      if (latest.campaignId !== request.campaign_id || latest.sessionId !== request.session_id || latest.remoteSessionPublicId !== remoteSessionPublicId ||
        latest.matchId !== null || latest.stateSignature !== stateSignature) {
        publish({ ...base, status: 'rejected', message: 'Il combattimento o il collegamento è cambiato durante l’analisi. Rianalizza il comando.' });
        return;
      }
      if (!result.success) {
        publish({ ...base, status: 'rejected', message: result.error });
        return;
      }
      publish({ ...base, status: 'proposal', proposalId: result.proposal.proposalId, proposal: result.proposal, message: result.proposal.explanation });
    } catch {
      if (generation === generationAtStart && active?.requestId === request.request_id) {
        publish({ ...base, status: 'rejected', message: 'Analisi non riuscita. Correggi il testo e invia una nuova richiesta.' });
      }
    }
  };

  const confirm = (payload: Record<string, unknown>, remoteSessionPublicId: string) => {
    const confirmation = parseRemoteCombatCommandConfirm(payload);
    const pending = active;
    if (!confirmation || !pending?.proposal || pending.status !== 'proposal' || pending.proposalId !== confirmation.proposal_id || pending.requestId !== confirmation.request_id) return;
    const current = currentContext();
    if (knownRemoteSessionId !== remoteSessionPublicId || !isRemoteCombatCommandContextCurrent(pending, {
      campaignId: current.campaignId,
      remoteSessionPublicId,
      sessionId: current.sessionId,
      matchId: current.matchId,
      stateSignature: current.stateSignature,
    }) || confirmation.campaign_id !== current.campaignId || confirmation.session_id !== current.sessionId ||
      confirmation.match_id !== null || confirmation.state_signature !== current.stateSignature || current.matchId !== null) {
      publish({ ...pending, status: 'rejected', message: 'Proposta obsoleta o sessione remota diversa. Richiedi una nuova analisi.' });
      return;
    }
    if (claimedProposalId === confirmation.proposal_id) return;
    claimedProposalId = confirmation.proposal_id;
    const result = applyCombatCommandProposal(options.getState(), pending.proposal, confirmation.operation_ids);
    if (!result.success) {
      claimedProposalId = null;
      publish({ ...pending, status: 'rejected', message: result.message });
      return;
    }
    options.setState(result.nextState);
    publish({ ...pending, status: 'applied', message: 'Applicato dal GM Screen.', receipt: {
      appliedAt: new Date().toISOString(),
      stateSignature: initiativeStateSyncSignature(result.nextState),
    } });
  };

  const confirmOnPc = (operationIds?: string[]) => {
    if (!active?.proposal || !active.proposalId) return;
    confirm({
      request_id: active.requestId,
      proposal_id: active.proposalId,
      operation_ids: operationIds ?? active.proposal.operations.map((operation) => operation.id),
      campaign_id: active.campaignId,
      session_id: active.sessionId,
      match_id: active.matchId,
      state_signature: currentContext().stateSignature,
    }, active.remoteSessionPublicId);
  };

  return { request, confirm, confirmOnPc, onRemoteSessionContextChange, onSessionContextChange, onCampaignContextChange, getSnapshot: () => active };
}
