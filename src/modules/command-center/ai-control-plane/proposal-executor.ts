import { revalidatePath } from "next/cache";
import { executeAction } from "../actions/registry";
import { snapshotValue } from "../actions/audit";
import type { ActionContext } from "../types/actions";
import {
  AI_DRAFT_ALLOWED_ACTIONS,
  type AiActionRequestRow,
} from "../types/ai-proposal";
import { assertCanExecuteWithApproval } from "./autonomy";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function getProposalExecutionBlockReason(
  row: Pick<AiActionRequestRow, "status" | "action_name" | "preview_payload">
): string | null {
  if (row.status !== "proposed") {
    return "La proposta non è più in attesa.";
  }
  if (!(AI_DRAFT_ALLOWED_ACTIONS as readonly string[]).includes(row.action_name)) {
    return `Action non consentita: ${row.action_name}`;
  }
  const previewError = asRecord(row.preview_payload)?.error;
  if (typeof previewError === "string" && previewError.trim()) {
    return `Anteprima non valida: ${previewError}`;
  }
  return null;
}

export async function executeAiProposal(
  ctx: ActionContext,
  proposalId: string
): Promise<
  | { success: true; data: { proposalId: string; actionName: string; result: unknown } }
  | { success: false; error: string }
> {
  assertCanExecuteWithApproval();

  const { data: proposal, error: loadErr } = await ctx.supabase
    .from("ai_action_requests")
    .select("*")
    .eq("id", proposalId)
    .eq("requested_by", ctx.userId)
    .maybeSingle();

  if (loadErr) {
    console.error("[executeAiProposal] load", loadErr);
    return { success: false, error: loadErr.message };
  }
  if (!proposal) {
    return { success: false, error: "Proposta non trovata." };
  }

  const row = proposal as AiActionRequestRow;
  const blockReason = getProposalExecutionBlockReason(row);
  if (blockReason) return { success: false, error: blockReason };

  const now = new Date().toISOString();

  const { error: approveErr } = await ctx.supabase
    .from("ai_action_requests")
    .update({ status: "approved", approved_at: now })
    .eq("id", proposalId)
    .eq("requested_by", ctx.userId)
    .eq("status", "proposed");

  if (approveErr) {
    console.error("[executeAiProposal] approve", approveErr);
    return { success: false, error: approveErr.message };
  }

  const result = await executeAction(row.action_name, row.input_payload, {
    actorType: "user",
    auditMetadata: {
      source: "ai_proposal",
      proposalId: row.id,
      suggestedAction: row.action_name,
      userInputId: row.user_input_id,
    },
  });

  if (!result.success) {
    await ctx.supabase
      .from("ai_action_requests")
      .update({
        status: "failed",
        error: result.error,
        executed_at: now,
      })
      .eq("id", proposalId);
    return { success: false, error: result.error };
  }

  const resultSnapshot = snapshotValue(result.data);

  const { error: finalizeErr } = await ctx.supabase
    .from("ai_action_requests")
    .update({
      status: "executed",
      result_payload: resultSnapshot,
      error: null,
      executed_at: now,
    })
    .eq("id", proposalId);

  if (finalizeErr) {
    console.error("[executeAiProposal] finalize", finalizeErr);
    return { success: false, error: finalizeErr.message };
  }

  revalidatePath("/command-center");

  return {
    success: true,
    data: {
      proposalId: row.id,
      actionName: row.action_name,
      result: result.data,
    },
  };
}
