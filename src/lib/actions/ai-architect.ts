"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import type { Json } from "@/types/database.types";
import { ARCHITECT_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { generateAiText, HuggingFaceInferenceError } from "@/lib/ai/huggingface-client";
import {
  normalizeAiContextForSave,
  type CampaignAiContext,
} from "@/lib/campaign-ai-context";

export type { CampaignAiContext } from "@/lib/campaign-ai-context";

export type GenerateCampaignContextResult =
  | { success: true; data: CampaignAiContext }
  | { success: false; message: string };

async function isGmOrAdminByRole(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>
): Promise<boolean> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return false;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  return profile?.role === "gm" || profile?.role === "admin";
}

async function canManageCampaign(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  campaignId: string
): Promise<boolean> {
  if (await isGmOrAdminByRole(supabase)) return true;
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("gm_id")
    .eq("id", campaignId)
    .single();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return campaign?.gm_id === user?.id;
}

/** Estrae il primo oggetto JSON dalla risposta (gestisce fence \`\`\`json opzionali). */
function extractJsonObject(raw: string): string {
  const trimmed = raw.trim();
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/m);
  if (fence?.[1]) return fence[1].trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}

/**
 * Genera e salva il contesto AI strutturato dalla descrizione naturale del GM (Agente Architetto).
 */
export async function generateCampaignContextAction(
  campaignId: string,
  description: string
): Promise<GenerateCampaignContextResult> {
  const trimmed = description.trim();
  if (!trimmed) {
    return { success: false, message: "Inserisci una descrizione dell'ambientazione." };
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

    const allowed = await canManageCampaign(supabase, campaignId);
    if (!allowed) {
      return { success: false, message: "Non hai i permessi per modificare questa campagna." };
    }

    const userPrompt = `Descrizione dell'ambientazione fornita dal Dungeon Master:\n\n${trimmed}`;
    const fullPrompt = `${ARCHITECT_SYSTEM_PROMPT}\n\n---\n\n${userPrompt}`;

    let rawText: string;
    try {
      rawText = await generateAiText(fullPrompt);
    } catch (e) {
      const msg =
        e instanceof HuggingFaceInferenceError
          ? e.message
          : "Errore durante la chiamata al modello AI.";
      return { success: false, message: msg };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(extractJsonObject(rawText));
    } catch {
      return {
        success: false,
        message:
          "La risposta dell'AI non è un JSON valido. Riprova o semplifica la descrizione.",
      };
    }

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {
        success: false,
        message: "La risposta dell'AI non è un oggetto JSON. Riprova.",
      };
    }

    const normalized = normalizeAiContextForSave(parsed as Record<string, unknown>);
    if (!normalized) {
      return {
        success: false,
        message:
          "Il JSON ricevuto non contiene tutti i campi richiesti (stringhe non vuote). Riprova.",
      };
    }

    const { error: updateError } = await supabase
      .from("campaigns")
      .update({ ai_context: normalized as unknown as Json })
      .eq("id", campaignId);

    if (updateError) {
      console.error("[generateCampaignContextAction]", updateError);
      return { success: false, message: updateError.message ?? "Errore nel salvataggio." };
    }

    revalidatePath(`/campaigns/${campaignId}`);
    return { success: true, data: normalized };
  } catch (err) {
    console.error("[generateCampaignContextAction]", err);
    return { success: false, message: "Si è verificato un errore imprevisto. Riprova." };
  }
}
