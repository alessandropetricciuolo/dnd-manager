"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";

type AuthResult = {
  error?: string;
};

export async function login(email: string, password: string): Promise<AuthResult> {
  if (!email || !password) {
    return { error: "Email e password sono obbligatorie." };
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

export async function signup(email: string, password: string): Promise<AuthResult> {
  if (!email || !password) {
    return { error: "Email e password sono obbligatorie." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      return { error: error.message };
    }

    // Il trigger handle_new_user in Supabase crea automaticamente il record in public.profiles con ruolo 'player'
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

