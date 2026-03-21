import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { CompendiumPageClient } from "@/components/compendium/compendium-page-client";

export const dynamic = "force-dynamic";

export default async function CompendiumPage() {
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

  if (profile?.role !== "gm" && profile?.role !== "admin") {
    redirect("/dashboard");
  }

  return <CompendiumPageClient />;
}
