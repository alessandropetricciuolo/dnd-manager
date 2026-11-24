"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { ACCOUNT_SAFETY_PATH, getAccountSafetyAdmin, revokeDeletionAppleAccess, sendDeletionConfirmation } from "@/lib/admin-account-safety";

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

    // Assertione necessaria: in build i tipi Supabase inferiscono update come never
    const { error: updateError } = await admin
      .from("profiles")
      .update({ first_name: firstName, last_name: lastName } as never)
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

export type UpdateUserProfileResult = {
  success: boolean;
  message: string;
};

type UpdateUserProfilePayload = {
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  role?: (typeof ALLOWED_ROLES)[number];
  email?: string | null;
};

/** Modifica anagrafica e/o email di un utente. Solo admin. */
export async function updateUserProfile(
  userId: string,
  payload: UpdateUserProfilePayload
): Promise<UpdateUserProfileResult> {
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
      return { success: false, message: "Solo gli admin possono modificare gli utenti." };
    }

    const admin = createSupabaseAdminClient();

    if (payload.email !== undefined && payload.email !== null && payload.email.trim() !== "") {
      const { error: emailError } = await admin.auth.admin.updateUserById(userId, {
        email: payload.email.trim(),
      });
      if (emailError) {
        console.error("[updateUserProfile] email", emailError);
        return { success: false, message: emailError.message ?? "Errore aggiornamento email." };
      }
    }

    const profileUpdate: Record<string, unknown> = {};
    if (payload.first_name !== undefined) profileUpdate.first_name = payload.first_name?.trim() || null;
    if (payload.last_name !== undefined) profileUpdate.last_name = payload.last_name?.trim() || null;
    if (payload.phone !== undefined) profileUpdate.phone = payload.phone?.trim() || null;
    if (payload.role !== undefined && ALLOWED_ROLES.includes(payload.role)) {
      profileUpdate.role = payload.role;
    }

    if (Object.keys(profileUpdate).length > 0) {
      const { error: profileError } = await admin
        .from("profiles")
        .update(profileUpdate as never)
        .eq("id", userId);

      if (profileError) {
        console.error("[updateUserProfile] profiles", profileError);
        return { success: false, message: profileError.message ?? "Errore aggiornamento profilo." };
      }
    }

    revalidatePath("/admin");
    revalidatePath(`/admin/users/${userId}`);
    return { success: true, message: "Utente aggiornato." };
  } catch (err) {
    console.error("[updateUserProfile]", err);
    return { success: false, message: "Errore imprevisto. Riprova." };
  }
}

export type DeleteUserResult = {
  success: boolean;
  message: string;
  confirmationPending?: boolean;
  appleRevocationPending?: boolean;
};

/** Trasferisce la gestione delle campagne ed elimina l'account in una transazione. */
export async function deleteUser(userId: string): Promise<DeleteUserResult> {
  try {
    const caller = await getAccountSafetyAdmin();
    if (!caller) return { success: false, message: "Accesso riservato agli admin." };
    if (caller.userId === userId) {
      return { success: false, message: "Non puoi eliminare il tuo account." };
    }

    const { data: requestId, error } = await caller.admin.rpc("complete_barber_account_deletion", {
      p_user_id: userId,
      p_admin_id: caller.userId,
    });
    if (error || !requestId) {
      console.error("[deleteUser] deletion transaction", error?.code, error?.message);
      return { success: false, message: error?.code === "P0001" ? error.message : "Cancellazione non riuscita. Riprova." };
    }

    const [confirmationSent, appleRevoked] = await Promise.all([
      sendDeletionConfirmation(caller.admin, requestId).catch(() => false),
      revokeDeletionAppleAccess(caller.admin, requestId).catch(() => false),
    ]);
    revalidatePath("/admin");
    revalidatePath(ACCOUNT_SAFETY_PATH);
    const confirmation = confirmationSent
      ? "Email di conferma inviata."
      : "Riprova l’invio dell’email da Account e Whisper.";
    const revocation = appleRevoked ? "" : " Riprova la revoca Apple da Account e Whisper.";
    return {
      success: true,
      confirmationPending: !confirmationSent,
      appleRevocationPending: !appleRevoked,
      message: `Utente eliminato. ${confirmation}${revocation}`,
    };
  } catch (err) {
    console.error("[deleteUser]", err);
    return { success: false, message: "Errore imprevisto. Riprova." };
  }
}

const NOTIFICATIONS_PAUSED_KEY = "notifications_paused";

export type NotificationsPausedResult = { success: boolean; message?: string; paused?: boolean };

/** Legge se gli avvisi automatici sono sospesi (solo admin). */
export async function getNotificationsPausedSetting(): Promise<NotificationsPausedResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return { success: false, message: "Non autenticato." };
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return { success: false, message: "Solo admin." };
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", NOTIFICATIONS_PAUSED_KEY)
      .single();
    const value = (data as { value?: unknown } | null)?.value;
    const paused = value === true || value === "true";
    return { success: true, paused };
  } catch (err) {
    console.error("[getNotificationsPausedSetting]", err);
    return { success: false, message: "Errore lettura impostazione." };
  }
}

/** Attiva/disattiva sospensione avvisi automatici (solo admin). Utile per inserimenti massivi. */
export async function setNotificationsPausedAction(paused: boolean): Promise<NotificationsPausedResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return { success: false, message: "Non autenticato." };
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return { success: false, message: "Solo admin." };
    const { error } = await supabase
      .from("app_settings")
      .upsert(
        { key: NOTIFICATIONS_PAUSED_KEY, value: paused, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );
    if (error) {
      console.error("[setNotificationsPausedAction]", error);
      return { success: false, message: error.message };
    }
    revalidatePath("/admin");
    return { success: true, paused };
  } catch (err) {
    console.error("[setNotificationsPausedAction]", err);
    return { success: false, message: "Errore aggiornamento." };
  }
}
