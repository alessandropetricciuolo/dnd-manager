import { notFound, redirect } from "next/navigation";
import { TacticalProjectionClient } from "@/components/scene-runtime/tactical-projection-client";
import { parseTacticalScene } from "@/lib/scene-runtime";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { canManageTacticalScene } from "@/lib/scene-runtime/access";

type Props = { params: Promise<{ id: string; sceneId: string }> };

/** GM-controlled second-screen surface. It reads only the active publication. */
export default async function TacticalSceneProjectionPage({ params }: Props) {
  const { id: campaignId, sceneId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/dashboard");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!canManageTacticalScene(profile?.role)) notFound();
  const { data: publication, error } = await supabase.from("tactical_scene_publications").select("document, scene_id, tactical_scenes!inner(campaign_id)").eq("scene_id", sceneId).is("revoked_at", null).single();
  if (error || !publication || (publication.tactical_scenes as { campaign_id?: string } | null)?.campaign_id !== campaignId) notFound();
  const parsed = parseTacticalScene(publication.document);
  if (!parsed.ok) notFound();
  return <main className="flex min-h-screen items-center justify-center bg-black p-3 sm:p-8"><div className="w-full max-w-[1920px]"><TacticalProjectionClient sceneId={sceneId} initialScene={parsed.scene} /></div></main>;
}
