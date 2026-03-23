import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { Palette } from "lucide-react";
import { StyleManager } from "./style-manager";
import type { AdminAiImageStyleRow } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminAiImageStylesPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createSupabaseAdminClient();
  const { data: profileRaw } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const profile = profileRaw as { role?: string } | null;

  if (profile?.role !== "admin") redirect("/dashboard");

  const { data, error } = await admin
    .from("ai_image_styles")
    .select("id, key, name, description, positive_prompt, negative_prompt, is_active, sort_order")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    return (
      <div className="p-6">
        <p className="text-red-400">Errore caricamento stili AI: {error.message}</p>
      </div>
    );
  }

  const styles = (data ?? []) as AdminAiImageStyleRow[];

  return (
    <div className="p-4 py-8 md:p-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="space-y-2">
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-barber-paper">
            <Palette className="h-6 w-6 text-barber-gold" />
            Stili Immagini AI Globali
          </h1>
          <p className="text-sm text-barber-paper/70">
            Crea e gestisci il catalogo stili globale. Ogni campagna seleziona uno stile da questa lista.
          </p>
        </header>
        <StyleManager initialStyles={styles} />
      </div>
    </div>
  );
}
