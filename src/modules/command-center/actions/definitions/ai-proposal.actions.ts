import { registerAction } from "../registry";
import { executeAiProposal } from "../../ai-control-plane/proposal-executor";

export function registerAiProposalActions(): void {
  registerAction({
    name: "ai.proposal.execute",
    description: "Applica una proposta AI approvata dal GM tramite Action Registry",
    category: "ai",
    validate: (input) => {
      const proposalId = (input as Record<string, unknown>).proposalId;
      if (typeof proposalId !== "string" || !proposalId.trim()) {
        return { ok: false, error: "ID proposta obbligatorio." };
      }
      return { ok: true, data: proposalId.trim() };
    },
    execute: async (ctx, proposalId) => {
      const result = await executeAiProposal(ctx, proposalId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    auditEntity: (_input, result) => ({
      entityType: "ai_action_request",
      entityId: result.proposalId,
    }),
    revalidatePaths: () => ["/command-center"],
  });

  registerAction({
    name: "ai.proposal.reject",
    description: "Scarta una proposta AI in attesa",
    category: "ai",
    validate: (input) => {
      const proposalId = (input as Record<string, unknown>).proposalId;
      if (typeof proposalId !== "string" || !proposalId.trim()) {
        return { ok: false, error: "ID proposta obbligatorio." };
      }
      return { ok: true, data: proposalId.trim() };
    },
    execute: async (ctx, proposalId) => {
      const { error } = await ctx.supabase
        .from("ai_action_requests")
        .update({ status: "rejected" })
        .eq("id", proposalId)
        .eq("requested_by", ctx.userId)
        .eq("status", "proposed");

      if (error) throw new Error(error.message);
      return { proposalId, status: "rejected" as const };
    },
    auditEntity: (_input, result) => ({
      entityType: "ai_action_request",
      entityId: result.proposalId,
    }),
    revalidatePaths: () => ["/command-center"],
  });
}
