import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { Button } from "@/components/ui/button";
import { SessionList } from "@/components/session-list";
import { CreateSessionDialog } from "@/components/create-session-dialog";
import { MapGallery } from "@/components/maps/map-gallery";
import { UploadMapDialog } from "@/components/maps/upload-map-dialog";
import { WikiList } from "@/components/wiki/wiki-list";
import { CreateEntityDialog } from "@/components/wiki/create-entity-dialog";
import { DeleteCampaignButton } from "@/components/delete-campaign-button";
import { CampaignVisibilityToggle } from "@/components/campaign-visibility-toggle";
import { EditCampaignDialog } from "@/components/campaigns/edit-campaign-dialog";
import { CampaignTabsClient } from "@/components/campaigns/campaign-tabs-client";
import { ArrowLeft } from "lucide-react";

const PLACEHOLDER_IMAGE =
  "https://placehold.co/1200x400/1e293b/10b981/png?text=Campagna";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CampaignPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const { data: campaign, error } = await supabase
    .from("campaigns")
    .select("id, name, description, gm_id, is_public, type, image_url")
    .eq("id", id)
    .single();

  if (error || !campaign) {
    notFound();
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  /** Solo GM e Admin possono creare sessioni, wiki, mappe. I player solo visualizzano. */
  const isGmOrAdmin = profile?.role === "gm" || profile?.role === "admin";

  /** Lista GM/Admin per la select DM nel form Nuova Sessione (solo se isGmOrAdmin). */
  let gmAdminUsers: { id: string; label: string }[] = [];
  if (isGmOrAdmin) {
    const admin = createSupabaseAdminClient();
    const { data: gmAdminsRaw } = await admin
      .from("profiles")
      .select("id, first_name, last_name, display_name")
      .in("role", ["gm", "admin"])
      .order("first_name");
    type GmProfileRow = { id: string; first_name: string | null; last_name: string | null; display_name: string | null };
    const gmAdmins = (gmAdminsRaw ?? []) as GmProfileRow[];
    gmAdminUsers = gmAdmins.map((p) => {
      const full = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
      const label = full || p.display_name?.trim() || `Utente ${p.id.slice(0, 8)}`;
      return { id: p.id, label };
    });
  }

  /** Accesso ai contenuti (Wiki/Mappe): GM/Admin sempre; Player solo se ha giocato (RPC). */
  let hasPlayedCampaign = isGmOrAdmin;
  if (!hasPlayedCampaign) {
    const { data: played } = await supabase.rpc("has_played_campaign", {
      p_user_id: user.id,
      p_campaign_id: id,
    });
    hasPlayedCampaign = played === true;
  }

  const campaignTypeLabels: Record<string, string> = {
    oneshot: "Oneshot",
    quest: "Quest",
    long: "Campagna lunga",
  };
  const campaignTypeLabel = campaign.type ? campaignTypeLabels[campaign.type] ?? campaign.type : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-900">
      <div className="relative">
        <header className="relative h-48 overflow-hidden bg-slate-950 sm:h-56 md:h-64">
          <Image
            src={campaign.image_url ?? PLACEHOLDER_IMAGE}
            alt=""
            fill
            className="object-contain"
            priority
            sizes="100vw"
            unoptimized={!!campaign.image_url}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Link href="/dashboard" className="inline-flex text-slate-300 hover:text-slate-50">
                <Button variant="ghost" size="sm" className="text-slate-300">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
              {isGmOrAdmin && (
                <>
                  <EditCampaignDialog
                    campaign={{
                      id: campaign.id,
                      name: campaign.name,
                      description: campaign.description ?? null,
                      type: campaign.type ?? null,
                      image_url: campaign.image_url ?? null,
                    }}
                  />
                  <CampaignVisibilityToggle
                    campaignId={campaign.id}
                    isPublic={campaign.is_public ?? false}
                  />
                  <DeleteCampaignButton campaignId={campaign.id} campaignName={campaign.name} />
                </>
              )}
            </div>
            <h1 className="text-2xl font-semibold text-white drop-shadow-md md:text-3xl">
              {campaign.name}
            </h1>
            {campaign.description && (
              <p className="mt-1 max-w-2xl text-sm text-slate-200 drop-shadow md:text-base">
                {campaign.description}
              </p>
            )}
          </div>
        </header>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8">
        <CampaignTabsClient
          campaignId={campaign.id}
          campaign={{
            id: campaign.id,
            name: campaign.name,
            description: campaign.description ?? null,
            type: campaign.type ?? null,
            image_url: campaign.image_url ?? null,
          }}
          hasPlayedCampaign={hasPlayedCampaign}
          campaignTypeLabel={campaignTypeLabel}
          sessioniContent={
            <>
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-lg font-semibold text-slate-50">
                  Prossime sessioni
                </h2>
                {isGmOrAdmin && (
                  <CreateSessionDialog
                    campaignId={campaign.id}
                    gmAdminUsers={gmAdminUsers}
                    defaultDmId={profile?.role === "gm" || profile?.role === "admin" ? user.id : null}
                  />
                )}
              </div>
              <SessionList campaignId={campaign.id} />
            </>
          }
          wikiContent={
            hasPlayedCampaign ? (
              <>
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                  <h2 className="text-lg font-semibold text-slate-50">
                    Wiki della campagna
                  </h2>
                  {isGmOrAdmin && (
                    <CreateEntityDialog campaignId={campaign.id} />
                  )}
                </div>
                <WikiList campaignId={campaign.id} />
              </>
            ) : null
          }
          mappeContent={
            hasPlayedCampaign ? (
              <>
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                  <h2 className="text-lg font-semibold text-slate-50">
                    Mappe della campagna
                  </h2>
                  {isGmOrAdmin && (
                    <UploadMapDialog campaignId={campaign.id} />
                  )}
                </div>
                <MapGallery campaignId={campaign.id} />
              </>
            ) : null
          }
        />
      </div>
    </div>
  );
}
