"use server";

import {
  generateCharacterStoryFromPrompt,
  refineCharacterStoryFromPrompt,
  type CharacterAiStoryDraft,
} from "@/lib/ai/character-text-generator";
import { isPlaceholderCharacterName } from "@/lib/ai/contextual-names";
import { createSupabaseServerClient } from "@/utils/supabase/server";

export type CharacterTextChatTurn = {
  role: "user" | "assistant";
  content: string;
};

export type CharacterStoryChatResult =
  | {
      success: true;
      draft: CharacterAiStoryDraft;
      assistantMessage: string;
      resolvedName?: string;
    }
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

/**
 * Chat multi-turno per generare e affinare la storia narrativa di un PG.
 * Il background meccanico PHB resta nel form; qui si produce solo testo narrativo.
 */
export async function chatCharacterStoryAction(
  campaignId: string,
  characterName: string,
  messages: CharacterTextChatTurn[],
  currentDraft?: CharacterAiStoryDraft | null,
  options?: { seedStory?: string | null }
): Promise<CharacterStoryChatResult> {
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

  const name = characterName.trim() || "Nuovo personaggio";
  const isFirstTurn = messages.length === 1;

  try {
    if (isFirstTurn) {
      const seed = currentDraft?.characterStory?.trim() || options?.seedStory?.trim();
      const generated = seed
        ? await refineCharacterStoryFromPrompt(campaignId, last.content.trim(), seed, name)
        : await generateCharacterStoryFromPrompt(campaignId, last.content.trim(), name);

      if (!generated.ok) {
        return { success: false, message: generated.error };
      }

      const resolvedName =
        isPlaceholderCharacterName(name) &&
        generated.draft.generatedName &&
        !isPlaceholderCharacterName(generated.draft.generatedName)
          ? generated.draft.generatedName
          : name;

      return {
        success: true,
        draft: generated.draft,
        assistantMessage: generated.assistantMessage,
        resolvedName: resolvedName !== name ? resolvedName : undefined,
      };
    }

    if (!currentDraft?.characterStory?.trim()) {
      return { success: false, message: "Manca la bozza corrente per continuare la conversazione." };
    }

    const generated = await refineCharacterStoryFromPrompt(
      campaignId,
      last.content.trim(),
      currentDraft.characterStory,
      name
    );

    if (!generated.ok) {
      return { success: false, message: generated.error };
    }

    return {
      success: true,
      draft: generated.draft,
      assistantMessage: generated.assistantMessage,
    };
  } catch (err) {
    console.error("[chatCharacterStoryAction]", err);
    const msg = err instanceof Error ? err.message : "Errore imprevisto durante la chat AI.";
    return { success: false, message: msg };
  }
}
