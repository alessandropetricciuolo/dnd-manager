export const AI_PROPOSAL_STATUSES = [
  "proposed",
  "approved",
  "executed",
  "rejected",
  "failed",
] as const;

export type AiProposalStatus = (typeof AI_PROPOSAL_STATUSES)[number];

export type AiActionRequestRow = {
  id: string;
  workspace_id: string | null;
  campaign_id: string | null;
  requested_by: string;
  user_input_id: string | null;
  note_id: string | null;
  action_name: string;
  status: AiProposalStatus;
  input_payload: Record<string, unknown>;
  preview_payload: Record<string, unknown>;
  result_payload: Record<string, unknown> | null;
  rationale: string | null;
  error: string | null;
  created_at: string;
  approved_at: string | null;
  executed_at: string | null;
};

export type AiInterpreterProposal = {
  action_name: string;
  input: Record<string, unknown>;
  rationale: string;
};

export type AiInterpreterResult = {
  reply: string;
  intent_summary: string;
  proposals: AiInterpreterProposal[];
};

export type AiDraftAssistantResult = {
  reply: string;
  intentSummary: string;
  inputId: string | null;
  proposals: AiActionRequestRow[];
};

/** Action che l'AI può proporre in Fase 3 (solo bozze, nessuna esecuzione). */
export const AI_DRAFT_ALLOWED_ACTIONS = [
  "workspace.task.create",
  "workspace.page.create",
  "wiki.entity.create",
  "gm.note.create",
] as const;

export type AiDraftAllowedAction = (typeof AI_DRAFT_ALLOWED_ACTIONS)[number];
