"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { sendAdminNotification } from "@/lib/telegram-notifier";

type AuthResult = {
  error?: string;
};

const ENV_ERROR =
  "Configurazione mancante sul server. In Vercel: Settings → Environment Variables → aggiungi NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.";

const MINIMUM_ALLOWED_AGE = 18;
const UNDERAGE_ALERT_MESSAGE =
  "Ci dispiace, al momento l'associazione Barber & Dragons accetta solo utenti maggiorenni (18+).";

function isAdultFromIsoDate(dateIso: string): boolean {
  const trimmed = dateIso.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return false;
  const [yearRaw, monthRaw, dayRaw] = trimmed.split("-");
  const year = Number.parseInt(yearRaw, 10);
  const month = Number.parseInt(monthRaw, 10);
  const day = Number.parseInt(dayRaw, 10);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return false;

  const now = new Date();
  let age = now.getFullYear() - year;
  const monthDiff = now.getMonth() + 1 - month;
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < day)) age -= 1;
  return age >= MINIMUM_ALLOWED_AGE;
}

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
  phone: string,
  dateOfBirth: string,
  whatsappOptIn: boolean
): Promise<AuthResult> {
  if (!email || !password) {
    return { error: "Email e password sono obbligatorie." };
  }
  if (!firstName?.trim() || !lastName?.trim() || !phone?.trim()) {
    return { error: "Nome, Cognome e Cellulare sono obbligatori." };
  }
  if (!dateOfBirth?.trim()) {
    return { error: "La data di nascita è obbligatoria." };
  }
  if (!isAdultFromIsoDate(dateOfBirth)) {
    return { error: UNDERAGE_ALERT_MESSAGE };
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
          date_of_birth: dateOfBirth.trim(),
          whatsapp_opt_in: whatsappOptIn,
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
          date_of_birth: dateOfBirth.trim(),
          whatsapp_opt_in: whatsappOptIn,
        })
        .eq("id", data.user.id);
    }

    {
      const nome = firstName.trim();
      const cognome = lastName.trim();
      const cellulare = phone?.trim() || "";
      const autorizzazione_whatsapp = !!whatsappOptIn;
      const waText = autorizzazione_whatsapp ? "✅ Sì" : "❌ No";
      const phoneText = cellulare ? `\n📱 Cellulare: ${cellulare}` : "";
      const msg = `🆕 Nuovo Utente Registrato!\n\n👤 Nome: ${nome} ${cognome}\n📧 Email: ${email}${phoneText}\n💬 WhatsApp: ${waText}`;
      sendAdminNotification(msg).catch(console.error);
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
  phone: string,
  dateOfBirth: string,
  whatsappOptIn: boolean
): Promise<AuthResult> {
  if (!dateOfBirth?.trim()) {
    return { error: "La data di nascita è obbligatoria." };
  }
  if (!isAdultFromIsoDate(dateOfBirth)) {
    return { error: UNDERAGE_ALERT_MESSAGE };
  }
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
        date_of_birth: dateOfBirth.trim(),
        whatsapp_opt_in: whatsappOptIn,
      })
      .eq("id", user.id);
    if (error) {
      console.error("[updateProfileAfterSignup]", error);
      return { error: "Impossibile aggiornare il profilo. Riprova più tardi." };
    }
    {
      const nome = firstName.trim();
      const cognome = lastName.trim();
      const cellulare = phone?.trim() || "";
      const autorizzazione_whatsapp = !!whatsappOptIn;
      const waText = autorizzazione_whatsapp ? "✅ Sì" : "❌ No";
      const phoneText = cellulare ? `\n📱 Cellulare: ${cellulare}` : "";
      const email = user.email?.trim() || "Email non disponibile";
      const msg = `🆕 Nuovo Utente Registrato!\n\n👤 Nome: ${nome} ${cognome}\n📧 Email: ${email}${phoneText}\n💬 WhatsApp: ${waText}`;
      sendAdminNotification(msg).catch(console.error);
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

