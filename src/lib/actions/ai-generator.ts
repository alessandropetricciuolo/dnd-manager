"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import {
  buildContextualImagePrompts,
  type WikiImageEntityKind,
} from "@/lib/ai/image-prompt-builder";
import {
  generateAiImageWithProvider,
  resolveImageProvider,
  type ImageProviderId,
} from "@/lib/ai/image-provider";
import { uploadToTelegram } from "@/lib/telegram-storage";

export type GenerateContextualPortraitResult =
  | { success: true; publicUrl: string; provider: ImageProviderId }
  | { success: false; message: string };

export type GenerateContextualPortraitOptions = {
  /**
   * Provider immagine da usare per questa singola richiesta. Se omesso o non valido,
   * viene applicato il default configurato via env `AI_IMAGE_PROVIDER`.
   */
  provider?: ImageProviderId | string | null;
  /** Titolo della voce wiki (nome PNG, luogo, ecc.) — ancoraggio forte sul soggetto. */
  entityTitle?: string | null;
  /** In campagne long, esclude questa voce dal blocco memoria (evita duplicati in modifica). */
  excludeWikiEntityId?: string | null;
};

export type { WikiImageEntityKind };

/**
 * Ritratto / illustrazione coerente con i paletti visivi della campagna (Fase 3).
 * Carica su Storage pubblico `campaigns/{campaignId}/portraits/`.
 */
export async function generateContextualPortraitAction(
  campaignId: string,
  charDescription: string,
  entityType: WikiImageEntityKind,
  options: GenerateContextualPortraitOptions = {}
): Promise<GenerateContextualPortraitResult> {
  let step = "input-validation";
  const fail = (message: string, details?: unknown): GenerateContextualPortraitResult => {
    const code = `AI-IMG:${step}`;
    if (details) {
      console.error(`[generateContextualPortraitAction][${code}]`, details);
    }
    return { success: false, message: `${message} (${code})` };
  };

  const trimmed = charDescription.trim();
  if (!trimmed) {
    return fail("Inserisci una descrizione per generare l’immagine.");
  }
  if (!campaignId) {
    return fail("Campagna non valida.");
  }

  try {
    step = "auth";
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return fail("Devi essere autenticato.", userError);
    }

    step = "role-check";
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "gm" && profile?.role !== "admin") {
      return fail("Solo GM e Admin possono generare immagini AI.");
    }

    step = "prompt-build";
    const admin = createSupabaseAdminClient();
    const built = await buildContextualImagePrompts(admin, {
      campaignId,
      charDescription: trimmed,
      entityType,
      entityTitle: options.entityTitle,
      excludeWikiEntityId: options.excludeWikiEntityId,
    });

    if ("error" in built) {
      return fail(built.error);
    }

    const provider = resolveImageProvider(options.provider ?? null);
    let buffer: Buffer;
    step = `image-generation:${provider}`;
    try {
      buffer = await generateAiImageWithProvider(
        provider,
        built.positivePrompt,
        built.strictNegativePrompt
      );
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Errore durante la generazione dell’immagine.";
      return fail(msg, e);
    }

    step = "telegram-upload";
    const bytes = new Uint8Array(buffer);
    const file = new File([bytes], `${entityType}.png`, { type: "image/png" });
    const fileId = await uploadToTelegram(file, `${campaignId}:${entityType}`, "photo");
    const publicUrl = `/api/tg-image/${encodeURIComponent(fileId)}`;

    step = "revalidate";
    revalidatePath(`/campaigns/${campaignId}`);
    return { success: true, publicUrl, provider };
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Si è verificato un errore imprevisto. Riprova.", err);
  }
}
