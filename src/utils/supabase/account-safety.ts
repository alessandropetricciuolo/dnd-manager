import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

type Tables = Database["public"]["Tables"];
type SafetyTables = Pick<Tables, "account_deletion_requests" | "apple_sign_in_tokens" | "whisper_reports" | "profiles" | "secret_whispers" | "campaigns">;
type AccountSafetyDatabase = {
  public: {
    Tables: { [Name in keyof SafetyTables]: SafetyTables[Name] & { Relationships: [] } };
    Views: Record<string, never>;
    Functions: Pick<Database["public"]["Functions"],
      "has_existing_apple_account" | "accept_whisper_rules_v1" | "has_whisper_rules_v1" |
      "complete_barber_account_deletion" | "review_whisper_report">;
  };
};

// The project's handwritten schema omits relationship declarations on other tables.
export function accountSafetyClient(client: SupabaseClient<Database>) {
  return client as unknown as SupabaseClient<AccountSafetyDatabase>;
}
