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
import {
  enrichCampaignProposal,
} from "./campaign-proposal-builder";
import { enrichMissionProposal } from "./mission-proposal-builder";
import { enrichCharacterProposal,
} from "./character-proposal-builder";
import { enrichRelationshipProposal } from "./relationship-proposal-builder";
import { enrichSessionProposal } from "./session-proposal-builder";
import {
  enrichSessionCloseProposal,
  formatCloseMissingFieldsReply,
  hasBlockingCloseMissingFields,
} from "./session-close-proposal-builder";
import { isLongCampaignType, type CampaignType } from "@/lib/campaign-type";
import { buildArchitectDescriptionFromDraft } from "@/lib/ai/campaign-text-generator";
import {
  isValidPreviewTextSelection,
  shouldTreatAsSelectionRefine,
  type PreviewTextSelection,
} from "./preview-text-selection";
import { applyDomainFallbackInterpreter } from "./domain-fallback-interpreter";
import { preparePendingInputForExecute } from "./proposal-input";
import { mergeCharacterInputFromSheet } from "./character-proposal-shared";
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
    return "Scrivi **sì** per generare l'immagine nell'anteprima, **no** per continuare senza, poi **conferma** per salvare.";
  }
  if (phase === "awaiting_avatar") {
    return "Scrivi **sì** per generare un ritratto, **no** per creare il PG senza avatar, oppure carica un'immagine nel pannello a destra.";
  }
  if (phase === "awaiting_architect") {
    return "Scrivi **sì** per generare i paletti IA (Architect) o **no** per creare solo la campagna.";
  }
  if (phase === "awaiting_sheet") {
    return "Compila il generatore scheda nel pannello a destra e premi **Usa questa scheda**, poi scrivi **conferma**.";
  }
  if (phase === "awaiting_close_info") {
    return "Rispondi alle domande mancanti in chat, poi scrivi **conferma** per chiudere la sessione o **annulla**.";
  }
  return "L'anteprima completa è nel pannello a destra. Scrivi **conferma**, **annulla** o descrivi modifiche.";
}

function pickCharacterName(input: Record<string, unknown>): string {
  return typeof input.name === "string" ? input.name.trim() : "";
}

function hasCharacterGeneratedSheet(pending: ChatPendingProposal): boolean {
  return Boolean(
    pending.characterMeta?.generatedSheet?.pdfBase64 ||
      pending.input.generatedSheetPdfBase64
  );
}

function pickCampaignTitle(input: Record<string, unknown>): string {
  return typeof input.title === "string" ? input.title.trim() : "";
}

function shouldAskCampaignArchitect(pending: ChatPendingProposal): boolean {
  if (pending.action_name !== "campaign.create" || pending.phase === "awaiting_architect") {
    return false;
  }
  const draftType = pending.campaignMeta?.draft.type;
  const inputType = pending.input.type;
  const type = (typeof draftType === "string" ? draftType : typeof inputType === "string" ? inputType : "oneshot") as CampaignType;
  return isLongCampaignType(type);
}

async function executePendingProposal(
  pending: ChatPendingProposal,
  campaignId: string | null
): Promise<{ success: true; data?: unknown } | { success: false; error: string }> {
  const input = preparePendingInputForExecute(pending, campaignId);
  const result = await executeAction(pending.action_name, input, {
    actorType: "user",
    auditMetadata: {
      source: "ai_chat_confirm",
      rationale: pending.rationale,
    },
  });

  const resolvedCampaignId =
    typeof input.campaignId === "string" && input.campaignId.trim()
      ? input.campaignId.trim()
      : campaignId?.trim() || null;

  revalidatePath("/command-center");
  revalidatePath("/dashboard");
  if (resolvedCampaignId) revalidatePath(`/campaigns/${resolvedCampaignId}`);

  if (!result.success) {
    return { success: false, error: result.error };
  }
  return { success: true, data: result.data };
}

async function executeCharacterCreate(
  pending: ChatPendingProposal,
  campaignId: string | null,
  overrides?: { input?: Record<string, unknown> }
): Promise<{ success: true; data?: unknown } | { success: false; error: string }> {
  const baseInput = overrides?.input ?? preparePendingInputForExecute(pending, campaignId);
  const prepared =
    pending.characterMeta?.generatedSheet &&
    typeof baseInput.campaignId === "string" &&
    baseInput.campaignId.trim()
      ? mergeCharacterInputFromSheet(
          baseInput,
          baseInput.campaignId.trim(),
          pending.characterMeta.generatedSheet
        )
      : baseInput;

  if (!hasCharacterGeneratedSheet({ ...pending, input: prepared })) {
    return {
      success: false,
      error: "Collega una scheda PDF dal generatore prima di creare il personaggio.",
    };
  }

  const campaignKey =
    typeof prepared.campaignId === "string" ? prepared.campaignId.trim() : campaignId?.trim() || "";
  if (!campaignKey) {
    return { success: false, error: "Seleziona una campagna nel filtro prima di salvare il personaggio." };
  }

  return executePendingProposal({ ...pending, input: prepared }, campaignKey);
}

async function finalizeCampaignCreation(
  pending: ChatPendingProposal,
  options: { withArchitect: boolean }
): Promise<{ success: true; title: string; campaignId?: string } | { success: false; error: string }> {
  const exec = await executePendingProposal(pending, null);
  if (!exec.success) {
    return { success: false, error: exec.error };
  }

  const created = exec.data as { id?: string; name?: string } | undefined;
  const title = pickCampaignTitle(pending.input) || created?.name || "Campagna";
  const newCampaignId = created?.id;

  if (options.withArchitect && newCampaignId && pending.campaignMeta?.draft) {
    const description = buildArchitectDescriptionFromDraft(pending.campaignMeta.draft);
    const architect = await executeAction(
      "campaign.aiContext.generate",
      { campaignId: newCampaignId, description },
      {
        actorType: "user",
        auditMetadata: { source: "ai_chat_confirm", rationale: "Paletti IA post-creazione campagna" },
      }
    );
    if (!architect.success) {
      return {
        success: false,
        error: `Campagna creata ma generazione paletti IA fallita: ${architect.error}`,
      };
    }
    revalidatePath(`/campaigns/${newCampaignId}`);
  }

  return { success: true, title, campaignId: newCampaignId };
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

async function generateCharacterPortrait(
  campaignId: string,
  pending: ChatPendingProposal
): Promise<{ imageUrl: string } | { error: string }> {
  const name = pickCharacterName(pending.input);
  const story =
    pending.characterMeta?.storyDraft.characterStory ||
    (typeof pending.input.background === "string" ? pending.input.background : "");
  if (!story.trim()) {
    return { error: "Serve una descrizione narrativa per generare il ritratto." };
  }

  const res = await generateContextualPortraitAction(campaignId, story, "npc", {
    entityTitle: name || "Personaggio",
  });
  if (!res.success) return { error: res.message };
  return { imageUrl: res.publicUrl };
}

function pickWikiTitle(input: Record<string, unknown>): string {
  const title = input.title ?? input.name;
  return typeof title === "string" ? title.trim() : "";
}

function pickWikiType(input: Record<string, unknown>): string {
  return typeof input.type === "string" ? input.type.trim() : "npc";
}

function hasWikiContextualImage(pending: ChatPendingProposal): boolean {
  const url = pending.input.imageUrl ?? pending.preview_payload.imageUrl;
  return typeof url === "string" && url.trim().length > 0;
}

function shouldOfferWikiContextualImage(pending: ChatPendingProposal): boolean {
  if (pending.action_name !== "wiki.entity.create") return false;
  return supportsWikiContextualImage(pickWikiType(pending.input));
}

function applyWikiImageOfferPhase(pending: ChatPendingProposal): ChatPendingProposal {
  if (!shouldOfferWikiContextualImage(pending)) return { ...pending, phase: pending.phase ?? "text" };
  if (hasWikiContextualImage(pending)) return { ...pending, phase: "text" };
  return { ...pending, phase: "awaiting_image" };
}

function wikiImageOfferReply(title: string): string {
  return `Testo pronto per **${title || "la voce wiki"}**.\n\nVuoi che generi anche un'immagine contestuale? Comparirà sotto il testo nell'anteprima a destra prima del salvataggio.\n\nScrivi **sì** o **no**.`;
}

function finalizeWikiProposalAfterText(
  pending: ChatPendingProposal,
  enriched: PreviewedProposal,
  wikiMeta: ChatPendingProposal["wikiMeta"]
): { nextPending: ChatPendingProposal; replyExtra: string | null } {
  const base: ChatPendingProposal = {
    ...enriched,
    rationale: pending.rationale,
    wikiMeta,
    input: { ...enriched.input },
    preview_payload: { ...enriched.preview_payload },
  };
  delete base.input.imageUrl;
  delete base.preview_payload.imageUrl;

  const nextPending = applyWikiImageOfferPhase(base);
  const replyExtra =
    nextPending.phase === "awaiting_image"
      ? wikiImageOfferReply(pickWikiTitle(nextPending.input))
      : null;

  return { nextPending, replyExtra };
}

async function tryEnrichWikiProposal(
  campaignId: string,
  userMessage: string,
  proposal: PreviewedProposal,
  options?: {
    refine?: boolean;
    pending?: ChatPendingProposal | null;
    extraParams?: import("@/lib/ai/wiki-text-generator").WikiMarkdownExtraParams;
    previewTextSelection?: PreviewTextSelection | null;
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
    previousVisibility:
      typeof proposal.input.visibility === "string" ? proposal.input.visibility : null,
    previewTextSelection: options?.previewTextSelection,
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
  const previewTextSelection = isValidPreviewTextSelection(input.previewTextSelection)
    ? input.previewTextSelection
    : null;
  const baseIntent = detectConversationIntent(message, Boolean(pending), pending?.phase);
  const intent = shouldTreatAsSelectionRefine(baseIntent, previewTextSelection, pending?.phase)
    ? "refine"
    : baseIntent;
  const selectionRefine = Boolean(previewTextSelection) && intent === "refine";

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
      previewTextSelection: previewTextSelection
        ? {
            field: previewTextSelection.field,
            excerptLength: previewTextSelection.selectedText.length,
          }
        : null,
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
          "Per procedere scrivi **sì** per generare l'immagine nell'anteprima, **no** per continuare senza immagine, oppure **annulla**.",
        intentSummary: "In attesa decisione immagine",
        pendingProposal: pending,
        executed: false,
        clearedPending: false,
      },
    };
  }

  if (pending?.phase === "awaiting_avatar" && intent === "refine") {
    return {
      success: true,
      data: {
        reply:
          "Per procedere scrivi **sì** per il ritratto AI, **no** per creare il PG senza avatar, carica un'immagine nel pannello, oppure **annulla**.",
        intentSummary: "In attesa decisione ritratto",
        pendingProposal: pending,
        executed: false,
        clearedPending: false,
      },
    };
  }

  if (intent === "image_no" && pending?.phase === "awaiting_avatar" && pending.action_name === "character.create") {
    const exec = await executeCharacterCreate(pending, campaignId);
    if (!exec.success) {
      return {
        success: true,
        data: {
          reply: `Non sono riuscito a creare il personaggio: ${exec.error}`,
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
        reply: `Personaggio **${pickCharacterName(pending.input)}** creato (senza avatar). Puoi aggiungere l'immagine dalla scheda campagna.`,
        intentSummary: "PG creato senza avatar",
        pendingProposal: null,
        executed: true,
        clearedPending: true,
      },
    };
  }

  if (intent === "image_yes" && pending?.phase === "awaiting_avatar" && pending.action_name === "character.create") {
    if (!campaignId) {
      return { success: false, error: "Seleziona una campagna per generare il ritratto." };
    }

    const imageResult = await generateCharacterPortrait(campaignId, pending);
    if ("error" in imageResult) {
      return {
        success: true,
        data: {
          reply: `Non sono riuscito a generare il ritratto: ${imageResult.error}\n\nScrivi **no** per creare senza avatar, carica un file nel pannello, oppure **annulla**.`,
          intentSummary: "Ritratto fallito",
          pendingProposal: pending,
          executed: false,
          clearedPending: false,
        },
      };
    }

    const withImage: ChatPendingProposal = {
      ...pending,
      input: { ...pending.input, imageUrl: imageResult.imageUrl },
      preview_payload: { ...pending.preview_payload, imageUrl: imageResult.imageUrl },
    };

    const exec = await executeCharacterCreate(withImage, campaignId, { input: withImage.input });
    if (!exec.success) {
      return {
        success: true,
        data: {
          reply: `Ritratto generato ma creazione fallita: ${exec.error}`,
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
        reply: `Personaggio **${pickCharacterName(withImage.input)}** creato con ritratto e scheda PDF.`,
        intentSummary: "PG creato con ritratto",
        pendingProposal: null,
        executed: true,
        clearedPending: true,
      },
    };
  }

  if (intent === "image_no" && pending?.phase === "awaiting_image" && pending.action_name === "wiki.entity.create") {
    return {
      success: true,
      data: {
        reply: `Ok, **${pickWikiTitle(pending.input)}** verrà salvata senza immagine. Scrivi **conferma** quando sei pronto, oppure descrivi modifiche al testo.`,
        intentSummary: "Wiki senza immagine",
        pendingProposal: { ...pending, phase: "text" },
        executed: false,
        clearedPending: false,
      },
    };
  }

  if (intent === "image_yes" && pending?.phase === "awaiting_image" && pending.action_name === "wiki.entity.create") {
    if (!campaignId) {
      return { success: false, error: "Seleziona una campagna per generare l'immagine." };
    }

    const imageResult = await generateWikiContextualImage(campaignId, pending);
    if ("error" in imageResult) {
      return {
        success: true,
        data: {
          reply: `Non sono riuscito a generare l'immagine: ${imageResult.error}\n\nScrivi **no** per continuare senza immagine, oppure **annulla**.`,
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
      phase: "text",
    };

    return {
      success: true,
      data: {
        reply: `Immagine generata per **${pickWikiTitle(withImage.input)}**. Vedi testo e immagine nell'anteprima a destra, poi scrivi **conferma** per salvare la voce wiki.`,
        intentSummary: "Immagine wiki in anteprima",
        pendingProposal: withImage,
        executed: false,
        clearedPending: false,
      },
    };
  }

  if (pending?.phase === "awaiting_architect" && intent === "refine") {
    return {
      success: true,
      data: {
        reply:
          "Per procedere scrivi **sì** per generare i paletti IA (Architect), **no** per creare solo la campagna, oppure **annulla**.",
        intentSummary: "In attesa decisione Architect",
        pendingProposal: pending,
        executed: false,
        clearedPending: false,
      },
    };
  }

  if (intent === "architect_no" && pending?.phase === "awaiting_architect") {
    const result = await finalizeCampaignCreation(pending, { withArchitect: false });
    if (!result.success) {
      return {
        success: true,
        data: {
          reply: `Non sono riuscito a creare la campagna: ${result.error}`,
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
        reply: `Campagna **${result.title}** creata. Vuoi preparare altro?`,
        intentSummary: "Campagna creata",
        pendingProposal: null,
        executed: true,
        clearedPending: true,
      },
    };
  }

  if (intent === "architect_yes" && pending?.phase === "awaiting_architect") {
    const result = await finalizeCampaignCreation(pending, { withArchitect: true });
    if (!result.success) {
      return {
        success: true,
        data: {
          reply: `${result.error}\n\nPuoi riprovare dalla scheda campagna o scrivere **annulla**.`,
          intentSummary: "Esecuzione parziale",
          pendingProposal: pending,
          executed: false,
          clearedPending: false,
        },
      };
    }
    return {
      success: true,
      data: {
        reply: `Campagna **${result.title}** creata con paletti IA (Architect). Vuoi preparare altro?`,
        intentSummary: "Campagna creata con Architect",
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

    if (pending.action_name === "wiki.entity.create" && pending.phase === "awaiting_image") {
      return {
        success: true,
        data: {
          reply: wikiImageOfferReply(pickWikiTitle(pending.input)),
          intentSummary: "In attesa decisione immagine",
          pendingProposal: pending,
          executed: false,
          clearedPending: false,
        },
      };
    }

    if (shouldAskCampaignArchitect(pending)) {
      return {
        success: true,
        data: {
          reply: `Bozza approvata per **${pickCampaignTitle(pending.input)}**.\n\nVuoi che generi anche i **paletti IA** (tono, magia, stile visivo) con l'Architect? Scrivi **sì** o **no**.`,
          intentSummary: "Bozza approvata — decisione Architect",
          pendingProposal: { ...pending, phase: "awaiting_architect" },
          executed: false,
          clearedPending: false,
        },
      };
    }

    if (pending.action_name === "character.create") {
      if (!hasCharacterGeneratedSheet(pending)) {
        return {
          success: true,
          data: {
            reply:
              "Prima di confermare devi completare il **generatore scheda** nel pannello a destra e premere **Usa questa scheda**.",
            intentSummary: "Scheda PDF mancante",
            pendingProposal: { ...pending, phase: "awaiting_sheet" },
            executed: false,
            clearedPending: false,
          },
        };
      }

      const hasManualAvatar =
        (typeof pending.input.avatarImageBase64 === "string" &&
          pending.input.avatarImageBase64.trim().length > 0) ||
        (typeof pending.input.imageUrl === "string" && pending.input.imageUrl.trim().length > 0);

      if (pending.phase !== "awaiting_avatar") {
        return {
          success: true,
          data: {
            reply: `Scheda approvata per **${pickCharacterName(pending.input)}**.\n\nVuoi un **ritratto** (AI o upload nel pannello)? Scrivi **sì**, **no** per creare senza avatar, oppure carica l'immagine e scrivi di nuovo **conferma**.`,
            intentSummary: "Scheda approvata — decisione ritratto",
            pendingProposal: { ...pending, phase: "awaiting_avatar" },
            executed: false,
            clearedPending: false,
          },
        };
      }

      const exec = await executeCharacterCreate(pending, campaignId);
      if (!exec.success) {
        return {
          success: true,
          data: {
            reply: `Non sono riuscito a creare il personaggio: ${exec.error}`,
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
          reply: hasManualAvatar
            ? `Personaggio **${pickCharacterName(pending.input)}** creato con scheda PDF e ritratto.`
            : `Personaggio **${pickCharacterName(pending.input)}** creato con scheda PDF.`,
          intentSummary: hasManualAvatar ? "PG creato con ritratto" : "PG creato",
          pendingProposal: null,
          executed: true,
          clearedPending: true,
        },
      };
    }

    if (pending.action_name === "session.close") {
      if (
        pending.sessionCloseMeta &&
        hasBlockingCloseMissingFields(pending.sessionCloseMeta.missingFields)
      ) {
        return {
          success: true,
          data: {
            reply: [
              formatCloseMissingFieldsReply(pending.sessionCloseMeta.missingFields),
              chatHintForProposal("awaiting_close_info"),
            ].join("\n\n"),
            intentSummary: "Dati mancanti per chiusura",
            pendingProposal: { ...pending, phase: "awaiting_close_info" },
            executed: false,
            clearedPending: false,
          },
        };
      }

      const closeExec = await executePendingProposal(pending, campaignId);
      if (!closeExec.success) {
        return {
          success: true,
          data: {
            reply: `Non sono riuscito a chiudere la sessione: ${closeExec.error}`,
            intentSummary: "Esecuzione fallita",
            pendingProposal: pending,
            executed: false,
            clearedPending: false,
          },
        };
      }

      const label = pending.sessionCloseMeta?.sessionLabel ?? "Sessione";
      const economyHint = pending.sessionCloseMeta?.missingFields.some(
        (f: { id: string }) => f.id === "economy_wizard"
      )
        ? `\n\nPer economia avanzata e trofei: ${pending.sessionCloseMeta?.wizardEconomyUrl}`
        : "";
      return {
        success: true,
        data: {
          reply: `**${label}** chiusa. Riassunto e premi salvati.${economyHint}`,
          intentSummary: "Sessione chiusa",
          pendingProposal: null,
          executed: true,
          clearedPending: true,
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

    if (pending.action_name === "session.create") {
      const scheduled =
        typeof pending.preview_payload.scheduledAt === "string"
          ? pending.preview_payload.scheduledAt
          : `${pending.input.date ?? ""} ${pending.input.time ?? ""}`.trim();
      const chapter =
        typeof pending.input.chapterTitle === "string" ? pending.input.chapterTitle : null;
      return {
        success: true,
        data: {
          reply: `Sessione programmata per **${scheduled}**${chapter ? ` — ${chapter}` : ""}. I giocatori la vedranno in calendario campagna.`,
          intentSummary: "Sessione creata",
          pendingProposal: null,
          executed: true,
          clearedPending: true,
        },
      };
    }

    if (pending.action_name === "wiki.relationship.create") {
      const sourceName =
        typeof pending.input.sourceName === "string" ? pending.input.sourceName : "Sorgente";
      const targetName =
        typeof pending.input.targetName === "string" ? pending.input.targetName : "Bersaglio";
      const label = typeof pending.input.label === "string" ? pending.input.label : "relazione";
      return {
        success: true,
        data: {
          reply: `Collegamento creato: **${sourceName}** —[${label}]→ **${targetName}**. Visibile nella mappa concettuale.`,
          intentSummary: "Relazione creata",
          pendingProposal: null,
          executed: true,
          clearedPending: true,
        },
      };
    }

    if (pending.action_name === "wiki.entity.create") {
      const title = pickWikiTitle(pending.input);
      const withImage = hasWikiContextualImage(pending);
      return {
        success: true,
        data: {
          reply: `Voce wiki **${title}** creata${withImage ? " con immagine contestuale" : ""}. Vuoi preparare altro?`,
          intentSummary: withImage ? "Wiki creata con immagine" : "Wiki creata",
          pendingProposal: null,
          executed: true,
          clearedPending: true,
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

  if (intent === "refine" && pending?.campaignMeta && pending.phase !== "awaiting_architect" && pending.phase !== "awaiting_image" && pending.phase !== "awaiting_avatar" && pending.phase !== "awaiting_sheet") {
    const enriched = await enrichCampaignProposal(message, pending, {
      refine: true,
      campaignMeta: pending.campaignMeta,
      previewTextSelection,
    });

    if (!enriched.ok) {
      return { success: false, error: enriched.error };
    }

    const nextPending: ChatPendingProposal = {
      ...enriched.proposal,
      rationale: pending.rationale,
      phase: "text",
      campaignMeta: enriched.campaignMeta,
    };

    return {
      success: true,
      data: {
        reply: ["Ho aggiornato la proposta campagna.", chatHintForProposal("text")].join("\n\n"),
        intentSummary: selectionRefine ? "Modifica mirata (campagna)" : "Bozza campagna aggiornata",
        pendingProposal: nextPending,
        executed: false,
        clearedPending: false,
      },
    };
  }

  if (intent === "refine" && pending?.wikiMeta && pending.phase !== "awaiting_image" && pending.phase !== "awaiting_architect" && pending.phase !== "awaiting_avatar" && pending.phase !== "awaiting_sheet") {
    if (!campaignId) {
      return {
        success: false,
        error: "Seleziona una campagna nel filtro per affinare voci wiki con l'AI contestuale.",
      };
    }

    const enriched = await tryEnrichWikiProposal(campaignId, message, pending, {
      refine: true,
      pending,
      previewTextSelection,
    });

    if (enriched.error) {
      return { success: false, error: enriched.error };
    }

    const { nextPending, replyExtra } = finalizeWikiProposalAfterText(
      pending,
      enriched.proposal,
      enriched.wikiMeta
    );

    const reply = [
      "Ho aggiornato la proposta in base alle tue indicazioni.",
      replyExtra,
      chatHintForProposal(nextPending.phase ?? "text"),
    ]
      .filter(Boolean)
      .join("\n\n");

    revalidatePath("/command-center");

    return {
      success: true,
      data: {
        reply,
        intentSummary: replyExtra
          ? "Testo wiki — decisione immagine"
          : selectionRefine
            ? "Modifica mirata (wiki)"
            : "Bozza wiki aggiornata",
        pendingProposal: nextPending,
        executed: false,
        clearedPending: false,
      },
    };
  }

  if (
    intent === "refine" &&
    pending?.missionMeta &&
    pending.action_name === "mission.create" &&
    pending.phase !== "awaiting_image" &&
    pending.phase !== "awaiting_architect" &&
    pending.phase !== "awaiting_avatar" &&
    pending.phase !== "awaiting_sheet"
  ) {
    if (!campaignId) {
      return {
        success: false,
        error: "Seleziona una campagna nel filtro per affinare missioni con l'AI contestuale.",
      };
    }

    const enriched = await enrichMissionProposal(campaignId, message, pending, {
      refine: true,
      missionMeta: pending.missionMeta,
      previewTextSelection,
    });

    if (!enriched.ok) {
      return { success: false, error: enriched.error };
    }

    const nextPending: ChatPendingProposal = {
      ...enriched.proposal,
      rationale: pending.rationale,
      phase: "text",
      missionMeta: enriched.missionMeta,
    };

    return {
      success: true,
      data: {
        reply: ["Ho aggiornato la missione in base alle tue indicazioni.", chatHintForProposal("text")].join(
          "\n\n"
        ),
        intentSummary: selectionRefine ? "Modifica mirata (missione)" : "Bozza missione aggiornata",
        pendingProposal: nextPending,
        executed: false,
        clearedPending: false,
      },
    };
  }

  if (
    (intent === "refine" || pending?.phase === "awaiting_close_info") &&
    pending?.sessionCloseMeta &&
    pending.action_name === "session.close" &&
    pending.phase !== "awaiting_image" &&
    pending.phase !== "awaiting_architect" &&
    pending.phase !== "awaiting_avatar" &&
    pending.phase !== "awaiting_sheet"
  ) {
    if (!campaignId) {
      return {
        success: false,
        error: "Seleziona una campagna nel filtro per chiudere sessioni.",
      };
    }

    const enriched = await enrichSessionCloseProposal(campaignId, message, pending, {
      refine: true,
      sessionCloseMeta: pending.sessionCloseMeta,
      previewTextSelection,
    });

    if (!enriched.ok) {
      return { success: false, error: enriched.error };
    }

    const nextPending: ChatPendingProposal = {
      ...enriched.proposal,
      rationale: pending.rationale,
      phase: enriched.phase,
      sessionCloseMeta: enriched.sessionCloseMeta,
    };

    const missingReply = hasBlockingCloseMissingFields(enriched.sessionCloseMeta.missingFields)
      ? formatCloseMissingFieldsReply(enriched.sessionCloseMeta.missingFields)
      : null;

    return {
      success: true,
      data: {
        reply: [
          missingReply ?? "Ho aggiornato il debrief di chiusura sessione.",
          chatHintForProposal(enriched.phase),
        ].join("\n\n"),
        intentSummary:
          enriched.phase === "awaiting_close_info"
            ? "Dati mancanti"
            : selectionRefine
              ? "Modifica mirata (chiusura)"
              : "Bozza chiusura aggiornata",
        pendingProposal: nextPending,
        executed: false,
        clearedPending: false,
      },
    };
  }

  if (
    intent === "refine" &&
    pending?.sessionMeta &&
    pending.action_name === "session.create" &&
    pending.phase !== "awaiting_image" &&
    pending.phase !== "awaiting_architect" &&
    pending.phase !== "awaiting_avatar" &&
    pending.phase !== "awaiting_sheet"
  ) {
    if (!campaignId) {
      return {
        success: false,
        error: "Seleziona una campagna nel filtro per affinare sessioni.",
      };
    }

    const enriched = await enrichSessionProposal(campaignId, message, pending, {
      refine: true,
      sessionMeta: pending.sessionMeta,
    });

    if (!enriched.ok) {
      return { success: false, error: enriched.error };
    }

    const nextPending: ChatPendingProposal = {
      ...enriched.proposal,
      rationale: pending.rationale,
      phase: "text",
      sessionMeta: enriched.sessionMeta,
    };

    return {
      success: true,
      data: {
        reply: ["Ho aggiornato la sessione.", chatHintForProposal("text")].join("\n\n"),
        intentSummary: "Bozza sessione aggiornata",
        pendingProposal: nextPending,
        executed: false,
        clearedPending: false,
      },
    };
  }

  if (
    intent === "refine" &&
    pending?.relationshipMeta &&
    pending.action_name === "wiki.relationship.create" &&
    pending.phase !== "awaiting_image" &&
    pending.phase !== "awaiting_architect" &&
    pending.phase !== "awaiting_avatar" &&
    pending.phase !== "awaiting_sheet"
  ) {
    if (!campaignId) {
      return {
        success: false,
        error: "Seleziona una campagna nel filtro per affinare relazioni wiki.",
      };
    }

    const enriched = await enrichRelationshipProposal(campaignId, message, pending, {
      refine: true,
      relationshipMeta: pending.relationshipMeta,
    });

    if (!enriched.ok) {
      return { success: false, error: enriched.error };
    }

    const nextPending: ChatPendingProposal = {
      ...enriched.proposal,
      rationale: pending.rationale,
      phase: "text",
      relationshipMeta: enriched.relationshipMeta,
    };

    return {
      success: true,
      data: {
        reply: ["Ho aggiornato la relazione.", chatHintForProposal("text")].join("\n\n"),
        intentSummary: "Bozza relazione aggiornata",
        pendingProposal: nextPending,
        executed: false,
        clearedPending: false,
      },
    };
  }

  if (
    intent === "refine" &&
    pending?.characterMeta &&
    pending.action_name === "character.create" &&
    pending.phase !== "awaiting_image" &&
    pending.phase !== "awaiting_architect" &&
    pending.phase !== "awaiting_avatar"
  ) {
    if (!campaignId) {
      return {
        success: false,
        error: "Seleziona una campagna nel filtro per affinare personaggi con l'AI contestuale.",
      };
    }

    const enriched = await enrichCharacterProposal(campaignId, message, pending, {
      refine: true,
      characterMeta: pending.characterMeta,
      previewTextSelection,
    });

    if (!enriched.ok) {
      return { success: false, error: enriched.error };
    }

    const nextPending: ChatPendingProposal = {
      ...enriched.proposal,
      rationale: pending.rationale,
      phase: hasCharacterGeneratedSheet({
        ...enriched.proposal,
        characterMeta: enriched.characterMeta,
      })
        ? "text"
        : "awaiting_sheet",
      characterMeta: enriched.characterMeta,
    };

    return {
      success: true,
      data: {
        reply: [
          "Ho aggiornato la storia del personaggio.",
          chatHintForProposal(nextPending.phase),
        ].join("\n\n"),
        intentSummary: selectionRefine ? "Modifica mirata (storia PG)" : "Storia PG aggiornata",
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

      const finalized = finalizeWikiProposalAfterText(
        { ...nextPending, rationale: nextPending.rationale ?? previews[0]?.rationale ?? null },
        enriched.proposal,
        enriched.wikiMeta
      );

      nextPending = finalized.nextPending;

      if (finalized.replyExtra) {
        interpreted = {
          ...interpreted,
          reply: [interpreted.reply, finalized.replyExtra].filter(Boolean).join("\n\n"),
        };
      }
    } else if (nextPending.action_name === "wiki.entity.create" && !campaignId) {
      return {
        success: false,
        error: "Seleziona una campagna nel filtro per creare voci wiki con l'AI contestuale.",
      };
    } else if (nextPending.action_name === "campaign.create") {
      const enriched = await enrichCampaignProposal(message, nextPending, {
        refine: intent === "refine",
        campaignMeta: pending?.campaignMeta ?? null,
      });

      if (!enriched.ok) {
        return { success: false, error: enriched.error };
      }

      nextPending = {
        ...enriched.proposal,
        phase: "text",
        campaignMeta: enriched.campaignMeta,
      };
    } else if (nextPending.action_name === "mission.create") {
      if (!campaignId) {
        return {
          success: false,
          error: "Seleziona una campagna nel filtro per creare missioni con l'AI contestuale.",
        };
      }

      const enriched = await enrichMissionProposal(campaignId, message, nextPending, {
        refine: intent === "refine",
        missionMeta: pending?.missionMeta ?? null,
      });

      if (!enriched.ok) {
        return { success: false, error: enriched.error };
      }

      nextPending = {
        ...enriched.proposal,
        phase: "text",
        missionMeta: enriched.missionMeta,
      };
    } else if (nextPending.action_name === "session.create") {
      if (!campaignId) {
        return {
          success: false,
          error: "Seleziona una campagna nel filtro per programmare sessioni.",
        };
      }

      const enriched = await enrichSessionProposal(campaignId, message, nextPending, {
        refine: intent === "refine",
        sessionMeta: pending?.sessionMeta ?? null,
      });

      if (!enriched.ok) {
        return { success: false, error: enriched.error };
      }

      nextPending = {
        ...enriched.proposal,
        phase: "text",
        sessionMeta: enriched.sessionMeta,
      };
    } else if (nextPending.action_name === "session.close") {
      if (!campaignId) {
        return {
          success: false,
          error: "Seleziona una campagna nel filtro per chiudere sessioni.",
        };
      }

      const enriched = await enrichSessionCloseProposal(campaignId, message, nextPending, {
        refine: intent === "refine",
        sessionCloseMeta: pending?.sessionCloseMeta ?? null,
      });

      if (!enriched.ok) {
        return { success: false, error: enriched.error };
      }

      nextPending = {
        ...enriched.proposal,
        phase: enriched.phase,
        sessionCloseMeta: enriched.sessionCloseMeta,
      };
    } else if (nextPending.action_name === "character.create") {
      if (!campaignId) {
        return {
          success: false,
          error: "Seleziona una campagna nel filtro per creare personaggi con l'AI contestuale.",
        };
      }

      const enriched = await enrichCharacterProposal(campaignId, message, nextPending, {
        refine: intent === "refine",
        characterMeta: pending?.characterMeta ?? null,
      });

      if (!enriched.ok) {
        return { success: false, error: enriched.error };
      }

      nextPending = {
        ...enriched.proposal,
        phase: "awaiting_sheet",
        characterMeta: enriched.characterMeta,
      };
    } else if (nextPending.action_name === "wiki.relationship.create") {
      if (!campaignId) {
        return {
          success: false,
          error: "Seleziona una campagna nel filtro per creare relazioni nella mappa concettuale.",
        };
      }

      const enriched = await enrichRelationshipProposal(campaignId, message, nextPending, {
        refine: intent === "refine",
        relationshipMeta: pending?.relationshipMeta ?? null,
      });

      if (!enriched.ok) {
        return { success: false, error: enriched.error };
      }

      nextPending = {
        ...enriched.proposal,
        phase: "text",
        relationshipMeta: enriched.relationshipMeta,
      };
    }
  }

  let reply = interpreted.reply;
  if (nextPending) {
    if (nextPending.sessionCloseMeta) {
      const missingReply = hasBlockingCloseMissingFields(
        nextPending.sessionCloseMeta.missingFields
      )
        ? formatCloseMissingFieldsReply(nextPending.sessionCloseMeta.missingFields)
        : null;
      const preview = nextPending.sessionCloseMeta.chatMessages.at(-1)?.content;
      reply = [reply, preview, missingReply].filter(Boolean).join("\n\n");
    }
    reply = `${reply}\n\n${chatHintForProposal(nextPending.phase ?? "text")}`;
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
