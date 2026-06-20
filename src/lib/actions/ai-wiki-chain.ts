"use server";

import { createSupabaseServerClient } from "@/utils/supabase/server";
import { generateContextualText } from "@/lib/ai/generator";
import { generateContextualPortraitAction } from "@/lib/actions/ai-generator";

export type FullAiWikiEntityPayload = {
  title: string;
  content: string;
  hp: string | null;
  ac: string | null;
  imageUrl: string | null;
  entityType: "npc" | "location";
  /** Presente se la generazione immagine è fallita (il testo è comunque valido). */
  imageWarning?: string;
};

export type GenerateFullAiWikiEntityResult =
  | { success: true; data: FullAiWikiEntityPayload }
  | { success: false; message: string };

/** Riduce il markdown a testo leggibile per il prompt visivo (senza usare il prompt utente grezzo). */
function stripMarkdownForImagePrompt(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_`]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Prompt immagine: richiesta utente + corpo narrativo generato (ancora il soggetto). */
function buildImageDescriptionFromNarrative(userPrompt: string, narrativeDescription: string): string {
  const plainBody = stripMarkdownForImagePrompt(narrativeDescription);
  const request = userPrompt.trim();
  const parts = [request, plainBody].filter((p) => p.length > 0);
  const combined = parts.join("\n\n");
  const max = 3500;
  return combined.length <= max ? combined : `${combined.slice(0, max)}…`;
}

/**
 * Catena sequenziale: testo contestualizzato → immagine coerente col testo generato (nessun insert DB:
 * il Master conferma dal form principale).
 */
export async function generateFullAiWikiEntity(
  campaignId: string,
  userPrompt: string,
  entityType: "npc" | "location"
): Promise<GenerateFullAiWikiEntityResult> {
  const prompt = userPrompt.trim();
  if (!prompt) {
    return { success: false, message: "Inserisci una descrizione." };
  }
  if (!campaignId) {
    return { success: false, message: "Campagna non valida." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, message: "Devi essere autenticato." };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "gm" && profile?.role !== "admin") {
      return { success: false, message: "Solo GM e Admin possono usare la generazione AI." };
    }

    const textResult = await generateContextualText(campaignId, prompt, entityType);
    if (!textResult.ok) {
      return { success: false, message: textResult.error };
    }

    const { title, content, hp, ac } = textResult.data;
    const imageDescription = buildImageDescriptionFromNarrative(prompt, content);

    const portraitResult = await generateContextualPortraitAction(
      campaignId,
      imageDescription,
      entityType,
      { entityTitle: title }
    );

    let imageUrl: string | null = null;
    let imageWarning: string | undefined;
    if (portraitResult.success) {
      imageUrl = portraitResult.publicUrl;
    } else {
      imageWarning = portraitResult.message;
    }

    return {
      success: true,
      data: {
        title,
        content,
        hp,
        ac,
        imageUrl,
        entityType,
        imageWarning,
      },
    };
  } catch (err) {
    console.error("[generateFullAiWikiEntity]", err);
    return { success: false, message: "Errore imprevisto durante la catena AI. Riprova." };
  }
}

export type GenerateMagicDraftImageResult =
  | { success: true; imageUrl: string }
  | { success: false; message: string };

/**
 * Genera l'immagine per una bozza testuale già approvata in chat (NPC/Luogo).
 */
export async function generateMagicDraftImageAction(
  campaignId: string,
  entityType: "npc" | "location",
  title: string,
  content: string,
  userPromptSeed: string
): Promise<GenerateMagicDraftImageResult> {
  if (!campaignId) {
    return { success: false, message: "Campagna non valida." };
  }
  const safeTitle = title.trim();
  const safeContent = content.trim();
  if (!safeTitle || !safeContent) {
    return { success: false, message: "Serve una bozza testuale prima di generare l'immagine." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, message: "Devi essere autenticato." };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "gm" && profile?.role !== "admin") {
      return { success: false, message: "Solo GM e Admin possono usare la generazione AI." };
    }

    const imageDescription = buildImageDescriptionFromNarrative(userPromptSeed.trim() || safeTitle, safeContent);
    const portraitResult = await generateContextualPortraitAction(
      campaignId,
      imageDescription,
      entityType,
      { entityTitle: safeTitle }
    );

    if (!portraitResult.success) {
      return { success: false, message: portraitResult.message };
    }

    return { success: true, imageUrl: portraitResult.publicUrl };
  } catch (err) {
    console.error("[generateMagicDraftImageAction]", err);
    return { success: false, message: "Errore imprevisto durante la generazione immagine." };
  }
}
