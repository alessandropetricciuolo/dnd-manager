"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";

type AuthResult = {
  error?: string;
};

const ENV_ERROR =
  "Configurazione mancante sul server. In Vercel: Settings → Environment Variables → aggiungi NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.";

/** Da oggetto errore Supabase Auth ricava un messaggio leggibile (504, 429, message vuoto). */
function authErrorMessage(
  error: { message?: string; status?: number; code?: string; msg?: string; error_description?: string },
  fallback: string
): string {
  if (error.status === 504) {
    return "Il servizio di registrazione non ha risposto in tempo. Riprova tra un minuto (problema temporaneo di rete).";
  }
  if (error.status === 429 || error.code === "over_email_send_rate_limit") {
    return "Troppi tentativi di invio email in poco tempo. Riprova tra un'ora o contatta il gestore del sito.";
  }
  if (error.status && error.status >= 500) {
    return "Errore temporaneo del servizio. Riprova tra qualche minuto.";
  }
  const msg =
    error.message?.trim() ||
    error.msg?.trim() ||
    (typeof error.error_description === "string" ? error.error_description.trim() : null);
  return msg || fallback;
}

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
      return { error: authErrorMessage(error as { message?: string; status?: number }, "Accesso non riuscito. Controlla email e password.") };
    }

    revalidatePath("/dashboard");
    return {};
  } catch (e) {
    const err = e as { message?: string; status?: number; code?: string };
    if (err.status === 504) return { error: "Il servizio non ha risposto in tempo. Riprova tra un minuto." };
    if (err.status === 429 || err.code === "over_email_send_rate_limit") {
      return { error: "Troppi tentativi. Riprova tra un'ora." };
    }
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
      console.error("[signup] Supabase error:", error);
      const err = error as { message?: string; status?: number; code?: string; msg?: string; error_description?: string };
      return {
        error: authErrorMessage(
          err,
          "Registrazione non riuscita. Controlla che l'email non sia già usata, che la password abbia almeno 6 caratteri e riprova."
        ),
      };
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
    const err = e as { message?: string; status?: number; code?: string };
    if (err.status === 504) {
      return { error: "Il servizio di registrazione non ha risposto in tempo. Riprova tra un minuto (problema temporaneo di rete)." };
    }
    if (err.status === 429 || err.code === "over_email_send_rate_limit") {
      return { error: "Troppi tentativi di invio email in poco tempo. Riprova tra un'ora o contatta il gestore del sito." };
    }
    const msg = e instanceof Error ? e.message : "Errore di connessione.";
    if (msg.includes("Variabili mancanti") || msg.includes("NEXT_PUBLIC_SUPABASE")) {
      return { error: "Configurazione mancante sul server. Controlla le variabili d'ambiente (Supabase URL e Anon Key)." };
    }
    console.error("[signup]", e);
    return { error: "Impossibile connettersi al servizio di autenticazione. Riprova più tardi." };
  }
}

/** Aggiorna nome, cognome e telefono nel profilo. Da chiamare dopo signUp lato client (così la chiamata auth non passa dal serverless ed evita 504). */
export async function updateProfileAfterSignup(
  firstName: string,
  lastName: string,
  phone: string
): Promise<AuthResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { error: "Sessione non trovata. Ricarica la pagina e riprova." };
    }
    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
      })
      .eq("id", user.id);
    if (error) {
      console.error("[updateProfileAfterSignup]", error);
      return { error: "Impossibile aggiornare il profilo. Riprova più tardi." };
    }
    revalidatePath("/login");
    return {};
  } catch (e) {
    console.error("[updateProfileAfterSignup]", e);
    return { error: "Errore durante l'aggiornamento del profilo. Riprova." };
  }
}

export async function signout() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  redirect("/login");
}

import {
  requestPasswordReset as requestPasswordResetImpl,
  updatePassword as updatePasswordImpl,
} from "@/app/auth/password-actions";

/** Wrapper per compatibilità: logica in password-actions.ts */
export async function requestPasswordReset(email: string): Promise<AuthResult> {
  return requestPasswordResetImpl(email);
}

export async function updatePassword(newPassword: string): Promise<AuthResult> {
  return updatePasswordImpl(newPassword);
}

