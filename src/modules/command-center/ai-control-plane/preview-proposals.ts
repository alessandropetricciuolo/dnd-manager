import { previewAction } from "../actions";
import { getRegisteredAction } from "../actions/registry";
import type { AiInterpreterProposal } from "../types/ai-proposal";
import { normalizeProposalInput } from "./proposal-input";

export type PreviewedProposal = {
  action_name: string;
  input: Record<string, unknown>;
  rationale: string | null;
  preview_payload: Record<string, unknown>;
};

export async function previewInterpreterProposals(
  proposals: AiInterpreterProposal[],
  campaignId: string | null
): Promise<PreviewedProposal[]> {
  const out: PreviewedProposal[] = [];

  for (const proposal of proposals) {
    if (!getRegisteredAction(proposal.action_name)) continue;

    const input = normalizeProposalInput(proposal.action_name, proposal.input, campaignId);
    const previewResult = await previewAction(proposal.action_name, input, { actorType: "ai" });
    const preview_payload = previewResult.success
      ? (previewResult.data as Record<string, unknown>)
      : { error: previewResult.error };

    out.push({
      action_name: proposal.action_name,
      input,
      rationale: proposal.rationale || null,
      preview_payload,
    });
  }

  return out.slice(0, 1);
}
