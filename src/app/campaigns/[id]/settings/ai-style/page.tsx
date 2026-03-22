import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { Button } from "@/components/ui/button";
import { AiStyleForm } from "./ai-style-form";

type PageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export default async function CampaignAiStylePage({ params }: PageProps) {
  const { id: campaignId } = await params;
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
  const role = (profileRaw as { role?: string } | null)?.role ?? "";

  type CampaignStyleRow = {
    id: string;
    name: string;
    gm_id: string | null;
    image_style_prompt?: string | null;
  };

  let campaign: CampaignStyleRow | null = null;
  let campaignError: { message?: string } | null = null;

  const primaryQuery = await supabase
    .from("campaigns")
    .select("id, name, gm_id, image_style_prompt")
    .eq("id", campaignId)
    .single();
  campaign = primaryQuery.data as CampaignStyleRow | null;
  campaignError = primaryQuery.error as { message?: string } | null;

  // Compatibilità: se la colonna nuova non è presente in DB, fallback a query base.
  if (campaignError?.message?.toLowerCase().includes("image_style_prompt")) {
    const fallbackQuery = await supabase
      .from("campaigns")
      .select("id, name, gm_id")
      .eq("id", campaignId)
      .single();
    campaign = fallbackQuery.data as CampaignStyleRow | null;
    campaignError = fallbackQuery.error as { message?: string } | null;
  }

  if (campaignError || !campaign) redirect("/dashboard");

  const isAllowed = role === "admin" || (role === "gm" && campaign.gm_id === user.id);
  if (!isAllowed) redirect(`/campaigns/${campaignId}`);

  return (
    <main className="min-h-[calc(100vh-64px)] bg-barber-dark px-4 py-8 text-barber-paper md:px-8">
      <div className="mx-auto w-full max-w-3xl space-y-5 rounded-xl border border-barber-gold/25 bg-barber-dark/75 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-barber-gold">
            Stile Immagini AI · {campaign.name}
          </h1>
          <Button asChild variant="outline" className="border-barber-gold/40 text-barber-paper/90">
            <Link href={`/campaigns/${campaignId}?tab=gm`}>Torna a Solo GM</Link>
          </Button>
        </div>

        <AiStyleForm
          campaignId={campaignId}
          initialValue={typeof campaign.image_style_prompt === "string" ? campaign.image_style_prompt : ""}
        />
      </div>
    </main>
  );
}
