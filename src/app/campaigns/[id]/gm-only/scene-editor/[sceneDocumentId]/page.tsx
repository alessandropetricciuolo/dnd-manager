import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Map } from "lucide-react";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/button";
import { getSceneDocumentAction } from "@/app/campaigns/scene-document-actions";
import { SceneEditorClient } from "@/components/scene-editor/scene-editor-client";
import { CAMPAIGN_CONTENT_SHELL } from "@/lib/layout/shell-classes";

type PageProps = {
  params: Promise<{ id: string; sceneDocumentId: string }>;
};

export default async function SceneEditorPage({ params }: PageProps) {
  const { id: campaignId, sceneDocumentId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/dashboard");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "gm" && profile?.role !== "admin") notFound();

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, name, type")
    .eq("id", campaignId)
    .single();
  if (!campaign) notFound();

  const loaded = await getSceneDocumentAction(campaignId, sceneDocumentId);
  if (!loaded.success) notFound();

  let missionOptions: { id: string; title: string }[] = [];
  if (campaign.type === "long") {
    const { data: missions } = await supabase
      .from("campaign_missions")
      .select("id, title")
      .eq("campaign_id", campaignId)
      .order("title", { ascending: true });
    missionOptions = (missions ?? []).map((m: { id: string; title: string }) => ({
      id: m.id,
      title: m.title?.trim() ? m.title : "Senza titolo",
    }));
  }

  return (
    <div className="flex min-h-[calc(100vh-theme(spacing.16))] flex-col bg-gradient-to-b from-[#12100f] to-[#1d1714] text-barber-paper">
      <header className="flex shrink-0 flex-wrap items-center gap-4 border-b border-barber-gold/25 bg-barber-dark/90 px-4 py-3">
        <Button variant="ghost" size="sm" asChild className="text-barber-gold hover:bg-barber-gold/10">
          <Link href={`/campaigns/${campaignId}/gm-only/scene-editor`}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Scene Editor
          </Link>
        </Button>
        <Map className="h-5 w-5 text-barber-gold" aria-hidden />
        <h1 className="text-lg font-semibold text-barber-gold">{loaded.data!.document.name}</h1>
        <span className="text-sm text-barber-paper/60">{campaign.name}</span>
      </header>
      <div className={`${CAMPAIGN_CONTENT_SHELL} flex min-h-0 flex-1 flex-col`}>
        <SceneEditorClient
          campaignId={campaignId}
          sceneDocumentId={sceneDocumentId}
          initialDocument={loaded.data!.document}
          missionOptions={missionOptions}
        />
      </div>
    </div>
  );
}
