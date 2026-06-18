import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";

export async function ensureImageBenchmarkAdmin(): Promise<
  | { ok: true; userId: string; admin: ReturnType<typeof createSupabaseAdminClient> }
  | { ok: false; message: string }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Non autenticato." };
  }

  const admin = createSupabaseAdminClient();
  const { data: profileRaw } = await admin.from("profiles").select("role").eq("id", user.id).single();
  const profile = profileRaw as { role?: string } | null;

  if (profile?.role !== "admin") {
    return { ok: false, message: "Solo gli admin possono usare il benchmark immagini." };
  }

  return { ok: true, userId: user.id, admin };
}
