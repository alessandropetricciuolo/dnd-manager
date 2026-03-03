import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * Supabase client con Service Role Key.
 * Usare SOLO in Server Actions lato server (es. admin createUser).
 * Non esporre mai questo client al client.
 */
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  if (url.includes("your-project")) {
    throw new Error(
      "Sostituisci il placeholder in .env.local con l'URL reale del progetto Supabase. Poi elimina .next e riavvia il dev server."
    );
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
