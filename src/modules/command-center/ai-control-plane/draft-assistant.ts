import { revalidatePath } from "next/cache";
import { resolveActionContext } from "../actions/registry";
import { assertCanProposeDrafts } from "./autonomy";
import { resolveCommandContext } from "./context-resolver";
import { interpretUserMessage } from "./interpreter";
import { buildProposalsFromInterpreter } from "./proposal-builder";
import type { AiDraftAssistantResult } from "../types/ai-proposal";
import type { RunAiDraftAssistantParams } from "./draft-assistant.types";

export async function runAiDraftAssistant(
  input: RunAiDraftAssistantParams
): Promise<{ success: true; data: AiDraftAssistantResult } | { success: false; error: string }> {
  assertCanProposeDrafts();

  const message = input.message.trim();
  if (!message) return { success: false, error: "Scrivi un messaggio per l'assistente." };

  const resolved = await resolveActionContext("ai");
  if (!resolved.ok) return { success: false, error: resolved.error };
  const ctx = resolved.ctx;

  const campaignId = input.campaignId?.trim() || null;
  const source = input.source ?? "text";
  const transcript =
    source === "voice" ? (input.transcript?.trim() || message) : input.transcript?.trim() || null;

  const { data: inputRow, error: inputErr } = await ctx.supabase
    .from("command_inputs")
    .insert({
      workspace_id: ctx.adapter.resolveWorkspaceId(),
      campaign_id: campaignId,
      source,
      raw_content: message,
      transcript,
      language: input.language ?? "it",
      metadata:
        source === "voice" && input.voiceMetadata
          ? { voice: input.voiceMetadata }
          : {},
      created_by: ctx.userId,
    })
    .select("id")
    .single();

  if (inputErr) {
    console.error("[runAiDraftAssistant] input", inputErr);
    return { success: false, error: inputErr.message };
  }

  const commandContext = await resolveCommandContext(
    ctx.supabase,
    ctx.userId,
    campaignId,
    message
  );

  let interpreted;
  try {
    interpreted = await interpretUserMessage(message, commandContext);
  } catch (err) {
    console.error("[runAiDraftAssistant] interpret", err);
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Servizio AI non disponibile. Verifica la configurazione API.",
    };
  }

  const proposals = await buildProposalsFromInterpreter(ctx, interpreted.proposals, {
    campaignId,
    userInputId: inputRow.id,
    noteId: input.noteId ?? null,
  });

  revalidatePath("/command-center");

  return {
    success: true,
    data: {
      reply: interpreted.reply,
      intentSummary: interpreted.intent_summary,
      inputId: inputRow.id,
      proposals,
    },
  };
}
