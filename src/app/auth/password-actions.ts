"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";

export type PasswordResult = { error?: string };

const MIN_PASSWORD_LENGTH = 6;
const ENV_ERROR =
  "Configurazione mancante sul server. Verifica NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.";

function getAppBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}

/** Invia email di recupero password. redirectTo porta l'utente su /auth/callback?next=/update-password */
export async function requestPasswordReset(email: string): Promise<PasswordResult> {
  const trimmed = email?.trim();
  if (!trimmed) {
    return { error: "Inserisci l'email." };
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { error: ENV_ERROR };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const redirectTo = `${getAppBaseUrl()}/auth/callback?next=/update-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo,
    });

    if (error) {
      return { error: error.message };
    }
    return {};
  } catch (e) {
    console.error("[requestPasswordReset]", e);
    return {
      error: "Impossibile inviare l'email di recupero. Riprova più tardi.",
    };
  }
}

/** Aggiorna la password dell'utente loggato (reset da email o modifica da profilo). */
export async function updatePassword(newPassword: string): Promise<PasswordResult> {
  if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
    return { error: `La password deve avere almeno ${MIN_PASSWORD_LENGTH} caratteri.` };
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { error: ENV_ERROR };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Devi essere autenticato per modificare la password." };
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      if (error.message.toLowerCase().includes("same") || error.message.toLowerCase().includes("identic")) {
        return { error: "La nuova password deve essere diversa dalla precedente." };
      }
      return { error: error.message };
    }

    revalidatePath("/dashboard");
    revalidatePath("/profile");
    return {};
  } catch (e) {
    console.error("[updatePassword]", e);
    return {
      error: "Impossibile aggiornare la password. Riprova più tardi.",
    };
  }
}
