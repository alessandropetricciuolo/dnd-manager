"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import type { Database } from "@/types/database.types";

export type SubmitLeadResult = { success: boolean; message?: string };
export type UpdateLeadStatusResult = { success: boolean; message?: string };

const SOURCE_NFC_LANDING = "NFC_Landing_Page";

const VALID_STATUSES = ["new", "contacted", "converted", "archived"] as const;
type LeadStatus = (typeof VALID_STATUSES)[number];

/**
 * Inserisce un lead dal form landing /scopri.
 * Gestisce email già presente con messaggio amichevole.
 */
export async function submitLeadAction(
  formData: FormData
): Promise<SubmitLeadResult> {
  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const email = (formData.get("email") as string | null)?.trim() ?? "";
  const experience_level = (formData.get("experience_level") as string | null)?.trim() ?? null;
  const marketing_opt_in =
    formData.get("marketing_opt_in") === "on" ||
    formData.get("marketing_opt_in") === "true";

  if (!name || name.length < 2) {
    return { success: false, message: "Inserisci un nome o nickname (min. 2 caratteri)." };
  }
  if (!email) {
    return { success: false, message: "Inserisci una email valida." };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { success: false, message: "Indirizzo email non valido." };
  }

  try {
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase.from("leads").insert({
      name,
      email,
      experience_level: experience_level || null,
      source: SOURCE_NFC_LANDING,
      marketing_opt_in,
      status: "new",
    });

    if (error) {
      if (error.code === "23505") {
        return {
          success: false,
          message:
            "Sei già nei nostri archivi! Ti contatteremo presto.",
        };
      }
      console.error("[submitLeadAction]", error);
      return {
        success: false,
        message: "Qualcosa è andato storto. Riprova tra poco.",
      };
    }

    return { success: true };
  } catch (err) {
    console.error("[submitLeadAction]", err);
    return {
      success: false,
      message: "Qualcosa è andato storto. Riprova tra poco.",
    };
  }
}

/**
 * Aggiorna lo stato di un lead (solo admin). Usa client admin per bypassare RLS.
 */
export async function updateLeadStatusAction(
  leadId: string,
  newStatus: string
): Promise<UpdateLeadStatusResult> {
  if (!leadId || !newStatus) {
    return { success: false, message: "ID lead e stato richiesti." };
  }
  if (!VALID_STATUSES.includes(newStatus as LeadStatus)) {
    return { success: false, message: "Stato non valido." };
  }

  const status = newStatus as LeadStatus;
  const payload: Database["public"]["Tables"]["leads"]["Update"] = { status };
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, message: "Non autenticato." };
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "admin") {
      return { success: false, message: "Non autorizzato." };
    }

    const admin = createSupabaseAdminClient();
    // Cast to never: Supabase client infers update() param as never for this table
    const { error } = await admin.from("leads").update(payload as never).eq("id", leadId);

    if (error) {
      console.error("[updateLeadStatusAction]", error);
      return { success: false, message: "Aggiornamento fallito." };
    }
    revalidatePath("/admin/crm");
    return { success: true };
  } catch (err) {
    console.error("[updateLeadStatusAction]", err);
    return { success: false, message: "Errore di rete." };
  }
}
