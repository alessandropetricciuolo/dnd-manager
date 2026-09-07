import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { adaptLegacyToTacticalScene, canManageTacticalScene, parseTacticalScene, type LegacyExplorationMapRow, type LegacyFowRegionRow, type LegacySceneDocumentRow } from "@/lib/scene-runtime";
import { SceneWorkspaceClient } from "@/components/scene-runtime/scene-workspace-client";

type Props = { params: Promise<{ id: string }>; searchParams?: Promise<{ sceneId?: string }> };

/**
 * R6.3 boundary: authorization is checked before the campaign/scene queries.
 * This route intentionally uses the user's server client only; there are no
 * client-side privileged queries and no service-role fallback. Legacy data is
 * adapted read-only and all editing remains in browser memory until R6.4.
 */
export default async function SceneWorkspacePage({ params, searchParams }: Props) {
  const { id: campaignId } = await params;
  const requestedSceneId = (await searchParams)?.sceneId;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/dashboard");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!canManageTacticalScene(profile?.role)) notFound();

  const { data: campaign } = await supabase.from("campaigns").select("id, name").eq("id", campaignId).single();
  if (!campaign) notFound();

  const { data: documents } = await supabase.from("campaign_scene_documents").select("id, campaign_id, name, linked_mission_id, document, document_version").eq("campaign_id", campaignId).order("updated_at", { ascending: false }).limit(20);
  const document = (documents?.[0] ?? null) as LegacySceneDocumentRow | null;
  let initialScene;
  let persistedSceneId: string | undefined;
  let persistedRevisionId: string | undefined;
  let report: { severity: string; code: string; message: string }[] = [];
  const { data: persisted } = await supabase.from("tactical_scenes").select("id, current_revision_no").eq("campaign_id", campaignId).eq(requestedSceneId ? "id" : "campaign_id", requestedSceneId ?? campaignId).order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (persisted) {
    const { data: revision } = await supabase.from("tactical_scene_revisions").select("id, document").eq("scene_id", persisted.id).eq("revision_no", persisted.current_revision_no).maybeSingle();
    const parsed = revision ? parseTacticalScene(revision.document) : null;
    if (revision && parsed?.ok) { initialScene = parsed.scene; persistedSceneId = persisted.id; persistedRevisionId = revision.id; }
  }
  if (!initialScene && document) {
    const { data: maps } = await supabase.from("campaign_exploration_maps").select("id, campaign_id, linked_mission_id, floor_label, sort_order, image_path, source_type, scene_document_id, scene_floor_id, grid_cell_meters, grid_source_cell_px, grid_cells_w, grid_cells_h, grid_offset_x_cells, grid_offset_y_cells, grid_kind").eq("campaign_id", campaignId).eq("scene_document_id", document.id);
    const mapRows = (maps ?? []) as unknown as LegacyExplorationMapRow[];
    const mapIds = mapRows.map((row) => row.id);
    const { data: regions } = mapIds.length ? await supabase.from("campaign_exploration_fow_regions").select("id, map_id, polygon, is_revealed, sort_order, source_area_id").in("map_id", mapIds) : { data: [] };
    const adapted = adaptLegacyToTacticalScene({ sceneDocument: document, explorationMaps: mapRows, fowRegions: (regions ?? []) as unknown as LegacyFowRegionRow[] });
    initialScene = adapted.scene;
    report = adapted.report.entries;
  } else {
    report = [{ severity: "converted", code: "no_legacy_scene", message: "Nessuna scena legacy caricata: il workspace parte da una scena locale vuota." }];
  }

  const { data: sceneList } = await supabase.from("tactical_scenes").select("id,name,lifecycle,current_revision_no,updated_at").eq("campaign_id", campaignId).order("updated_at", { ascending: false });
  return <div className="flex min-h-screen flex-col bg-[#110f0f] text-barber-paper"><header className="flex shrink-0 items-center gap-3 border-b border-barber-gold/20 bg-[#191514] px-4 py-3 sm:px-6"><Button variant="ghost" size="sm" asChild className="text-barber-gold hover:bg-barber-gold/10"><Link href={`/campaigns/${campaignId}/gm-screen`}><ArrowLeft className="mr-1.5 h-4 w-4" />GM screen</Link></Button><Map className="h-5 w-5 text-barber-gold" /><span className="font-serif text-lg">Scene Workspace</span><nav className="ml-auto flex gap-2 overflow-auto">{(sceneList ?? []).map((item) => <Link key={item.id} href={`/campaigns/${campaignId}/gm-only/scene-workspace?sceneId=${item.id}`} className={`rounded px-2 py-1 text-xs ${item.id === requestedSceneId ? "bg-barber-gold/25 text-barber-gold" : "text-barber-paper/60"}`}>{item.name}</Link>)}</nav></header><SceneWorkspaceClient campaignId={campaignId} campaignName={campaign.name} initialScene={initialScene} report={report} persistedSceneId={persistedSceneId} persistedRevisionId={persistedRevisionId} /></div>;
}
