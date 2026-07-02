import { previewAction } from "../actions";
import type { PreviewedProposal } from "./preview-proposals";

export type EnrichProposalResult =
  | {
      ok: true;
      proposal: PreviewedProposal;
      assistantMessage?: string;
    }
  | { ok: false; error: string };

export async function enrichDomainProposal(
  actionName: string,
  _campaignId: string | null,
  _userMessage: string,
  proposal: PreviewedProposal
): Promise<EnrichProposalResult> {
  switch (actionName) {
    default:
      return { ok: true, proposal };
  }
}
