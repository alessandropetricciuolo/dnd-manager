import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Map } from "lucide-react";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/button";
import {
  createSceneDocumentAction,
  listSceneDocumentsAction,
} from "@/app/campaigns/scene-document-actions";
import { SceneEditorListActions } from "@/components/scene-editor/scene-editor-list-actions";
import { CAMPAIGN_CONTENT_SHELL } from "@/lib/layout/shell-classes";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function SceneEditorIndexPage({ params }: PageProps) {
  const { id: campaignId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/dashboard");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "gm" && profile?.role !== "admin") notFound();

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, name")
    .eq("id", campaignId)
    .single();
  if (!campaign) notFound();

  const listed = await listSceneDocumentsAction(campaignId);
  const scenes = listed.success ? listed.data ?? [] : [];

  async function createNewScene() {
    "use server";
    const res = await createSceneDocumentAction(campaignId);
    if (!res.success) throw new Error(res.error);
    redirect(`/campaigns/${campaignId}/gm-only/scene-editor/${res.data!.sceneDocumentId}`);
  }

  return (
    <div className="flex min-h-[calc(100vh-theme(spacing.16))] flex-col bg-gradient-to-b from-[#12100f] to-[#1d1714] text-barber-paper">
      <header className="flex shrink-0 flex-wrap items-center gap-4 border-b border-barber-gold/25 bg-barber-dark/90 px-4 py-3">
        <Button variant="ghost" size="sm" asChild className="text-barber-gold hover:bg-barber-gold/10">
          <Link href={`/campaigns/${campaignId}/gm-only/vista-dall-alto`}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Vista dall&apos;alto
          </Link>
        </Button>
        <Map className="h-5 w-5 text-barber-gold" aria-hidden />
        <h1 className="text-lg font-semibold text-barber-gold">Scene Editor</h1>
        <span className="text-sm text-barber-paper/60">{campaign.name}</span>
      </header>
      <div className={`${CAMPAIGN_CONTENT_SHELL} flex min-h-0 flex-1 flex-col space-y-6`}>
        <form action={createNewScene}>
          <Button type="submit" className="bg-barber-gold text-barber-dark hover:bg-barber-gold/90">
            <Map className="mr-2 h-4 w-4" />
            Nuova scena
          </Button>
        </form>

        {scenes.length > 0 ? (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-barber-gold">Scene esistenti</h2>
            <ul className="divide-y divide-barber-gold/15 rounded-lg border border-barber-gold/25 bg-barber-dark/50">
              {scenes.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="font-medium text-barber-paper">{s.name || "Senza nome"}</p>
                    <p className="text-xs text-barber-paper/50">
                      Aggiornata {new Date(s.updated_at).toLocaleString("it-IT")}
                    </p>
                  </div>
                  <SceneEditorListActions
                    campaignId={campaignId}
                    sceneId={s.id}
                    sceneName={s.name || "Senza nome"}
                  />
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <p className="text-sm text-barber-paper/60">Nessuna scena creata. Inizia con «Nuova scena».</p>
        )}
      </div>
    </div>
  );
}
