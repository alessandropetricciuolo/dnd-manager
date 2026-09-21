import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { SessionList } from "@/components/session-list";
import { SessionHistoryManager } from "@/components/sessions/session-history-manager";
import { CompletedSessionsListForPlayer } from "@/components/sessions/completed-sessions-list-for-player";
import { PlayerFeedbackSection } from "@/components/feedback/player-feedback-section";
import { CreateSessionDialog } from "@/components/create-session-dialog";
import { MapGallery } from "@/components/maps/map-gallery";
import { BulkImportMapsDialog } from "@/components/maps/bulk-import-maps-dialog";
import { UploadMapDialog } from "@/components/maps/upload-map-dialog";
import { WikiList } from "@/components/wiki/wiki-list";
import { CreateEntityDialog } from "@/components/wiki/create-entity-dialog";
import { BulkImportWikiDialog } from "@/components/wiki/bulk-import-wiki-dialog";
import { DownloadWikiArchiveButton } from "@/components/wiki/download-wiki-archive-button";
import { DeleteCampaignButton } from "@/components/delete-campaign-button";
import { CampaignVisibilityToggle } from "@/components/campaign-visibility-toggle";
import { EditCampaignDialog } from "@/components/campaigns/edit-campaign-dialog";
import { CampaignWorkspace } from "@/components/campaigns/campaign-workspace";
import { JoinLongCampaignButton } from "@/components/campaigns/join-long-campaign-button";
import { LongRegistrationsToggle } from "@/components/campaigns/long-registrations-toggle";
import { CampaignPartyMembersPanel } from "@/components/campaigns/campaign-party-members-panel";
import { GmHomepage } from "@/components/gm/gm-homepage";
import { GmScreenLauncher } from "@/components/gm/gm-screen-launcher";
import Link from "next/link";
import { ChevronDown, Map as MapIcon } from "lucide-react";
import { InteractiveMap, type MapCharacterPin } from "@/components/map/InteractiveMap";
import type { Portal } from "@/lib/nav/navigation-math";
import { MissionBoardSection } from "@/components/missions/mission-board-section";
import { BulkImportMissionsDialog } from "@/components/missions/bulk-import-missions-dialog";
import { CharactersSection } from "@/components/characters/characters-section";
import { ImportCharactersFromCatalogDialog } from "@/components/characters/import-characters-from-catalog-dialog";
import { DownloadCampaignSheetsButton } from "@/components/characters/download-campaign-sheets-button";
import { CreateCharacterDialog } from "@/components/characters/create-character-dialog";
import { getCampaignCharacters, getCampaignEligiblePlayers } from "@/app/campaigns/character-actions";
import { getPreClosedSessionForCampaign, type PreClosedSessionRow } from "@/app/campaigns/gm-actions";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { CalendarDays } from "lucide-react";
import {
  parseCampaignAiContextFromDb,
  readExcludedManualBookKeysFromAiContextJson,
  type CampaignAiContext,
} from "@/lib/campaign-ai-context";
import type { Json } from "@/types/database.types";
import {
  CAMPAIGN_TYPE_LABELS,
  isLongCampaignType,
  isTorneoCampaignType,
  type CampaignType,
} from "@/lib/campaign-type";
import { cn } from "@/lib/utils";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const CAMPAIGN_TAB_VALUES = ["sessioni", "wiki", "mappe", "missioni", "pg", "gm"] as const;
type CampaignTabValue = (typeof CAMPAIGN_TAB_VALUES)[number];

function parseCampaignTab(raw: string | string[] | undefined): CampaignTabValue | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value && CAMPAIGN_TAB_VALUES.includes(value as CampaignTabValue) ? (value as CampaignTabValue) : null;
}

export default async function CampaignPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = (await searchParams) ?? {};
  const requestedTab = parseCampaignTab(sp.tab);
  const openCreateDialogOnLoad =
    (typeof sp.openCreateCharacter === "string" ? sp.openCreateCharacter : "") === "1";
  const openEditCharacterId =
    typeof sp.openEditCharacter === "string" && sp.openEditCharacter.trim()
      ? sp.openEditCharacter.trim()
      : null;

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
    console.log("[campaigns/[id]] debug (no user)", {
      requestedId: id,
      user,
    });
    notFound();
  }

  const { data: campaign, error } = await supabase
    .from("campaigns")
    .select(
      "id, name, description, gm_id, is_public, type, image_url, is_long_campaign, player_primer, primer_typography, long_registrations_open, admin_drafts_enabled"
    )
    .eq("id", id)
    .single();

  console.log(
    "[campaigns/[id]] debug",
    "ID richiesto:",
    id,
    "Risultato DB:",
    campaign,
    "Errore DB:",
    error
  );

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

  /** Solo ruoli globali GM/Admin possono gestire PG/schede in tutte le campagne. */
  const isGmOrAdmin = profile?.role === "gm" || profile?.role === "admin";
  const isAdmin = profile?.role === "admin";
  const wantsSessionTab = requestedTab == null || requestedTab === "sessioni";
  const wantsWikiTab = requestedTab === "wiki";
  const wantsMappeTab = requestedTab === "mappe";
  const wantsPgTab = requestedTab === "pg" || openCreateDialogOnLoad || openEditCharacterId != null;
  const wantsGmTab = requestedTab === "gm";

  /** Contesto AI: solo GM/Admin (non esposto ai player nel payload). */
  let aiContextParsed: CampaignAiContext | null = null;
  let excludedManualBookKeys: string[] = [];
  if (isGmOrAdmin && wantsGmTab) {
    const { data: aiRow } = await supabase
      .from("campaigns")
      .select("ai_context")
      .eq("id", id)
      .single();
    const rawAi = (aiRow as { ai_context: Json | null } | null)?.ai_context ?? null;
    aiContextParsed = parseCampaignAiContextFromDb(rawAi);
    excludedManualBookKeys = readExcludedManualBookKeysFromAiContextJson(rawAi);
  }

  /** Lista GM/Admin per la select DM nel form Nuova Sessione (solo se isGmOrAdmin). */
  let gmAdminUsers: { id: string; label: string }[] = [];
  if (isGmOrAdmin && wantsSessionTab) {
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

  /** Accesso ai contenuti (Wiki/Mappe): GM/Admin sempre; Long = anche membri campagna; altri = ha giocato. */
  let hasPlayedCampaign = isGmOrAdmin;
  let isCampaignMember = false;
  if (!hasPlayedCampaign) {
    try {
      const { data: member } = await supabase
        .from("campaign_members")
        .select("id")
        .eq("campaign_id", id)
        .eq("player_id", user.id)
        .limit(1)
        .maybeSingle();
      isCampaignMember = !!member;
      if (campaign.type === "long" && isCampaignMember) {
        hasPlayedCampaign = true;
      }
      const { data: played } = await supabase.rpc("has_played_campaign", {
        p_user_id: user.id,
        p_campaign_id: id,
      });
      hasPlayedCampaign = hasPlayedCampaign || played === true;
    } catch (e) {
      console.error("[campaigns/[id]] has_played_campaign RPC", e);
    }
  }

  const charsResult = await getCampaignCharacters(id);
  const characters = charsResult.success ? charsResult.data ?? [] : [];

  let eligiblePlayers: { id: string; label: string }[] = [];
  let eligibleParties: { id: string; label: string; memberIds: string[] }[] = [];
  let playerPartyById: Record<string, string> = {};
  if (isGmOrAdmin && (wantsWikiTab || wantsMappeTab || wantsPgTab)) {
    const playersResult = await getCampaignEligiblePlayers(id);
    if (playersResult.success && playersResult.data) eligiblePlayers = playersResult.data;
    const [{ data: partiesRaw }, { data: membersRaw }] = await Promise.all([
      supabase.from("campaign_parties").select("id, name").eq("campaign_id", id).order("name"),
      supabase.from("campaign_members").select("player_id, party_id").eq("campaign_id", id),
    ]);
    const memberIdsByPartyId = new Map<string, string[]>();
    for (const row of (membersRaw ?? []) as Array<{ player_id: string; party_id: string | null }>) {
      if (!row.party_id) continue;
      const list = memberIdsByPartyId.get(row.party_id) ?? [];
      list.push(row.player_id);
      memberIdsByPartyId.set(row.party_id, list);
    }
    eligibleParties = ((partiesRaw ?? []) as Array<{ id: string; name: string }>).map((party) => ({
      id: party.id,
      label: party.name,
      memberIds: memberIdsByPartyId.get(party.id) ?? [],
    }));
    const partyNameById = new Map(
      ((partiesRaw ?? []) as Array<{ id: string; name: string }>).map((party) => [party.id, party.name])
    );
    playerPartyById = {};
    for (const row of (membersRaw ?? []) as Array<{ player_id: string; party_id: string | null }>) {
      if (!row.party_id) continue;
      const partyName = partyNameById.get(row.party_id);
      if (partyName) playerPartyById[row.player_id] = partyName;
    }
  }
  const isViewerLockedOut = !isGmOrAdmin && isLongCampaignType(campaign.type) && !isCampaignMember;
  const isLongCampaign = isLongCampaignType(campaign.type);
  const isTorneo = isTorneoCampaignType(campaign.type);
  const showMissionsTab = isLongCampaign && (isGmOrAdmin || isCampaignMember);
  const showMappeTab = !isTorneo;
  const longRegistrationsOpen =
    (campaign as { long_registrations_open?: boolean }).long_registrations_open !== false;

  /** Griglia mondo / portali: solo GM e Admin (modello gilda: qualsiasi GM vede e modifica). */
  let worldOperationalMapUrl: string | null = null;
  let operationalPortals: Portal[] = [];
  let operationalMapCharacters: MapCharacterPin[] = [];
  if (isGmOrAdmin && wantsMappeTab) {
    let worldMapQuery = supabase
        .from("maps")
        .select("image_url, admin_only")
        .eq("campaign_id", id)
        .eq("map_type", "world")
        .order("created_at", { ascending: true })
        .limit(1);
    if (!isAdmin) worldMapQuery = worldMapQuery.eq("admin_only", false);
    const [wmRes, prRes, chRes] = await Promise.all([
      worldMapQuery.maybeSingle(),
      supabase.from("portals").select("*").eq("campaign_id", id),
      supabase
        .from("campaign_characters")
        .select("id, name, pos_x_grid, pos_y_grid, assigned_to")
        .eq("campaign_id", id)
        .order("name"),
    ]);
    worldOperationalMapUrl = wmRes.data?.image_url?.trim() || null;
    operationalPortals = (prRes.data ?? []) as Portal[];
    operationalMapCharacters =
      chRes.data?.map((r) => ({
        id: r.id,
        name: r.name,
        pos_x_grid: r.pos_x_grid,
        pos_y_grid: r.pos_y_grid,
        assigned_to: r.assigned_to ?? null,
      })) ?? [];
  }

  const campaignTypeLabel =
    campaign.type && campaign.type in CAMPAIGN_TYPE_LABELS
      ? CAMPAIGN_TYPE_LABELS[campaign.type as CampaignType]
      : campaign.type ?? null;

  /** Sessione eventualmente salvata in bozza (pre-chiusura) da un qualsiasi GM. */
  let preClosedSession: PreClosedSessionRow | null = null;
  if (isGmOrAdmin && wantsSessionTab) {
    try {
      const res = await getPreClosedSessionForCampaign(campaign.id);
      if (res.success) {
        preClosedSession = res.data ?? null;
      }
    } catch (e) {
      console.error("[campaigns/[id]] getPreClosedSessionForCampaign", e);
    }
  }

  let joinEmailSettings:
    | { join_enabled: boolean; join_subject: string; join_body_html: string }
    | null = null;
  let bulkEmailTemplates: Array<{ id: string; subject: string; body_html: string; created_at: string }> = [];
  if (isGmOrAdmin && campaign.type === "long" && wantsGmTab) {
    const [joinRes, bulkRes] = await Promise.all([
      supabase
        .from("campaign_email_settings")
        .select("join_enabled, join_subject, join_body_html")
        .eq("campaign_id", campaign.id)
        .maybeSingle(),
      supabase
        .from("campaign_bulk_email_templates")
        .select("id, subject, body_html, created_at")
        .eq("campaign_id", campaign.id)
        .order("created_at", { ascending: false }),
    ]);
    joinEmailSettings =
      (joinRes.data as { join_enabled: boolean; join_subject: string; join_body_html: string } | null) ?? null;
    bulkEmailTemplates =
      (bulkRes.data as Array<{ id: string; subject: string; body_html: string; created_at: string }> | null) ?? [];
  }

  /** Tab iniziale: player con PG assegnato → PG, player senza PG o GM → Sessioni */
  const defaultTab =
    isGmOrAdmin || characters.length === 0 ? "sessioni" : "pg";
  let initialContentTab: CampaignTabValue = requestedTab ?? defaultTab;
  if (initialContentTab === "gm" && !isGmOrAdmin) initialContentTab = defaultTab;
  if (initialContentTab === "missioni" && !showMissionsTab) initialContentTab = defaultTab;
  if (
    (initialContentTab === "wiki" || (initialContentTab === "mappe" && showMappeTab)) &&
    !hasPlayedCampaign
  ) {
    initialContentTab = "sessioni";
  }
  if (initialContentTab === "mappe" && !showMappeTab) {
    initialContentTab = defaultTab;
  }
  const renderSessioniTab = initialContentTab === "sessioni";
  const renderWikiTab = initialContentTab === "wiki";
  const renderMappeTab = initialContentTab === "mappe";
  const renderMissioniTab = initialContentTab === "missioni";
  const renderPgTab = initialContentTab === "pg";
  const renderGmTab = initialContentTab === "gm";

  const campaignInfoFooter = (
    <>
      {!hasPlayedCampaign && !isLongCampaign ? (
        <p className="rounded-lg border border-barber-gold/40 bg-barber-gold/10 px-3 py-2 text-xs text-barber-gold">
          Partecipa a una sessione per sbloccare {showMappeTab ? "Wiki e Mappe" : "Wiki"}.
        </p>
      ) : null}
      {!isGmOrAdmin && campaign.type === "long" && !isCampaignMember ? (
        <div className="space-y-2 rounded-lg border border-barber-gold/40 bg-barber-gold/10 px-3 py-3">
          <p className="text-xs text-barber-gold">
            Per campagne Long iscriviti alla campagna, poi potrai prenotare le sessioni.
          </p>
          {!longRegistrationsOpen ? (
            <p className="text-xs text-amber-200/90">
              Le iscrizioni sono chiuse. Contatta il GM per entrare in campagna.
            </p>
          ) : null}
          <JoinLongCampaignButton
            campaignId={campaign.id}
            registrationsOpen={longRegistrationsOpen}
            className="h-8 bg-barber-red text-xs text-barber-paper hover:bg-barber-red/90"
          />
        </div>
      ) : null}
      {!isGmOrAdmin && campaign.type === "long" && isCampaignMember ? (
        <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
          Iscritto alla campagna Long.
        </p>
      ) : null}
      {isViewerLockedOut && !longRegistrationsOpen ? (
        <p className="text-xs text-amber-200/90">
          Le iscrizioni sono chiuse. Contatta il GM per essere aggiunto manualmente.
        </p>
      ) : null}
    </>
  );

  const campaignManagementActions = isGmOrAdmin ? (
    <div className="flex max-w-[min(100%,20rem)] flex-wrap justify-end gap-1.5 sm:max-w-none">
      <EditCampaignDialog
        campaign={{
          id: campaign.id,
          name: campaign.name,
          description: campaign.description ?? null,
          type: campaign.type ?? null,
          image_url: campaign.image_url ?? null,
          is_long_campaign: campaign.is_long_campaign ?? false,
          player_primer: campaign.player_primer ?? null,
        }}
      />
      <CampaignVisibilityToggle campaignId={campaign.id} isPublic={campaign.is_public ?? false} />
      {isLongCampaign ? (
        <LongRegistrationsToggle
          campaignId={campaign.id}
          registrationsOpen={longRegistrationsOpen}
        />
      ) : null}
    </div>
  ) : undefined;
  const campaignDangerousAction = isGmOrAdmin ? (
    <DeleteCampaignButton campaignId={campaign.id} campaignName={campaign.name} />
  ) : undefined;
  const wikiCreateAction = isGmOrAdmin ? (
    <CreateEntityDialog
      campaignId={campaign.id}
      campaignType={campaign.type ?? null}
      eligiblePlayers={eligiblePlayers}
      eligibleParties={eligibleParties}
      isAdmin={isAdmin}
      adminDraftsEnabled={Boolean((campaign as { admin_drafts_enabled?: boolean }).admin_drafts_enabled)}
    />
  ) : undefined;
  const mapUploadAction = isGmOrAdmin ? (
    <UploadMapDialog
      campaignId={campaign.id}
      campaignType={campaign.type ?? null}
      eligiblePlayers={eligiblePlayers}
      eligibleParties={eligibleParties}
      isAdmin={isAdmin}
      adminDraftsEnabled={Boolean((campaign as { admin_drafts_enabled?: boolean }).admin_drafts_enabled)}
    />
  ) : undefined;
  const sessionCreateAction = isGmOrAdmin ? (
    <CreateSessionDialog
      campaignId={campaign.id}
      campaignType={campaign.type ?? null}
      gmAdminUsers={gmAdminUsers}
      defaultDmId={profile?.role === "gm" || profile?.role === "admin" ? user.id : null}
    />
  ) : undefined;
  const characterCreateAction = isGmOrAdmin ? (
    <CreateCharacterDialog campaignId={campaign.id} initialOpen={openCreateDialogOnLoad} />
  ) : undefined;
  const gmPrimaryAction = isGmOrAdmin ? (
    <div className="flex items-center gap-1.5">
      <GmScreenLauncher
        campaignId={campaign.id}
        label="Apri Schermo GM"
        className="h-9 border-violet-500/50 text-violet-200 hover:bg-violet-500/20"
      />
      {!isTorneo ? (
        <GmScreenLauncher
          campaignId={campaign.id}
          variant="v2"
          className="h-9 border-cyan-500/50 text-cyan-200 hover:bg-cyan-500/20"
        />
      ) : null}
    </div>
  ) : undefined;
  const campaignSectionActions = isGmOrAdmin ? {
    wiki: (
      <div className="flex flex-wrap gap-1.5 px-1 py-1">
        <DownloadWikiArchiveButton campaignId={campaign.id} />
        <BulkImportWikiDialog campaignId={campaign.id} />
      </div>
    ),
    mappe: (
      <div className="flex flex-wrap gap-1.5 px-1 py-1">
        <BulkImportMapsDialog campaignId={campaign.id} campaignType={campaign.type} isAdmin={isAdmin} adminDraftsEnabled={Boolean((campaign as { admin_drafts_enabled?: boolean }).admin_drafts_enabled)} />
      </div>
    ),
    pg: (
      <div className="flex flex-wrap gap-1.5 px-1 py-1">
        <DownloadCampaignSheetsButton campaignId={campaign.id} characters={characters} />
        <ImportCharactersFromCatalogDialog campaignId={campaign.id} />
      </div>
    ),
    missioni: (
      <div className="flex flex-wrap gap-1.5 px-1 py-1">
        <Button asChild size="sm" variant="ghost" className="h-9 text-barber-paper/85 hover:bg-barber-gold/10 hover:text-barber-gold">
          <Link href={`/campaigns/${campaign.id}/gm-only/missioni/proiezione`}>Apri proiezione</Link>
        </Button>
        {isAdmin ? <BulkImportMissionsDialog campaignId={campaign.id} /> : null}
      </div>
    ),
    gm: (
      <div className="flex flex-wrap gap-1.5 px-1 py-1">
        <Button asChild size="sm" variant="ghost" className="h-9 text-barber-paper/85 hover:bg-barber-gold/10 hover:text-barber-gold">
          <Link href={`/command-center?campaignId=${campaign.id}`}>Command Center</Link>
        </Button>
        {!isTorneo ? (
          <Button asChild size="sm" variant="ghost" className="h-9 text-barber-paper/85 hover:bg-barber-gold/10 hover:text-barber-gold">
            <Link href={`/campaigns/${campaign.id}/gm-only/vista-dall-alto`}>Esplorazione e FOW</Link>
          </Button>
        ) : null}
        {!isTorneo ? (
          <>
            <Button asChild size="sm" variant="ghost" className="h-9 text-barber-paper/85 hover:bg-barber-gold/10 hover:text-barber-gold">
              <Link href={`/campaigns/${campaign.id}?tab=mappe`}>Mappe</Link>
            </Button>
            <Button asChild size="sm" variant="ghost" className="h-9 text-barber-paper/85 hover:bg-barber-gold/10 hover:text-barber-gold">
              <Link href={`/campaigns/${campaign.id}/gm-only/scene-workspace`}>Scene tattiche V2</Link>
            </Button>
            <Button asChild size="sm" variant="ghost" className="h-9 text-barber-paper/85 hover:bg-barber-gold/10 hover:text-barber-gold">
              <Link href={`/campaigns/${campaign.id}/gm-only/concept-map`}>Mappa concettuale</Link>
            </Button>
            <Button asChild size="sm" variant="ghost" className="h-9 text-barber-paper/85 hover:bg-barber-gold/10 hover:text-barber-gold">
              <Link href={`/compendium?campaignId=${campaign.id}`}>Compendio</Link>
            </Button>
          </>
        ) : (
          <Button asChild size="sm" variant="ghost" className="h-9 text-barber-paper/85 hover:bg-barber-gold/10 hover:text-barber-gold">
            <Link href={`/campaigns/${campaign.id}/torneo2`}>Torneo 2.0</Link>
          </Button>
        )}
      </div>
    ),
  } : undefined;
  const missionCreateAction = isGmOrAdmin ? (
    <Button
      asChild
      size="sm"
      className="h-9 bg-amber-600 text-zinc-950 hover:bg-amber-500"
    >
      <Link
        href={`/campaigns/${campaign.id}?tab=missioni&openCreateMission=1`}
        role="button"
      >
        Nuova Missione
      </Link>
    </Button>
  ) : undefined;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-guild-void text-parchment-100 font-sans">
      <CampaignWorkspace
        campaignId={campaign.id}
        isAdmin={isAdmin}
        isGmOrAdmin={isGmOrAdmin}
        campaignName={campaign.name}
        imageUrl={campaign.image_url}
        campaignTypeLabel={campaignTypeLabel}
        description={campaign.description}
        gmDisplayName={gmDisplayName}
        playerPrimerHref={
          campaign.player_primer?.trim() ? `/campaigns/${campaign.id}/primer` : null
        }
        isLongCampaign={isLongCampaign}
        hasPlayedCampaign={hasPlayedCampaign}
        defaultTab={defaultTab}
        lockedOut={isViewerLockedOut}
        infoFooter={campaignInfoFooter}
        managementActions={campaignManagementActions}
        dangerousAction={campaignDangerousAction}
        primaryActions={{
          sessioni: sessionCreateAction,
          wiki: wikiCreateAction,
          mappe: mapUploadAction,
          missioni: missionCreateAction,
          pg: characterCreateAction,
          gm: gmPrimaryAction,
        }}
        sectionActions={campaignSectionActions}
        sessioniContent={
            renderSessioniTab ? (
              <>
              {isGmOrAdmin && preClosedSession && (
                <div className="card-guild-stone mb-4 rounded-xl border border-brass-base/40 p-4 text-sm text-parchment-100 shadow-lg">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-serif font-bold text-brass-light">
                        ✦ C&apos;è una sessione in sospeso da chiudere.
                      </p>
                      <p className="text-xs text-parchment-300">
                        {preClosedSession.title ?? "Sessione senza titolo"}
                      </p>
                    </div>
                    <Button
                      asChild
                      size="sm"
                      variant="wax"
                      className="text-xs font-serif uppercase tracking-wider font-bold"
                    >
                      <Link
                        href={`/campaigns/${campaign.id}/gm-screen?sessionId=${preClosedSession.id}&resume=1`}
                      >
                        Riprendi chiusura
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
              {isGmOrAdmin && !(campaign.is_public ?? false) && (
                <div className="card-guild-stone mb-4 rounded-xl border border-brass-base/30 p-4 text-xs text-brass-light/90">
                  <strong className="font-serif text-brass-light">✦ Campagna privata:</strong> I player non vedono le sessioni in calendario e non possono prenotarsi. Usa il pulsante &quot;Privata&quot; in alto per renderla pubblica.
                </div>
              )}
              {!isGmOrAdmin && campaign.type === "long" && !isCampaignMember && (
                <div className="card-guild-stone mb-4 rounded-xl border border-brass-base/40 p-5 shadow-lg">
                  <p className="mb-2 font-serif text-sm font-bold text-gold-relief">
                    ✦ Iscriviti alla Campagna per prenotare le sessioni al tavolo
                  </p>
                  {!longRegistrationsOpen ? (
                    <p className="mb-2 text-xs text-parchment-400">
                      Le iscrizioni al bando sono momentaneamente chiuse.
                    </p>
                  ) : null}
                  <JoinLongCampaignButton
                    campaignId={campaign.id}
                    registrationsOpen={longRegistrationsOpen}
                    className="btn-wax-seal h-9 text-xs font-serif uppercase tracking-widest font-bold text-parchment-100 shadow-md"
                  />
                </div>
              )}
              {isGmOrAdmin && campaign.type === "long" && (
                <div className="mb-4">
                  <CampaignPartyMembersPanel campaignId={campaign.id} />
                </div>
              )}
              <SectionHeader
                className={cn("mb-3 lg:mb-6", !isGmOrAdmin && "hidden lg:flex")}
                eyebrow="Sessioni"
                title="In programma"
                description={
                  isGmOrAdmin
                    ? "Gestisci iscrizioni, presenze e chiusura sessione."
                    : "Prenota le prossime date in calendario."
                }
                level={3}
                icon={<CalendarDays className="h-5 w-5" />}
                action={undefined}
              />
              <SessionList campaignId={campaign.id} campaignType={campaign.type ?? null} />
              {isGmOrAdmin ? (
                <div className="mt-10 border-t border-barber-gold/20 pt-10">
                  <SessionHistoryManager campaignId={campaign.id} />
                </div>
              ) : (
                <>
                  <CompletedSessionsListForPlayer campaignId={campaign.id} />
                  <PlayerFeedbackSection campaignId={campaign.id} />
                </>
              )}
              </>
            ) : null
          }
          wikiContent={
            renderWikiTab && hasPlayedCampaign ? (
              <>
                <WikiList
                  campaignId={campaign.id}
                  campaignType={campaign.type ?? null}
                  eligiblePlayers={eligiblePlayers}
                  eligibleParties={eligibleParties}
                />
              </>
            ) : null
          }
          mappeContent={
            renderMappeTab && hasPlayedCampaign ? (
              <>
                {isGmOrAdmin && (
                  <details className="card-guild-stone group relative mb-8 overflow-hidden rounded-2xl border-2 border-brass-base/40 shadow-2xl transition-all">
                    <div className="corner-ornament-tl" />
                    <div className="corner-ornament-tr" />
                    <div className="corner-ornament-bl" />
                    <div className="corner-ornament-br" />

                    <summary className="flex cursor-pointer list-none items-center gap-2.5 px-5 py-4 hover:bg-brass-base/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brass-base md:px-6 [&::-webkit-details-marker]:hidden">
                      <MapIcon className="h-5 w-5 shrink-0 text-brass-light" aria-hidden />
                      <span className="font-serif text-base font-bold text-gold-relief md:text-lg">
                        Plancia Tattica Operativa (Mappa Mondo)
                      </span>
                      <span className="hidden text-xs text-parchment-400 sm:inline">
                        · Griglia tattica, portali dimensionali e posizioni pedine PG
                      </span>
                      <ChevronDown
                        className="ml-auto h-5 w-5 shrink-0 text-brass-base transition-transform group-open:rotate-180"
                        aria-hidden
                      />
                    </summary>
                    <div className="border-t border-brass-base/20 px-4 pb-4 pt-4 md:px-6 md:pb-6">
                      {worldOperationalMapUrl ? (
                        <InteractiveMap
                          campaignId={campaign.id}
                          imageUrl={worldOperationalMapUrl}
                          portals={operationalPortals}
                          characters={operationalMapCharacters}
                          parties={eligibleParties}
                        />
                      ) : (
                        <div className="rounded-xl border border-dashed border-brass-base/40 bg-guild-stone/50 px-5 py-8 text-center text-sm text-parchment-300">
                          <p>
                            Carica una mappa contrassegnata come tipo{" "}
                            <strong className="text-brass-light font-serif">Mondo</strong> per attivare la griglia operativa,
                            registrare i portali e posizionare le pedine del party.
                          </p>
                          <p className="mt-2 text-xs text-parchment-400">
                            Usa il pulsante &quot;Carica mappa&quot; nella barra superiore e seleziona la categoria Mondo.
                          </p>
                        </div>
                      )}
                    </div>
                  </details>
                )}
                <MapGallery
                  campaignId={campaign.id}
                  campaignType={campaign.type ?? null}
                  eligiblePlayers={eligiblePlayers}
                  eligibleParties={eligibleParties}
                  isAdmin={isAdmin}
                  adminDraftsEnabled={Boolean((campaign as { admin_drafts_enabled?: boolean }).admin_drafts_enabled)}
                />
              </>
            ) : null
          }
          missionsContent={
            renderMissioniTab && showMissionsTab ? (
              <MissionBoardSection
                campaignId={campaign.id}
                isGmOrAdmin={isGmOrAdmin}
                isAdmin={isAdmin}
                hideHeaderActions
              />
            ) : null
          }
          pgContent={
            renderPgTab ? (
              <CharactersSection
              campaignId={campaign.id}
              campaignType={campaign.type ?? null}
              characters={characters}
              eligiblePlayers={eligiblePlayers}
              playerPartyById={playerPartyById}
              isGm={isGmOrAdmin}
              openCreateDialogOnLoad={openCreateDialogOnLoad}
              openEditCharacterId={openEditCharacterId}
              currentUserId={user.id}
              gmId={campaign.gm_id ?? undefined}
              hideActions
            />
            ) : null
          }
          gmAreaContent={
            renderGmTab && isGmOrAdmin ? (
              <GmHomepage
                campaignId={campaign.id}
                campaignType={campaign.type ?? null}
                aiContextParsed={aiContextParsed}
                excludedManualBookKeys={excludedManualBookKeys}
                joinEmailSettings={joinEmailSettings}
                bulkEmailTemplates={bulkEmailTemplates}
                initialPlayerPrimer={campaign.player_primer ?? null}
                initialTypography={campaign.primer_typography ?? null}
                isAdmin={isAdmin}
                hideQuickActions
              />
            ) : undefined
          }
          showGmTab={isGmOrAdmin}
          showMissionsTab={showMissionsTab}
          showMappeTab={showMappeTab}
        />
    </div>
  );
}
