import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { IMAGE_BLUR_PLACEHOLDER } from "@/lib/utils";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
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
import { GmNotes } from "@/components/gm/gm-notes";
import { GmFiles } from "@/components/gm/gm-files";
import { CharactersSection } from "@/components/characters/characters-section";
import { getCampaignCharacters, getCampaignEligiblePlayers } from "@/app/campaigns/character-actions";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CampaignMobileHeader } from "@/components/campaigns/campaign-mobile-header";

const PLACEHOLDER_IMAGE =
  "https://placehold.co/1200x400/1e293b/10b981/png?text=Campagna";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CampaignPage({ params }: PageProps) {
  const { id } = await params;

  let supabase;
  try {
    supabase = await createSupabaseServerClient();
  } catch (e) {
    console.error("[campaigns/[id]] createSupabaseServerClient", e);
    redirect("/dashboard");
  }

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

  /** Nome del GM per la colonna sinistra */
  let gmDisplayName: string | null = null;
  if (campaign.gm_id) {
    const { data: gmProfile } = await supabase
      .from("profiles")
      .select("first_name, last_name, display_name")
      .eq("id", campaign.gm_id)
      .single();
    if (gmProfile) {
      const full = [gmProfile.first_name, gmProfile.last_name].filter(Boolean).join(" ").trim();
      gmDisplayName = full || (gmProfile.display_name ?? "").trim() || null;
    }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  /** Solo GM e Admin possono creare sessioni, wiki, mappe. I player solo visualizzano. */
  const isGmOrAdmin = profile?.role === "gm" || profile?.role === "admin";
  const isAdmin = profile?.role === "admin";

  /** Lista GM/Admin per la select DM nel form Nuova Sessione (solo se isGmOrAdmin). */
  let gmAdminUsers: { id: string; label: string }[] = [];
  if (isGmOrAdmin) {
    try {
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
    } catch (e) {
      console.error("[campaigns/[id]] admin client o lista GM", e);
    }
  }

  /** Accesso ai contenuti (Wiki/Mappe): GM/Admin sempre; Player solo se ha giocato (RPC). */
  let hasPlayedCampaign = isGmOrAdmin;
  if (!hasPlayedCampaign) {
    try {
      const { data: played } = await supabase.rpc("has_played_campaign", {
        p_user_id: user.id,
        p_campaign_id: id,
      });
      hasPlayedCampaign = played === true;
    } catch (e) {
      console.error("[campaigns/[id]] has_played_campaign RPC", e);
    }
  }

  const charsResult = await getCampaignCharacters(id);
  const characters = charsResult.success ? charsResult.data ?? [] : [];

  let eligiblePlayers: { id: string; label: string }[] = [];
  if (isGmOrAdmin) {
    const playersResult = await getCampaignEligiblePlayers(id);
    if (playersResult.success && playersResult.data) eligiblePlayers = playersResult.data;
  }

  const campaignTypeLabels: Record<string, string> = {
    oneshot: "Oneshot",
    quest: "Quest",
    long: "Campagna lunga",
  };
  const campaignTypeLabel = campaign.type ? campaignTypeLabels[campaign.type] ?? campaign.type : null;

  const leftColumnContent = (
    <>
      <div className="relative aspect-[21/9] min-h-[140px] w-full shrink-0 overflow-hidden rounded-lg bg-barber-dark">
        <Image
          src={campaign.image_url ?? PLACEHOLDER_IMAGE}
          alt=""
          fill
          className="object-cover"
          priority
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          placeholder="blur"
          blurDataURL={IMAGE_BLUR_PLACEHOLDER}
          unoptimized={!!campaign.image_url}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-barber-dark via-barber-dark/50 to-transparent" />
      </div>
      <div className="flex flex-col gap-3 p-4">
        <h1 className="text-xl font-semibold text-barber-paper md:text-2xl">
          {campaign.name}
        </h1>
        {campaignTypeLabel && (
          <span className="inline-block w-fit rounded-full border border-barber-gold/50 bg-barber-gold/10 px-3 py-1 text-xs font-medium text-barber-gold">
            {campaignTypeLabel}
          </span>
        )}
        {campaign.description ? (
          <p className="text-sm text-barber-paper/80 leading-relaxed whitespace-pre-wrap">
            {campaign.description}
          </p>
        ) : null}
        {gmDisplayName && (
          <p className="text-sm text-barber-gold/90">
            GM · {gmDisplayName}
          </p>
        )}
        {!hasPlayedCampaign && (
          <p className="rounded-lg border border-barber-gold/40 bg-barber-gold/10 px-3 py-2 text-xs text-barber-gold">
            Partecipa a una sessione per sbloccare Wiki e Mappe.
          </p>
        )}
        {isGmOrAdmin && (
          <div className="flex flex-wrap gap-2">
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
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="h-[calc(100vh-theme(spacing.16))] overflow-hidden bg-barber-dark">
      {/* Mobile: cover in alto, poi area scroll con tabs sticky + contenuto */}
      <div className="flex h-full flex-col lg:flex-row">
        {/* Colonna sinistra (solo desktop): fissa, scroll interna */}
        <aside className="hidden min-h-0 w-80 shrink-0 flex-col border-r border-barber-gold/20 bg-barber-dark lg:flex">
          <ScrollArea className="min-h-0 flex-1">
            <div className="min-h-0">{leftColumnContent}</div>
          </ScrollArea>
        </aside>

        {/* Mobile: barra con hamburger + indietro + titolo */}
        <CampaignMobileHeader
          isAdmin={isAdmin}
          isGmOrAdmin={isGmOrAdmin}
          campaignName={campaign.name}
        />
        {/* Mobile: cover immagine + GM */}
        <div className="relative h-28 shrink-0 overflow-hidden bg-barber-dark lg:hidden">
          <Image
            src={campaign.image_url ?? PLACEHOLDER_IMAGE}
            alt=""
            fill
            className="object-cover"
            sizes="100vw"
            unoptimized={!!campaign.image_url}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-barber-dark via-barber-dark/80 to-transparent" />
          {gmDisplayName && (
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <p className="text-xs text-barber-gold/90">GM · {gmDisplayName}</p>
            </div>
          )}
        </div>

        {/* Colonna destra: scroll, tabs sticky in cima */}
        <main className="min-h-0 min-w-0 flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="min-h-0 flex-1 overflow-x-hidden">
            <div className="min-w-0 w-full max-w-full px-4 pb-8 pt-4 lg:px-6 lg:pt-6">
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
              {isGmOrAdmin && !(campaign.is_public ?? false) && (
                <div className="mb-4 rounded-lg border border-amber-500/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-200">
                  <strong>Campagna privata.</strong> I player non vedono le sessioni in calendario e non possono prenotarsi. Usa il pulsante &quot;Privata&quot; in alto per renderla pubblica e permettere le prenotazioni.
                </div>
              )}
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-lg font-semibold text-barber-paper">
                  In programma
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
                  <h2 className="text-lg font-semibold text-barber-paper">
                    Wiki
                  </h2>
                  {isGmOrAdmin && (
                    <CreateEntityDialog campaignId={campaign.id} eligiblePlayers={eligiblePlayers} />
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
                  <h2 className="text-lg font-semibold text-barber-paper">
                    Mappe
                  </h2>
                  {isGmOrAdmin && (
                    <UploadMapDialog campaignId={campaign.id} eligiblePlayers={eligiblePlayers} />
                  )}
                </div>
                <MapGallery campaignId={campaign.id} eligiblePlayers={eligiblePlayers} />
              </>
            ) : null
          }
          pgContent={
            <CharactersSection
              campaignId={campaign.id}
              characters={characters}
              eligiblePlayers={eligiblePlayers}
              isGm={isGmOrAdmin}
            />
          }
          gmAreaContent={
            isGmOrAdmin ? (
              <div className="rounded-xl border-2 border-violet-800/60 bg-slate-950/80 p-6 shadow-inner">
                <p className="mb-6 text-sm text-violet-200/80">
                  Note e file privati, visibili solo a te.
                </p>
                <div className="space-y-8">
                  <GmNotes campaignId={campaign.id} />
                  <GmFiles campaignId={campaign.id} />
                </div>
              </div>
            ) : undefined
          }
        />
            </div>
          </ScrollArea>
        </main>
      </div>
    </div>
  );
}
