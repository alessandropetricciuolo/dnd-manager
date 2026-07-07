import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getEntity } from "@/app/campaigns/wiki-actions";
import { getCampaignEligiblePlayers } from "@/app/campaigns/character-actions";
import { WikiDetails } from "@/components/wiki/wiki-details";
import { WikiLocationMapPanel } from "@/components/wiki/wiki-location-map-panel";
import { RelatedEntitiesSection } from "@/components/wiki/related-entities-section";
import { getRelatedEntityLinks } from "@/app/campaigns/entity-graph-actions";
import { WikiEntityEditButton } from "@/components/wiki/wiki-entity-edit-button";
import { WikiEntityDeleteButton } from "@/components/wiki/wiki-entity-delete-button";
import { getWikiContentBody } from "@/lib/wiki/content";
import { CAMPAIGN_CONTENT_SHELL } from "@/lib/layout/shell-classes";
import { ArrowLeft } from "lucide-react";

type PageProps = {
  params: Promise<{ id: string; entityId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function WikiEntityPage({ params, searchParams }: PageProps) {
  const { id: campaignId, entityId } = await params;
  const sp = (await searchParams) ?? {};
  const editRaw = sp.edit;
  const editParam = typeof editRaw === "string" ? editRaw : Array.isArray(editRaw) ? editRaw[0] : undefined;
  const autoOpenEditDialog = editParam === "1";
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const entity = await getEntity(entityId, campaignId);
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("type")
    .eq("id", campaignId)
    .single();

  if (!entity) {
    notFound();
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isGmOrAdmin = profile?.role === "gm" || profile?.role === "admin";

  let eligiblePlayers: { id: string; label: string }[] = [];
  let eligibleParties: { id: string; label: string; memberIds: string[] }[] = [];
  let permittedUserIds: string[] = [];
  let permittedPartyIds: string[] = [];
  if (isGmOrAdmin) {
    const playersResult = await getCampaignEligiblePlayers(campaignId);
    if (playersResult.success && playersResult.data) eligiblePlayers = playersResult.data;
    const [{ data: partiesRaw }, { data: membersRaw }] = await Promise.all([
      supabase.from("campaign_parties").select("id, name").eq("campaign_id", campaignId).order("name"),
      supabase.from("campaign_members").select("player_id, party_id").eq("campaign_id", campaignId),
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
    const vis = (entity as { visibility?: string }).visibility;
    if (vis === "selective") {
      const { data: perms } = await supabase
        .from("entity_permissions")
        .select("user_id")
        .eq("campaign_id", campaignId)
        .eq("entity_type", "wiki")
        .eq("entity_id", entityId);
      if (perms?.length) permittedUserIds = perms.map((p) => p.user_id as string);
      permittedPartyIds = eligibleParties
        .filter((party) => party.memberIds.length > 0 && party.memberIds.every((id) => permittedUserIds.includes(id)))
        .map((party) => party.id);
    }
  }

  const contentBody = getWikiContentBody(entity.content);

  const relatedResult = await getRelatedEntityLinks(campaignId, entityId);
  const relatedLinks = relatedResult.success ? relatedResult.data : [];

  let boundMapId: string | null = null;
  let boundMapName: string | null = null;
  if (entity.type === "location") {
    const { data: boundMap } = await supabase
      .from("maps")
      .select("id, name")
      .eq("campaign_id", campaignId)
      .eq("wiki_entity_id", entityId)
      .maybeSingle();
    if (boundMap) {
      boundMapId = (boundMap as { id: string }).id;
      boundMapName = (boundMap as { name?: string }).name ?? null;
    }
  }

  const entityWithDefaults = {
    ...entity,
    attributes: entity.attributes ?? {},
    sort_order: entity.sort_order ?? null,
  };

  return (
    <div className={`min-h-screen bg-barber-dark min-w-0 overflow-x-hidden ${CAMPAIGN_CONTENT_SHELL}`}>
      <div className="min-w-0 w-full">
        <div className="mb-4 md:mb-6 flex flex-wrap items-center gap-2 min-w-0">
          <Link
            href={`/campaigns/${campaignId}?tab=wiki&wiki_filter=${encodeURIComponent(entity.type)}`}
          >
            <Button
              variant="ghost"
              size="sm"
              className="text-barber-paper/80 hover:text-barber-paper"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Indietro alla campagna
            </Button>
          </Link>
          {isGmOrAdmin && (
            <>
              <WikiEntityEditButton
                campaignId={campaignId}
                campaignType={campaign?.type ?? null}
                entity={entityWithDefaults}
                contentBody={contentBody}
                eligiblePlayers={eligiblePlayers}
                eligibleParties={eligibleParties}
                initialVisibility={(entity as { visibility?: string }).visibility ?? (entity.is_secret ? "secret" : "public")}
                initialAllowedUserIds={permittedUserIds}
                initialAllowedPartyIds={permittedPartyIds}
                autoOpenEditDialog={autoOpenEditDialog}
              />
              <WikiEntityDeleteButton
                campaignId={campaignId}
                entityId={entity.id}
                entityName={entity.name}
              />
              {campaign?.type === "long" && entity.include_in_campaign_ai_memory && (
                <Badge
                  variant="outline"
                  className="border-violet-500/50 bg-violet-950/40 text-violet-200"
                >
                  Memoria IA
                </Badge>
              )}
            </>
          )}
        </div>
        <article className="rounded-xl border border-barber-gold/40 bg-barber-dark/90 p-4 shadow-[0_0_40px_rgba(251,191,36,0.1)] md:p-6 min-w-0 overflow-hidden">
          {entity.type !== "lore" && (
            <h1 className="mb-4 md:mb-6 text-2xl font-bold tracking-tight text-barber-paper break-words md:text-3xl lg:text-4xl">
              {entity.name}
            </h1>
          )}
          {entity.type === "location" && (
            <div className="mb-6">
              <WikiLocationMapPanel
                campaignId={campaignId}
                wikiEntityId={entity.id}
                wikiEntityName={entity.name}
                boundMapId={boundMapId}
                boundMapName={boundMapName}
                hasImage={Boolean(entity.image_url?.trim())}
                isGmOrAdmin={isGmOrAdmin}
              />
            </div>
          )}
          <WikiDetails entity={entityWithDefaults} contentBody={contentBody} isGmOrAdmin={isGmOrAdmin} />
          {relatedLinks.length > 0 && (
            <div className="mt-8">
              <RelatedEntitiesSection campaignId={campaignId} links={relatedLinks} />
            </div>
          )}
        </article>
      </div>
    </div>
  );
}
