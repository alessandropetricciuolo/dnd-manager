import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { IMAGE_BLUR_PLACEHOLDER } from "@/lib/utils";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { SessionList } from "@/components/session-list";
import { SessionHistoryManager } from "@/components/sessions/session-history-manager";
import { CompletedSessionsListForPlayer } from "@/components/sessions/completed-sessions-list-for-player";
import { CreateSessionDialog } from "@/components/create-session-dialog";
import { MapGallery } from "@/components/maps/map-gallery";
import { UploadMapDialog } from "@/components/maps/upload-map-dialog";
import { WikiList } from "@/components/wiki/wiki-list";
import { CreateEntityDialog } from "@/components/wiki/create-entity-dialog";
import { BulkImportWikiDialog } from "@/components/wiki/bulk-import-wiki-dialog";
import { DeleteCampaignButton } from "@/components/delete-campaign-button";
import { CampaignVisibilityToggle } from "@/components/campaign-visibility-toggle";
import { EditCampaignDialog } from "@/components/campaigns/edit-campaign-dialog";
import { CampaignTabsClient } from "@/components/campaigns/campaign-tabs-client";
import { GmNotes } from "@/components/gm/gm-notes";
import { GmFiles } from "@/components/gm/gm-files";
import { CampaignPrimerEditor } from "@/components/gm/campaign-primer-editor";
import { GmScreenLauncher } from "@/components/gm/gm-screen-launcher";
import Link from "next/link";
import { Map } from "lucide-react";
import { CharactersSection } from "@/components/characters/characters-section";
import { getCampaignCharacters, getCampaignEligiblePlayers } from "@/app/campaigns/character-actions";
import { getPreClosedSessionForCampaign, type PreClosedSessionRow } from "@/app/campaigns/gm-actions";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
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
    console.log("[campaigns/[id]] debug (no user)", {
      requestedId: id,
      user,
    });
    notFound();
  }

  const { data: campaign, error } = await supabase
    .from("campaigns")
    .select("id, name, description, gm_id, is_public, type, image_url, is_long_campaign, player_primer, primer_typography")
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

  /** Sessione eventualmente salvata in bozza (pre-chiusura) da un qualsiasi GM. */
  let preClosedSession: PreClosedSessionRow | null = null;
  if (isGmOrAdmin) {
    try {
      const res = await getPreClosedSessionForCampaign(campaign.id);
      if (res.success) {
        preClosedSession = res.data ?? null;
      }
    } catch (e) {
      console.error("[campaigns/[id]] getPreClosedSessionForCampaign", e);
    }
  }

  /** Tab iniziale: player con PG assegnato → PG, player senza PG o GM → Sessioni */
  const defaultTab =
    isGmOrAdmin || characters.length === 0 ? "sessioni" : "pg";

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
        {campaign.player_primer?.trim() && (
          <Link
            href={`/campaigns/${campaign.id}/primer`}
            className="inline-flex items-center gap-2 rounded-lg border border-barber-gold/50 bg-barber-gold/10 px-4 py-2 text-sm font-medium text-barber-gold hover:bg-barber-gold/20 transition-colors"
          >
            📖 Leggi la Guida del Giocatore
          </Link>
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
                is_long_campaign: campaign.is_long_campaign ?? false,
                player_primer: campaign.player_primer ?? null,
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
              {/* Mobile: sinossi visibile (su desktop è nella sidebar) */}
              <section className="mb-6 rounded-xl border border-barber-gold/20 bg-barber-dark/60 p-4 lg:hidden">
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-barber-gold/90">
                  Sinossi
                </h2>
                {campaignTypeLabel && (
                  <span className="mb-3 inline-block rounded-full border border-barber-gold/50 bg-barber-gold/10 px-3 py-1 text-xs font-medium text-barber-gold">
                    {campaignTypeLabel}
                  </span>
                )}
                {campaign.description ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-barber-paper/90">
                    {campaign.description}
                  </p>
                ) : (
                  <p className="text-sm text-barber-paper/50">Nessuna descrizione.</p>
                )}
                {gmDisplayName && (
                  <p className="mt-3 text-sm text-barber-gold/90">GM · {gmDisplayName}</p>
                )}
                {campaign.player_primer?.trim() && (
                  <Link
                    href={`/campaigns/${campaign.id}/primer`}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg border border-barber-gold/50 bg-barber-gold/10 px-4 py-2 text-sm font-medium text-barber-gold hover:bg-barber-gold/20 transition-colors"
                  >
                    📖 Leggi la Guida del Giocatore
                  </Link>
                )}
              </section>

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
          defaultTab={defaultTab}
          sessioniContent={
            <>
              {isGmOrAdmin && preClosedSession && (
                <div className="mb-4 rounded-lg border border-amber-500/70 bg-amber-950/40 px-4 py-3 text-sm text-amber-50">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        C&apos;è una sessione in sospeso da chiudere.
                      </p>
                      <p className="text-xs text-amber-200/80">
                        {preClosedSession.title ?? "Sessione senza titolo"}
                      </p>
                    </div>
                    <Button
                      asChild
                      size="sm"
                      className="bg-amber-500 text-slate-900 hover:bg-amber-400"
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
                    campaignType={campaign.type ?? null}
                    gmAdminUsers={gmAdminUsers}
                    defaultDmId={profile?.role === "gm" || profile?.role === "admin" ? user.id : null}
                  />
                )}
              </div>
              <SessionList campaignId={campaign.id} campaignType={campaign.type ?? null} />
              {isGmOrAdmin ? (
                <div className="mt-10 border-t border-barber-gold/20 pt-10">
                  <SessionHistoryManager campaignId={campaign.id} />
                </div>
              ) : (
                <CompletedSessionsListForPlayer campaignId={campaign.id} />
              )}
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
                    <div className="flex flex-wrap items-center gap-2">
                      <CreateEntityDialog campaignId={campaign.id} campaignType={campaign.type ?? null} eligiblePlayers={eligiblePlayers} />
                      <BulkImportWikiDialog campaignId={campaign.id} />
                    </div>
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
              currentUserId={user.id}
              gmId={campaign.gm_id ?? undefined}
            />
          }
          gmAreaContent={
            isGmOrAdmin ? (
              <div className="rounded-xl border-2 border-violet-800/60 bg-slate-950/80 p-6 shadow-inner">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                  <p className="text-sm text-violet-200/80">
                    Note e file privati, visibili solo a te.
                  </p>
                  <GmScreenLauncher
                    campaignId={campaign.id}
                    className="border-violet-500/50 text-violet-200 hover:bg-violet-500/20"
                  />
                </div>
                <div className="space-y-8">
                  <CampaignPrimerEditor
                    campaignId={campaign.id}
                    initialPlayerPrimer={campaign.player_primer ?? null}
                    initialTypography={campaign.primer_typography ?? undefined}
                  />
                  <div className="rounded-lg border border-violet-600/30 bg-violet-950/30 p-4">
                    <h3 className="mb-2 text-sm font-medium text-violet-200">Mappa Concettuale</h3>
                    <p className="mb-3 text-xs text-violet-200/70">
                      Grafo di voci wiki e mappe con relazioni. Crea relazioni dal form di creazione/modifica delle voci wiki.
                    </p>
                    <Button asChild variant="outline" size="sm" className="border-violet-500/50 text-violet-200 hover:bg-violet-500/20">
                      <Link href={`/campaigns/${campaign.id}/gm-only/concept-map`}>
                        <Map className="mr-2 h-4 w-4" />
                        Apri Mappa Concettuale
                      </Link>
                    </Button>
                  </div>
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
