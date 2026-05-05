"use server";

import { createSupabaseServerClient } from "@/utils/supabase/server";
import { generateContextualText, type WikiAiTextGeneration } from "@/lib/ai/generator";
import { generateContextualPortraitAction } from "@/lib/actions/ai-generator";
import type { ImageProviderId } from "@/lib/ai/image-provider";

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

/** Prompt immagine basato esclusivamente sulla descrizione narrativa (niente statistiche). */
function buildImageDescriptionFromNarrative(narrativeDescription: string): string {
  const plainBody = stripMarkdownForImagePrompt(narrativeDescription);
  const max = 3500;
  return plainBody.length <= max ? plainBody : `${plainBody.slice(0, max)}…`;
}

/**
 * Catena sequenziale: testo contestualizzato → immagine coerente col testo generato (nessun insert DB:
 * il Master conferma dal form principale).
 */
export async function generateFullAiWikiEntity(
  campaignId: string,
  userPrompt: string,
  entityType: "npc" | "location",
  options: { imageProvider?: ImageProviderId | string | null } = {}
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
    const imageDescription = buildImageDescriptionFromNarrative(content);

    const portraitResult = await generateContextualPortraitAction(
      campaignId,
      imageDescription,
      entityType,
      { provider: options.imageProvider ?? null, entityTitle: title }
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
