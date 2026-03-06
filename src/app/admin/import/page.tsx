import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { FileJson } from "lucide-react";
import { ImportCampaignForm } from "@/components/admin/import-campaign-form";

export const dynamic = "force-dynamic";

export default async function AdminImportPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const admin = createSupabaseAdminClient();
  const { data: profileRaw } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const profile = profileRaw as { role?: string } | null;

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-barber-paper sm:text-2xl">
            <FileJson className="h-6 w-6 text-barber-gold" />
            Importa Campagna
          </h1>
          <p className="mt-2 text-sm text-barber-paper/70">
            Incolla il JSON della campagna (struttura piatta: title, description, type, image_url, wiki, maps, characters, gm_secrets). La campagna sarà creata con te come GM.
          </p>
        </header>
        <ImportCampaignForm />
      </div>
    </div>
  );
}
