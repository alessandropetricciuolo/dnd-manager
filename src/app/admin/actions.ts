"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";

const ALLOWED_ROLES = ["player", "gm", "admin"] as const;

export type CreateUserResult = {
  success: boolean;
  message: string;
};

/** Crea un nuovo utente (solo admin). Usa Service Role per auth.admin.createUser. */
export async function createUser(formData: FormData): Promise<CreateUserResult> {
  const email = (formData.get("email") as string | null)?.trim();
  const password = (formData.get("password") as string | null)?.trim();
  const firstName = (formData.get("first_name") as string | null)?.trim() || null;
  const lastName = (formData.get("last_name") as string | null)?.trim() || null;

  if (!email) {
    return { success: false, message: "Email obbligatoria." };
  }
  if (!password || password.length < 6) {
    return { success: false, message: "Password provvisoria di almeno 6 caratteri." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user: caller },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !caller) {
      return { success: false, message: "Non autenticato." };
    }

    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();

    if (callerProfile?.role !== "admin") {
      return { success: false, message: "Solo gli admin possono creare utenti." };
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return {
        success: false,
        message: "Configurazione mancante: aggiungi SUPABASE_SERVICE_ROLE_KEY in .env.local (Supabase → Settings → API → service_role).",
      };
    }

    const admin = createSupabaseAdminClient();
    const { data: newUser, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError) {
      console.error("[createUser] auth", createError);
      return {
        success: false,
        message: createError.message ?? "Errore nella creazione dell'utente.",
      };
    }

    if (!newUser.user?.id) {
      return { success: false, message: "Utente creato ma ID non disponibile." };
    }

    const { error: updateError } = await admin
      .from("profiles")
      .update({
        first_name: firstName,
        last_name: lastName,
      })
      .eq("id", newUser.user.id);

    if (updateError) {
      console.error("[createUser] profiles", updateError);
      return {
        success: false,
        message: "Utente creato ma errore nell'aggiornamento anagrafica.",
      };
    }

    revalidatePath("/admin");
    return { success: true, message: "Utente creato. L'utente può accedere con email e password." };
  } catch (err) {
    console.error("[createUser]", err);
    return { success: false, message: "Errore imprevisto. Riprova." };
  }
}

export type UpdateRoleResult = {
  success: boolean;
  message: string;
};

/** Aggiorna il ruolo di un utente. Solo gli admin possono chiamarla. */
export async function updateUserRole(
  userId: string,
  newRole: string
): Promise<UpdateRoleResult> {
  if (!ALLOWED_ROLES.includes(newRole as (typeof ALLOWED_ROLES)[number])) {
    return { success: false, message: "Ruolo non valido." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, message: "Non autenticato." };
    }

    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (callerProfile?.role !== "admin") {
      return { success: false, message: "Solo gli admin possono modificare i ruoli." };
    }

    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId);

    if (error) {
      console.error("[updateUserRole]", error);
      return {
        success: false,
        message: error.message ?? "Errore durante l'aggiornamento.",
      };
    }

    revalidatePath("/admin");
    return {
      success: true,
      message: `Ruolo aggiornato a ${newRole}.`,
    };
  } catch (err) {
    console.error("[updateUserRole]", err);
    return {
      success: false,
      message: "Errore imprevisto. Riprova.",
    };
  }
}
