"use server";

import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import {
  buildStructuredWikiTextSystemPrompt,
  formatStructuredWikiDraftForChat,
  parseStructuredWikiJson,
  type WikiAiTextGeneration,
  type WikiGeneratorEntityType,
} from "@/lib/ai/generator";
import { generateOpenRouterWikiTextMessages } from "@/lib/ai/openrouter-client";
import {
  generateWikiMarkdownAction,
  type ExtractedNpcTraits,
  type WikiMarkdownEntityType,
  type WikiMarkdownExtraParams,
} from "@/lib/ai/wiki-text-generator";

export type WikiTextChatRole = "user" | "assistant";

export type WikiTextChatTurn = {
  role: WikiTextChatRole;
  content: string;
};

export type WikiStructuredChatResult =
  | { success: true; draft: WikiAiTextGeneration; assistantMessage: string }
  | { success: false; message: string };

export type WikiMarkdownChatDraft = {
  description: string;
  statblock: string;
  npcTraits?: ExtractedNpcTraits;
};

export type WikiMarkdownChatResult =
  | { success: true; draft: WikiMarkdownChatDraft; assistantMessage: string }
  | { success: false; message: string };

async function assertGmAuth(): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false, message: "Devi essere autenticato." };
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "gm" && profile?.role !== "admin") {
    return { ok: false, message: "Solo GM e Admin possono usare la generazione AI." };
  }

  return { ok: true };
}

function formatMarkdownDraftForChat(description: string, statblock: string): string {
  const parts = [`**Descrizione**\n\n${description.trim()}`];
  if (statblock.trim()) {
    parts.push(`**Meccanica**\n\n${statblock.trim()}`);
  }
  return parts.join("\n\n---\n\n");
}

function buildMarkdownRefineSystemPrompt(
  entityName: string,
  entityType: WikiMarkdownEntityType,
  draft: WikiMarkdownChatDraft
): string {
  return [
    "Sei un editor wiki per D&D 5e. Il Master ti chiede di modificare una voce già generata.",
    `Entità: ${entityName} (${entityType})`,
    "Mantieni coerenza con le richieste precedenti nella conversazione.",
    "Rispondi SOLO in Markdown con due sezioni delimitate da [NARRATIVA] e [MECCANICA].",
    "Non aggiungere commenti meta, JSON o testo fuori dalle sezioni.",
    "",
    "TESTO ATTUALE [NARRATIVA]:",
    draft.description.trim() || "(vuoto)",
    "",
    "TESTO ATTUALE [MECCANICA]:",
    draft.statblock.trim() || "(vuoto)",
  ].join("\n");
}

function splitRefinedMarkdown(raw: string): { description: string; statblock: string } {
  const text = raw.trim();
  const narrIdx = text.search(/\[NARRATIVA\]/i);
  const mechIdx = text.search(/\[MECCANICA\]/i);
  if (narrIdx === -1 || mechIdx === -1) {
    return { description: text, statblock: "" };
  }
  const description = text.slice(narrIdx + "[NARRATIVA]".length, mechIdx).trim();
  const statblock = text.slice(mechIdx + "[MECCANICA]".length).trim();
  return { description, statblock };
}

/**
 * Chat multi-turno per la Bacchetta IA: genera e affina bozze JSON (title, content, hp, ac).
 */
export async function chatWikiStructuredTextAction(
  campaignId: string,
  entityType: WikiGeneratorEntityType,
  messages: WikiTextChatTurn[],
  options?: { excludeWikiEntityId?: string }
): Promise<WikiStructuredChatResult> {
  if (!campaignId) {
    return { success: false, message: "Campagna non valida." };
  }
  if (!messages.length) {
    return { success: false, message: "Scrivi un messaggio per iniziare." };
  }
  const last = messages[messages.length - 1];
  if (last.role !== "user" || !last.content.trim()) {
    return { success: false, message: "L'ultimo messaggio deve essere una richiesta del Master." };
  }

  const auth = await assertGmAuth();
  if (!auth.ok) return { success: false, message: auth.message };

  try {
    const admin = createSupabaseAdminClient();
    const system = await buildStructuredWikiTextSystemPrompt(admin, campaignId, entityType, options);
    if ("error" in system) {
      return { success: false, message: system.error };
    }

    const apiMessages = [
      { role: "system" as const, content: system.systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content.trim() })),
    ];

    const raw = await generateOpenRouterWikiTextMessages(apiMessages, { maxTokens: 2000 });
    const parsed = parseStructuredWikiJson(raw);
    if (!parsed.ok) {
      return { success: false, message: parsed.error };
    }

    return {
      success: true,
      draft: parsed.data,
      assistantMessage: formatStructuredWikiDraftForChat(parsed.data),
    };
  } catch (err) {
    console.error("[chatWikiStructuredTextAction]", err);
    const msg = err instanceof Error ? err.message : "Errore imprevisto durante la chat AI.";
    return { success: false, message: msg };
  }
}

/**
 * Chat multi-turno per l'Assistente IA wiki: prima generazione completa, poi affinamenti.
 */
export async function chatWikiMarkdownTextAction(
  campaignId: string,
  entityType: WikiMarkdownEntityType,
  entityName: string,
  messages: WikiTextChatTurn[],
  currentDraft?: WikiMarkdownChatDraft | null,
  extraParams: WikiMarkdownExtraParams = {}
): Promise<WikiMarkdownChatResult> {
  if (!campaignId) {
    return { success: false, message: "Campagna non valida." };
  }
  if (!entityName.trim()) {
    return { success: false, message: "Inserisci un titolo per la voce wiki." };
  }
  if (!messages.length) {
    return { success: false, message: "Scrivi un messaggio per iniziare." };
  }
  const last = messages[messages.length - 1];
  if (last.role !== "user" || !last.content.trim()) {
    return { success: false, message: "L'ultimo messaggio deve essere una richiesta del Master." };
  }

  const auth = await assertGmAuth();
  if (!auth.ok) return { success: false, message: auth.message };

  try {
    const isFirstTurn = messages.length === 1;

    if (isFirstTurn) {
      const result = await generateWikiMarkdownAction(
        campaignId,
        entityType,
        entityName,
        last.content.trim(),
        extraParams
      );
      if (!result.success) {
        return { success: false, message: result.message };
      }
      const draft: WikiMarkdownChatDraft = {
        description: result.description,
        statblock: result.statblock,
        npcTraits: result.npcTraits,
      };
      return {
        success: true,
        draft,
        assistantMessage: formatMarkdownDraftForChat(draft.description, draft.statblock),
      };
    }

    if (!currentDraft?.description?.trim()) {
      return { success: false, message: "Manca la bozza corrente per continuare la conversazione." };
    }

    const systemPrompt = buildMarkdownRefineSystemPrompt(entityName, entityType, currentDraft);
    const apiMessages = [
      { role: "system" as const, content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content.trim() })),
    ];

    const raw = await generateOpenRouterWikiTextMessages(apiMessages, { maxTokens: 2200 });
    const { description, statblock } = splitRefinedMarkdown(raw);
    if (!description.trim()) {
      return { success: false, message: "Il modello non ha restituito testo narrativo valido." };
    }

    const draft: WikiMarkdownChatDraft = {
      description,
      statblock: statblock || currentDraft.statblock,
      npcTraits: currentDraft.npcTraits,
    };

    return {
      success: true,
      draft,
      assistantMessage: formatMarkdownDraftForChat(draft.description, draft.statblock),
    };
  } catch (err) {
    console.error("[chatWikiMarkdownTextAction]", err);
    const msg = err instanceof Error ? err.message : "Errore imprevisto durante la chat AI.";
    return { success: false, message: msg };
  }
}
