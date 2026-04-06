import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { parseMapOverlayItems } from "@/lib/maps/overlay-parse";
import { Button } from "@/components/ui/button";
import { MapOverlayEditor } from "@/components/maps/map-overlay-editor";

type PageProps = {
  params: Promise<{ id: string; mapId: string }>;
};

export default async function MapOverlayEditPage({ params }: PageProps) {
  const { id: campaignId, mapId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  const { data: campaign, error: campErr } = await supabase
    .from("campaigns")
    .select("type, gm_id")
    .eq("id", campaignId)
    .single();
  if (campErr || !campaign) notFound();

  const c = campaign as { type?: string; gm_id?: string };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const role = (profile as { role?: string } | null)?.role;
  const isAdmin = role === "admin";
  const isOwnerGm = c.gm_id === user.id;
  const canEdit = c.type === "long" && (isAdmin || isOwnerGm);
  if (!canEdit) notFound();

  const { data: map, error: mapError } = await supabase
    .from("maps")
    .select("id, name, image_url, campaign_id, overlay_items, overlay_draft")
    .eq("id", mapId)
    .eq("campaign_id", campaignId)
    .single();

  if (mapError || !map) notFound();

  const row = map as {
    name: string;
    image_url: string;
    overlay_items?: unknown;
    overlay_draft?: unknown;
  };
  const published = parseMapOverlayItems(row.overlay_items);
  const draft =
    row.overlay_draft != null ? parseMapOverlayItems(row.overlay_draft) : null;
  const initialItems = draft ?? published;
  /** Allinea lo stato client dopo salvataggio/pubblicazione (router.refresh). */
  const overlayRevision = (() => {
    try {
      return JSON.stringify({ draft: row.overlay_draft ?? null, published: row.overlay_items ?? null });
    } catch {
      return `${String(row.overlay_draft)}|${String(row.overlay_items)}`;
    }
  })();

  const { data: campaignMaps } = await supabase
    .from("maps")
    .select("id, name")
    .eq("campaign_id", campaignId)
    .neq("id", mapId)
    .order("name");

  return (
    <div className="min-h-0 flex-1">
      <div className="hidden min-h-0 lg:block">
        <MapOverlayEditor
          campaignId={campaignId}
          mapId={mapId}
          imageUrl={row.image_url}
          mapName={row.name}
          campaignMaps={(campaignMaps ?? []).map((m) => ({ id: m.id, name: m.name }))}
          initialItems={initialItems}
          overlayRevision={overlayRevision}
        />
      </div>

      <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 px-4 lg:hidden">
        <p className="text-center text-slate-200">
          L’editor delle pin sulla mappa è disponibile da desktop (schermo largo).
        </p>
        <Link href={`/campaigns/${campaignId}/maps/${mapId}`}>
          <Button variant="outline" className="border-barber-gold/50">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Torna alla mappa
          </Button>
        </Link>
      </div>
    </div>
  );
}
