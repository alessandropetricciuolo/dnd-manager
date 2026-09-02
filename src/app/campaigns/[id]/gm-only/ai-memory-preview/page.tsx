import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, FlaskConical, ShieldCheck } from "lucide-react";

import { AiMemoryPreviewPanel } from "@/components/gm/ai-memory-preview-panel";
import { Button } from "@/components/ui/button";
import { CAMPAIGN_CONTENT_SHELL } from "@/lib/layout/shell-classes";
import { createSupabaseServerClient } from "@/utils/supabase/server";

type PageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

/** Ambiente di test isolato: non montare questa preview nella UI GM normale. */
export default async function AiMemoryPreviewPage({ params }: PageProps) {
  const { id: campaignId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // Admin-only: notFound evita di rivelare l'esistenza della preview a GM/player.
  if (profile?.role !== "admin") notFound();

  const { data: campaign, error } = await supabase
    .from("campaigns")
    .select("id, name, type")
    .eq("id", campaignId)
    .single();

  if (error || !campaign || campaign.type !== "long") notFound();

  return (
    <main className={`min-h-[calc(100vh-64px)] bg-barber-dark text-barber-paper ${CAMPAIGN_CONTENT_SHELL}`}>
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-amber-500/30 bg-amber-950/10 p-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.18em] text-amber-300/75">
              <ShieldCheck className="h-4 w-4" aria-hidden />
              Ambiente Admin-only
            </div>
            <h1 className="flex items-center gap-2 text-xl font-semibold text-amber-100 sm:text-2xl">
              <FlaskConical className="h-6 w-6 text-amber-300" aria-hidden />
              AI Memory Preview
            </h1>
            <p className="text-sm text-barber-paper/65">
              {campaign.name} · test isolato del nuovo retrieval grounded. Questa pagina non modifica il canone e non sostituisce l&apos;AI legacy.
            </p>
          </div>
          <Button asChild variant="outline" className="border-barber-gold/40 text-barber-paper/90">
            <Link href={`/campaigns/${campaignId}?tab=gm`}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              Strumenti GM
            </Link>
          </Button>
        </header>

        <AiMemoryPreviewPanel campaignId={campaignId} />
      </div>
    </main>
  );
}
