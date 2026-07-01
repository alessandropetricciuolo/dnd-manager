import { previewAction } from "../actions";
import { getRegisteredAction } from "../actions/registry";
import type { ActionContext } from "../types/actions";
import type { AiActionRequestRow, AiInterpreterProposal } from "../types/ai-proposal";

export async function buildProposalsFromInterpreter(
  ctx: ActionContext,
  proposals: AiInterpreterProposal[],
  meta: {
    campaignId: string | null;
    userInputId: string | null;
    noteId: string | null;
  }
): Promise<AiActionRequestRow[]> {
  const created: AiActionRequestRow[] = [];

  for (const proposal of proposals) {
    const action = getRegisteredAction(proposal.action_name);
    if (!action) continue;

    const input = normalizeProposalInput(proposal.action_name, proposal.input, meta.campaignId);
    const previewResult = await previewAction(proposal.action_name, input, { actorType: "ai" });
    const preview_payload = previewResult.success
      ? (previewResult.data as Record<string, unknown>)
      : { error: previewResult.error };

    const { data, error } = await ctx.supabase
      .from("ai_action_requests")
      .insert({
        workspace_id: ctx.adapter.resolveWorkspaceId(),
        campaign_id: meta.campaignId,
        requested_by: ctx.userId,
        user_input_id: meta.userInputId,
        note_id: meta.noteId,
        action_name: proposal.action_name,
        status: "proposed",
        input_payload: input,
        preview_payload,
        rationale: proposal.rationale || null,
      })
      .select("*")
      .single();

    if (error) {
      console.error("[buildProposalsFromInterpreter]", proposal.action_name, error);
      continue;
    }
    created.push(data as AiActionRequestRow);
  }

  return created;
}

function normalizeProposalInput(
  actionName: string,
  input: Record<string, unknown>,
  campaignId: string | null
): Record<string, unknown> {
  const out = { ...input };
  if (campaignId) {
    if (actionName === "wiki.entity.create" || actionName === "gm.note.create") {
      out.campaignId = campaignId;
    }
    if (actionName === "workspace.task.create" || actionName === "workspace.page.create") {
      if (out.campaignId === undefined) out.campaignId = campaignId;
    }
  }
  return out;
}
