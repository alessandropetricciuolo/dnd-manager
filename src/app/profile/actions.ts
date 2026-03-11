"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";

export type UpdateProfileResult = {
  success: boolean;
  message: string;
};

export async function updateProfile(formData: FormData): Promise<UpdateProfileResult> {
  const firstName = (formData.get("first_name") as string | null)?.trim() || null;
  const lastName = (formData.get("last_name") as string | null)?.trim() || null;
  const dateOfBirthRaw = (formData.get("date_of_birth") as string | null)?.trim() || null;
  const phone = (formData.get("phone") as string | null)?.trim() || null;

  const dateOfBirth = dateOfBirthRaw && !isNaN(Date.parse(dateOfBirthRaw))
    ? dateOfBirthRaw
    : null;

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, message: "Non autenticato." };
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: firstName,
        last_name: lastName,
        date_of_birth: dateOfBirth,
        phone,
      })
      .eq("id", user.id);

    if (error) {
      console.error("[updateProfile]", error);
      return {
        success: false,
        message: error.message ?? "Errore durante il salvataggio.",
      };
    }

    revalidatePath("/profile");
    revalidatePath("/dashboard");
    return { success: true, message: "Profilo aggiornato." };
  } catch (err) {
    console.error("[updateProfile]", err);
    return { success: false, message: "Errore imprevisto. Riprova." };
  }
}

export type UpdateNotificationsResult = { success: boolean; message: string };

/** Aggiorna la preferenza "blocca avvisi automatici" del profilo (solo utente corrente). */
export async function updateNotificationsPreference(notificationsDisabled: boolean): Promise<UpdateNotificationsResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, message: "Non autenticato." };
    }

    const { error } = await supabase
      .from("profiles")
      .update({ notifications_disabled: !!notificationsDisabled })
      .eq("id", user.id);

    if (error) {
      console.error("[updateNotificationsPreference]", error);
      return { success: false, message: error.message ?? "Errore durante il salvataggio." };
    }

    revalidatePath("/profile");
    return { success: true, message: "Preferenza aggiornata." };
  } catch (err) {
    console.error("[updateNotificationsPreference]", err);
    return { success: false, message: "Errore imprevisto. Riprova." };
  }
}
