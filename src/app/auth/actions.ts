"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";

type AuthResult = {
  error?: string;
};

const ENV_ERROR =
  "Configurazione mancante sul server. In Vercel: Settings → Environment Variables → aggiungi NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.";

export async function login(email: string, password: string): Promise<AuthResult> {
  if (!email || !password) {
    return { error: "Email e password sono obbligatorie." };
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { error: ENV_ERROR };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/dashboard");
    return {};
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore di connessione.";
    if (msg.includes("Variabili mancanti") || msg.includes("NEXT_PUBLIC_SUPABASE")) {
      return { error: "Configurazione mancante sul server. Controlla le variabili d'ambiente (Supabase URL e Anon Key)." };
    }
    console.error("[login]", e);
    return { error: "Impossibile connettersi al servizio di autenticazione. Riprova più tardi." };
  }
}

export async function signup(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  phone: string
): Promise<AuthResult> {
  if (!email || !password) {
    return { error: "Email e password sono obbligatorie." };
  }
  if (!firstName?.trim() || !lastName?.trim() || !phone?.trim()) {
    return { error: "Nome, Cognome e Cellulare sono obbligatori." };
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { error: ENV_ERROR };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim(),
          role: "player",
        },
      },
    });

    if (error) {
      return { error: error.message };
    }

    // Scrivi nome, cognome e telefono in profiles (il trigger crea il record con ruolo 'player')
    if (data.user?.id) {
      await supabase
        .from("profiles")
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim(),
        })
        .eq("id", data.user.id);
    }

    revalidatePath("/login");
    return {};
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore di connessione.";
    if (msg.includes("Variabili mancanti") || msg.includes("NEXT_PUBLIC_SUPABASE")) {
      return { error: "Configurazione mancante sul server. Controlla le variabili d'ambiente (Supabase URL e Anon Key)." };
    }
    console.error("[signup]", e);
    return { error: "Impossibile connettersi al servizio di autenticazione. Riprova più tardi." };
  }
}

export async function signout() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  redirect("/login");
}

/** Base URL dell'app per il redirect dopo reset password (aggiungi in Supabase Auth → URL di redirect). */
function getAppBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}

export async function requestPasswordReset(email: string): Promise<AuthResult> {
  if (!email?.trim()) {
    return { error: "Inserisci l'email." };
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { error: ENV_ERROR };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const redirectTo = `${getAppBaseUrl()}/auth/callback?next=/update-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
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

export async function updatePassword(newPassword: string): Promise<AuthResult> {
  if (!newPassword || newPassword.length < 6) {
    return { error: "La password deve avere almeno 6 caratteri." };
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { error: ENV_ERROR };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      return { error: error.message };
    }
    revalidatePath("/dashboard");
    return {};
  } catch (e) {
    console.error("[updatePassword]", e);
    return {
      error: "Impossibile aggiornare la password. Riprova più tardi.",
    };
  }
}

