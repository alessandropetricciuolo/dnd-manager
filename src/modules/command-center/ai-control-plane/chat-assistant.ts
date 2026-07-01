import { revalidatePath } from "next/cache";
import { isAiDraftAllowedAction } from "../actions/action-catalog";
import { executeAction, resolveActionContext } from "../actions/registry";
import { assertCanProposeDrafts } from "./autonomy";
import { resolveCommandContext } from "./context-resolver";
import { detectConversationIntent } from "./conversation-intent";
import { formatProposalForChat } from "./format-proposal-chat";
import { interpretUserMessage } from "./interpreter";
import { previewInterpreterProposals, type PreviewedProposal } from "./preview-proposals";
import type { RunAiChatAssistantParams } from "./draft-assistant.types";

export type ChatPendingProposal = PreviewedProposal;

export type AiChatAssistantResult = {
  reply: string;
  intentSummary: string;
  pendingProposal: ChatPendingProposal | null;
  executed: boolean;
  clearedPending: boolean;
};

export async function runAiChatAssistant(
  input: RunAiChatAssistantParams
): Promise<{ success: true; data: AiChatAssistantResult } | { success: false; error: string }> {
  assertCanProposeDrafts();

  const message = input.message.trim();
  if (!message) return { success: false, error: "Scrivi un messaggio per l'assistente." };

  const resolved = await resolveActionContext("ai");
  if (!resolved.ok) return { success: false, error: resolved.error };
  const ctx = resolved.ctx;

  const campaignId = input.campaignId?.trim() || null;
  const pending = input.pendingProposal ?? null;
  const intent = detectConversationIntent(message, Boolean(pending));

  const source = input.source ?? "text";
  const transcript =
    source === "voice" ? input.transcript?.trim() || message : input.transcript?.trim() || null;

  await ctx.supabase.from("command_inputs").insert({
    workspace_id: ctx.adapter.resolveWorkspaceId(),
    campaign_id: campaignId,
    source,
    raw_content: message,
    transcript,
    language: input.language ?? "it",
    metadata: {
      ...(source === "voice" && input.voiceMetadata ? { voice: input.voiceMetadata } : {}),
      chatIntent: intent,
      hasPending: Boolean(pending),
    },
    created_by: ctx.userId,
  });

  if (intent === "confirm" && pending) {
    if (!isAiDraftAllowedAction(pending.action_name)) {
      return { success: false, error: "Action non consentita." };
    }
    if (pending.preview_payload.error) {
      return {
        success: false,
        error: `Non posso applicare: ${String(pending.preview_payload.error)}`,
      };
    }

    const result = await executeAction(pending.action_name, pending.input, {
      actorType: "user",
      auditMetadata: {
        source: "ai_chat_confirm",
        rationale: pending.rationale,
      },
    });

    revalidatePath("/command-center");
    if (campaignId) revalidatePath(`/campaigns/${campaignId}`);

    if (!result.success) {
      return {
        success: true,
        data: {
          reply: `Non sono riuscito ad applicare l'azione: ${result.error}\n\nPuoi chiedere modifiche o scrivere annulla.`,
          intentSummary: "Esecuzione fallita",
          pendingProposal: pending,
          executed: false,
          clearedPending: false,
        },
      };
    }

    return {
      success: true,
      data: {
        reply: "Fatto! Ho applicato la proposta nel database. Vuoi preparare altro?",
        intentSummary: "Esecuzione confermata",
        pendingProposal: null,
        executed: true,
        clearedPending: true,
      },
    };
  }

  if (intent === "reject" && pending) {
    return {
      success: true,
      data: {
        reply: "Ok, ho scartato la proposta. Dimmi pure cosa vuoi fare adesso.",
        intentSummary: "Proposta annullata",
        pendingProposal: null,
        executed: false,
        clearedPending: true,
      },
    };
  }

  const commandContext = await resolveCommandContext(
    ctx.supabase,
    ctx.userId,
    campaignId,
    message
  );

  let interpreted;
  try {
    interpreted = await interpretUserMessage(message, commandContext, {
      mode: intent === "refine" && pending ? "refine" : "new",
      pendingProposal: pending
        ? {
            action_name: pending.action_name,
            input: pending.input,
            rationale: pending.rationale ?? undefined,
          }
        : undefined,
    });
  } catch (err) {
    console.error("[runAiChatAssistant] interpret", err);
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Servizio AI non disponibile. Verifica la configurazione API.",
    };
  }

  const previews = await previewInterpreterProposals(interpreted.proposals, campaignId);
  const nextPending = previews[0] ?? null;

  let reply = interpreted.reply;
  if (nextPending) {
    reply = `${reply}\n\n${formatProposalForChat(nextPending)}`;
  } else if (intent === "refine") {
    reply =
      `${reply}\n\nNon ho capito la modifica. Ripeti cosa vuoi cambiare, oppure scrivi annulla.`;
  }

  revalidatePath("/command-center");

  return {
    success: true,
    data: {
      reply,
      intentSummary: interpreted.intent_summary,
      pendingProposal: nextPending,
      executed: false,
      clearedPending: false,
    },
  };
}
