import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { ScanSearch } from "lucide-react";
import { DEFAULT_OPENROUTER_IMAGE_MODEL } from "@/lib/ai/openrouter-image-preview";
import { listCampaignsForImagePromptDebugAction } from "./actions";
import { ImagePromptDebugClient } from "./prompt-debug-client";

export const dynamic = "force-dynamic";

export default async function AdminImagePromptDebugPage() {
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

  const listed = await listCampaignsForImagePromptDebugAction();
  const campaigns = listed.success ? listed.campaigns : [];
  const models = listed.success ? listed.models : [];

  return (
    <div className="p-4 py-8 md:p-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="space-y-2">
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-barber-paper">
            <ScanSearch className="h-6 w-6 text-barber-gold" />
            Debug prompt immagini AI
          </h1>
          <p className="text-sm text-barber-paper/70">
            Anteprima del prompt assemblato (paletti Architetto, memoria IA, stile) e payload OpenRouter per{" "}
            <code className="text-barber-gold">POST /v1/chat/completions</code> con{" "}
            <code className="text-barber-gold">modalities: [&quot;image&quot;]</code>. Puoi anche generare
            un&apos;immagine di test via OpenRouter. Solo admin.
          </p>
        </header>

        {!listed.success && (
          <p className="text-sm text-red-400">Errore caricamento campagne: {listed.message}</p>
        )}

        <ImagePromptDebugClient
          campaigns={campaigns}
          models={models}
          defaultModel={DEFAULT_OPENROUTER_IMAGE_MODEL}
        />
      </div>
    </div>
  );
}
