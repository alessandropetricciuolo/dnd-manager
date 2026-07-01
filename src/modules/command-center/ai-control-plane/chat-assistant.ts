import { revalidatePath } from "next/cache";
import { generateMagicDraftImageAction } from "@/lib/actions/ai-wiki-chain";
import { generateContextualPortraitAction } from "@/lib/actions/ai-generator";
import { isAiDraftAllowedAction } from "../actions/action-catalog";
import { executeAction, resolveActionContext } from "../actions/registry";
import { assertCanProposeDrafts } from "./autonomy";
import { resolveCommandContext } from "./context-resolver";
import { detectConversationIntent } from "./conversation-intent";
import type { ChatPendingProposalPayload } from "./draft-assistant.types";
import { interpretUserMessage } from "./interpreter";
import { previewInterpreterProposals, type PreviewedProposal } from "./preview-proposals";
import type { RunAiChatAssistantParams } from "./draft-assistant.types";
import {
  enrichWikiEntityProposal,
  isWikiMarkdownEntityType,
  supportsWikiContextualImage,
} from "./wiki-proposal-builder";
import { applyDomainFallbackInterpreter } from "./domain-fallback-interpreter";
import { enrichDomainProposal } from "./proposal-enricher";
import type { AiInterpreterResult } from "../types/ai-proposal";

export type ChatPendingProposal = ChatPendingProposalPayload;

export type AiChatAssistantResult = {
  reply: string;
  intentSummary: string;
  pendingProposal: ChatPendingProposal | null;
  executed: boolean;
  clearedPending: boolean;
};

function chatHintForProposal(phase?: ChatPendingProposal["phase"]): string {
  if (phase === "awaiting_image") {
    return "Scrivi **sì** per l'immagine contestuale o **no** per creare solo il testo.";
  }
  return "L'anteprima completa è nel pannello a destra. Scrivi **conferma**, **annulla** o descrivi modifiche.";
}

async function executePendingProposal(
  pending: ChatPendingProposal,
  campaignId: string | null
): Promise<{ success: true } | { success: false; error: string }> {
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
    return { success: false, error: result.error };
  }
  return { success: true };
}

async function generateWikiContextualImage(
  campaignId: string,
  pending: ChatPendingProposal
): Promise<{ imageUrl: string } | { error: string }> {
  const wikiMeta = pending.wikiMeta;
  if (!wikiMeta) return { error: "Metadati wiki mancanti." };

  const entityType = wikiMeta.entityType;
  const title = wikiMeta.entityTitle;
  const content = wikiMeta.markdownDraft.description;

  if (entityType === "npc" || entityType === "location") {
    const res = await generateMagicDraftImageAction(
      campaignId,
      entityType,
      title,
      content,
      wikiMeta.userPrompt
    );
    if (!res.success) return { error: res.message };
    return { imageUrl: res.imageUrl };
  }

  if (entityType === "monster") {
    const res = await generateContextualPortraitAction(
      campaignId,
      content,
      "monster",
      { entityTitle: title }
    );
    if (!res.success) return { error: res.message };
    return { imageUrl: res.publicUrl };
  }

  return { error: "Tipo entità non supportato per immagine contestuale." };
}

function pickWikiTitle(input: Record<string, unknown>): string {
  const title = input.title ?? input.name;
  return typeof title === "string" ? title.trim() : "";
}

function pickWikiType(input: Record<string, unknown>): string {
  return typeof input.type === "string" ? input.type.trim() : "npc";
}

async function tryEnrichWikiProposal(
  campaignId: string,
  userMessage: string,
  proposal: PreviewedProposal,
  options?: {
    refine?: boolean;
    pending?: ChatPendingProposal | null;
    extraParams?: import("@/lib/ai/wiki-text-generator").WikiMarkdownExtraParams;
  }
): Promise<{
  proposal: PreviewedProposal;
  wikiMeta?: ChatPendingProposal["wikiMeta"];
  assistantMessage?: string;
  error?: string;
}> {
  const entityType = pickWikiType(proposal.input);
  const title = pickWikiTitle(proposal.input) || options?.pending?.wikiMeta?.entityTitle || "";

  if (!isWikiMarkdownEntityType(entityType)) {
    return { proposal };
  }

  const enriched = await enrichWikiEntityProposal(campaignId, userMessage, entityType, title, {
    refine: options?.refine,
    wikiMeta: options?.pending?.wikiMeta ?? null,
    extraParams: options?.extraParams,
  });

  if (!enriched.ok) {
    return { proposal, error: enriched.error };
  }

  return {
    proposal: {
      ...enriched.proposal,
      rationale: proposal.rationale,
    },
    wikiMeta: enriched.wikiMeta,
    assistantMessage: enriched.assistantMessage,
  };
}
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
  const intent = detectConversationIntent(message, Boolean(pending), pending?.phase);

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
      pendingPhase: pending?.phase ?? null,
    },
    created_by: ctx.userId,
  });

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

  if (pending?.phase === "awaiting_image" && intent === "refine") {
    return {
      success: true,
      data: {
        reply:
          "Per procedere scrivi **sì** per generare l'immagine contestuale, **no** per creare solo la voce wiki, oppure **annulla**.",
        intentSummary: "In attesa decisione immagine",
        pendingProposal: pending,
        executed: false,
        clearedPending: false,
      },
    };
  }

  if (intent === "image_no" && pending?.phase === "awaiting_image") {
    const exec = await executePendingProposal(pending, campaignId);
    if (!exec.success) {
      return {
        success: true,
        data: {
          reply: `Non sono riuscito a creare la voce wiki: ${exec.error}`,
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
        reply: `Voce wiki **${pickWikiTitle(pending.input)}** creata senza immagine. Vuoi preparare altro?`,
        intentSummary: "Wiki creata (solo testo)",
        pendingProposal: null,
        executed: true,
        clearedPending: true,
      },
    };
  }

  if (intent === "image_yes" && pending?.phase === "awaiting_image") {
    if (!campaignId) {
      return { success: false, error: "Seleziona una campagna per generare l'immagine." };
    }

    const imageResult = await generateWikiContextualImage(campaignId, pending);
    if ("error" in imageResult) {
      return {
        success: true,
        data: {
          reply: `Non sono riuscito a generare l'immagine: ${imageResult.error}\n\nScrivi **no** per creare la voce senza immagine, oppure **annulla**.`,
          intentSummary: "Generazione immagine fallita",
          pendingProposal: pending,
          executed: false,
          clearedPending: false,
        },
      };
    }

    const withImage: ChatPendingProposal = {
      ...pending,
      input: { ...pending.input, imageUrl: imageResult.imageUrl },
      preview_payload: {
        ...pending.preview_payload,
        imageUrl: imageResult.imageUrl,
      },
    };

    const exec = await executePendingProposal(withImage, campaignId);
    if (!exec.success) {
      return {
        success: true,
        data: {
          reply: `Immagine generata ma creazione fallita: ${exec.error}`,
          intentSummary: "Esecuzione fallita",
          pendingProposal: withImage,
          executed: false,
          clearedPending: false,
        },
      };
    }

    return {
      success: true,
      data: {
        reply: `Voce wiki **${pickWikiTitle(withImage.input)}** creata con immagine contestuale.\n\nAnteprima: ${imageResult.imageUrl}\n\nVuoi preparare altro?`,
        intentSummary: "Wiki creata con immagine",
        pendingProposal: null,
        executed: true,
        clearedPending: true,
      },
    };
  }

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

    const wikiType = pickWikiType(pending.input);
    const awaitingImage =
      pending.action_name === "wiki.entity.create" &&
      pending.phase !== "awaiting_image" &&
      supportsWikiContextualImage(wikiType);

    if (awaitingImage) {
      return {
        success: true,
        data: {
          reply: `Testo approvato per **${pickWikiTitle(pending.input)}**.\n\nVuoi che generi anche un'immagine contestuale (come nel form wiki)? Scrivi **sì** o **no**.`,
          intentSummary: "Testo approvato — decisione immagine",
          pendingProposal: { ...pending, phase: "awaiting_image" },
          executed: false,
          clearedPending: false,
        },
      };
    }

    const exec = await executePendingProposal(pending, campaignId);
    if (!exec.success) {
      return {
        success: true,
        data: {
          reply: `Non sono riuscito ad applicare l'azione: ${exec.error}\n\nPuoi chiedere modifiche o scrivere annulla.`,
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

  if (intent === "refine" && pending?.wikiMeta && pending.phase !== "awaiting_image") {
    if (!campaignId) {
      return {
        success: false,
        error: "Seleziona una campagna nel filtro per affinare voci wiki con l'AI contestuale.",
      };
    }

    const enriched = await tryEnrichWikiProposal(campaignId, message, pending, {
      refine: true,
      pending,
    });

    if (enriched.error) {
      return { success: false, error: enriched.error };
    }

    const nextPending: ChatPendingProposal = {
      ...enriched.proposal,
      rationale: pending.rationale,
      phase: "text",
      wikiMeta: enriched.wikiMeta,
    };

    const reply = [
      "Ho aggiornato la proposta in base alle tue indicazioni.",
      chatHintForProposal("text"),
    ].join("\n\n");

    revalidatePath("/command-center");

    return {
      success: true,
      data: {
        reply,
        intentSummary: "Bozza wiki aggiornata",
        pendingProposal: nextPending,
        executed: false,
        clearedPending: false,
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

  let detectedExtraParams: import("@/lib/ai/wiki-text-generator").WikiMarkdownExtraParams | undefined;

  const fallback = applyDomainFallbackInterpreter(
    message,
    campaignId,
    input.recentUserMessages,
    interpreted
  );
  interpreted = fallback.interpreted;
  detectedExtraParams = fallback.detectedExtraParams;

  let previews = await previewInterpreterProposals(interpreted.proposals, campaignId);
  let nextPending: ChatPendingProposal | null = previews[0]
    ? { ...previews[0], phase: "text" as const }
    : null;

  if (nextPending) {
    const enrichableActions = new Set([
      "wiki.entity.create",
      "mission.create",
      "character.create",
      "campaign.create",
    ]);

    if (
      nextPending.action_name === "wiki.entity.create" &&
      campaignId &&
      isWikiMarkdownEntityType(pickWikiType(nextPending.input))
    ) {
      const enriched = await tryEnrichWikiProposal(campaignId, message, nextPending, {
        refine: intent === "refine",
        pending,
        extraParams: detectedExtraParams,
      });

      if (enriched.error) {
        return { success: false, error: enriched.error };
      }

      nextPending = {
        ...enriched.proposal,
        phase: "text",
        wikiMeta: enriched.wikiMeta,
      };
    } else if (nextPending.action_name === "wiki.entity.create" && !campaignId) {
      return {
        success: false,
        error: "Seleziona una campagna nel filtro per creare voci wiki con l'AI contestuale.",
      };
    } else if (enrichableActions.has(nextPending.action_name)) {
      const enriched = await enrichDomainProposal(
        nextPending.action_name,
        campaignId,
        message,
        nextPending
      );

      if (!enriched.ok) {
        return { success: false, error: enriched.error };
      }

      nextPending = {
        ...enriched.proposal,
        phase: "text",
        preview_payload: {
          ...enriched.proposal.preview_payload,
          ...(enriched.assistantMessage ? { assistantPreview: enriched.assistantMessage } : {}),
        },
      };
    }
  }

  let reply = interpreted.reply;
  if (nextPending) {
    reply = `${reply}\n\n${chatHintForProposal("text")}`;
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
