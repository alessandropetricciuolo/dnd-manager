"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";

export type AdminAiImageStyleRow = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  positive_prompt: string;
  negative_prompt: string | null;
  is_active: boolean;
  sort_order: number;
};

type ActionResult = { success: true; message: string } | { success: false; message: string };

async function ensureAdmin(): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, message: "Non autenticato." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return { ok: false, message: "Solo admin." };
  return { ok: true };
}

function normalizeKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 80);
}

export async function upsertAiImageStyleAction(formData: FormData): Promise<ActionResult> {
  const auth = await ensureAdmin();
  if (!auth.ok) return { success: false, message: auth.message };

  const id = (formData.get("id") as string | null)?.trim() || null;
  const key = normalizeKey((formData.get("key") as string | null) ?? "");
  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const description = (formData.get("description") as string | null)?.trim() || null;
  const positivePrompt = (formData.get("positive_prompt") as string | null)?.trim() ?? "";
  const negativePrompt = (formData.get("negative_prompt") as string | null)?.trim() || null;
  const isActive = formData.get("is_active") === "true";
  const sortOrderRaw = (formData.get("sort_order") as string | null)?.trim() ?? "0";
  const sortOrder = Number.isFinite(Number(sortOrderRaw)) ? Number(sortOrderRaw) : 0;

  if (!key) return { success: false, message: "Chiave stile obbligatoria." };
  if (!name) return { success: false, message: "Nome stile obbligatorio." };
  if (!positivePrompt) return { success: false, message: "Prompt positivo obbligatorio." };

  const admin = createSupabaseAdminClient();
  const payload = {
    key,
    name,
    description,
    positive_prompt: positivePrompt,
    negative_prompt: negativePrompt,
    is_active: isActive,
    sort_order: Math.max(0, Math.floor(sortOrder)),
    updated_at: new Date().toISOString(),
  };

  const query = id
    ? admin.from("ai_image_styles").update(payload as never).eq("id", id)
    : admin.from("ai_image_styles").insert(payload as never);
  const { error } = await query;
  if (error) return { success: false, message: error.message || "Errore salvataggio stile." };

  revalidatePath("/admin/ai-image-styles");
  revalidatePath("/campaigns");
  return { success: true, message: id ? "Stile aggiornato." : "Stile creato." };
}

export async function deleteAiImageStyleAction(styleId: string): Promise<ActionResult> {
  const auth = await ensureAdmin();
  if (!auth.ok) return { success: false, message: auth.message };
  if (!styleId) return { success: false, message: "Stile non valido." };

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("ai_image_styles").delete().eq("id", styleId);
  if (error) return { success: false, message: error.message || "Errore eliminazione stile." };

  revalidatePath("/admin/ai-image-styles");
  revalidatePath("/campaigns");
  return { success: true, message: "Stile eliminato." };
}
