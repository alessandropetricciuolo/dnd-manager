"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import {
  buildContextualImagePrompts,
  type WikiImageEntityKind,
} from "@/lib/ai/image-prompt-builder";
import { generateSiteImageForEntity } from "@/lib/ai/image-provider";
import { getSiteImageModel } from "@/lib/ai/openrouter-image-preview";
import { uploadToTelegram } from "@/lib/telegram-storage";

export type GenerateContextualPortraitResult =
  | { success: true; publicUrl: string; model: string }
  | { success: false; message: string };

export type GenerateContextualPortraitOptions = {
  /** Titolo della voce wiki (nome PNG, luogo, ecc.) — ancoraggio forte sul soggetto. */
  entityTitle?: string | null;
  /** In campagne long, esclude questa voce dal blocco memoria (evita duplicati in modifica). */
  excludeWikiEntityId?: string | null;
};

export type { WikiImageEntityKind };

/**
 * Ritratto / illustrazione coerente con i paletti visivi della campagna (Fase 3).
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

    const model = getSiteImageModel();
    let buffer: Buffer;
    step = `image-generation:${model}`;
    try {
      buffer = await generateSiteImageForEntity(
        built.positivePrompt,
        built.strictNegativePrompt,
        entityType
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
    return { success: true, publicUrl, model };
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Si è verificato un errore imprevisto. Riprova.", err);
  }
}

const COVER_NEGATIVE =
  "text, watermark, logo, signature, blurry, low quality, collage, split image, comic panels, UI, frame border";

/**
 * Copertina bozza per nuova campagna (prima che esista un campaignId).
 */
export async function generateCampaignCoverDraftImageAction(
  title: string,
  description: string
): Promise<GenerateContextualPortraitResult> {
  const safeTitle = title.trim();
  const safeDescription = description.trim();
  if (!safeTitle || !safeDescription) {
    return { success: false, message: "Servono titolo e descrizione per la copertina." };
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
      return { success: false, message: "Solo GM e Admin possono generare immagini AI." };
    }

    const subject = `${safeTitle}. ${safeDescription.slice(0, 600)}`;
    const positivePrompt = [
      "Epic fantasy campaign cover art, cinematic wide environmental shot, 16:9 composition",
      subject,
      "rich atmosphere, dramatic lighting, highly detailed, no text, no lettering",
    ].join(". ");

    const model = getSiteImageModel();
    const buffer = await generateSiteImageForEntity(positivePrompt, COVER_NEGATIVE, "location");
    const bytes = new Uint8Array(buffer);
    const file = new File([bytes], "campaign-cover.png", { type: "image/png" });
    const fileId = await uploadToTelegram(file, `draft-cover:${safeTitle}`, "photo");
    const publicUrl = `/api/tg-image/${encodeURIComponent(fileId)}`;

    return { success: true, publicUrl, model };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Errore generazione copertina.";
    return { success: false, message: msg };
  }
}
