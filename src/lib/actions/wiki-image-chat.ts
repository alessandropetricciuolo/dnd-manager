"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import type { WikiImageEntityKind } from "@/lib/ai/image-prompt-builder";
import { fetchPublicImageAsDataUrl } from "@/lib/ai/image-reference-fetch";
import {
  buildImageRefineInstructionText,
  type WikiImageChatTurn,
} from "@/lib/ai/image-refine-prompt";
import { generateSiteImageRefinement } from "@/lib/ai/image-provider";
import { getSiteImageModel } from "@/lib/ai/openrouter-image-preview";
import { uploadToTelegram } from "@/lib/telegram-storage";

export type { WikiImageChatTurn };

export type WikiImageRefineResult =
  | { success: true; publicUrl: string; assistantMessage: string; model: string }
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
    return { ok: false, message: "Solo GM e Admin possono modificare immagini AI." };
  }

  return { ok: true };
}

/**
 * Modifica iterativa di un'immagine già generata: usa l'immagine corrente come riferimento visivo
 * e applica le istruzioni del Master (chat multi-turno).
 */
export async function refineWikiImageAction(
  campaignId: string,
  entityType: WikiImageEntityKind,
  referenceImageUrl: string,
  baseDescription: string,
  messages: WikiImageChatTurn[]
): Promise<WikiImageRefineResult> {
  if (!campaignId) {
    return { success: false, message: "Campagna non valida." };
  }
  if (!referenceImageUrl.trim()) {
    return { success: false, message: "Serve un'immagine di riferimento." };
  }
  if (!baseDescription.trim()) {
    return { success: false, message: "Manca il testo di riferimento per la coerenza narrativa." };
  }
  if (!messages.length) {
    return { success: false, message: "Descrivi la modifica che vuoi applicare." };
  }
  const last = messages[messages.length - 1];
  if (last.role !== "user" || !last.content.trim()) {
    return { success: false, message: "L'ultimo messaggio deve essere una richiesta di modifica." };
  }

  const auth = await assertGmAuth();
  if (!auth.ok) return { success: false, message: auth.message };

  try {
    const referenceDataUrl = await fetchPublicImageAsDataUrl(referenceImageUrl);
    const instruction = buildImageRefineInstructionText(entityType, baseDescription, messages);
    const model = getSiteImageModel();
    const buffer = await generateSiteImageRefinement(instruction, referenceDataUrl, entityType, {
      model,
    });

    const file = new File([new Uint8Array(buffer)], `${entityType}-refine.png`, { type: "image/png" });
    const fileId = await uploadToTelegram(file, `${campaignId}:${entityType}:refine`, "photo");
    const publicUrl = `/api/tg-image/${encodeURIComponent(fileId)}`;

    revalidatePath(`/campaigns/${campaignId}`);

    return {
      success: true,
      publicUrl,
      model,
      assistantMessage: `Modifica applicata: ${last.content.trim()}`,
    };
  } catch (err) {
    console.error("[refineWikiImageAction]", err);
    const msg = err instanceof Error ? err.message : "Errore imprevisto durante la modifica immagine.";
    return { success: false, message: msg };
  }
}
