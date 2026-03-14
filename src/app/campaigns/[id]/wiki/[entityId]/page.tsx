import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/button";
import { getEntity } from "@/app/campaigns/wiki-actions";
import { getCampaignEligiblePlayers } from "@/app/campaigns/character-actions";
import { WikiDetails } from "@/components/wiki/wiki-details";
import { WikiEntityEditButton } from "@/components/wiki/wiki-entity-edit-button";
import { WikiEntityDeleteButton } from "@/components/wiki/wiki-entity-delete-button";
import { ArrowLeft } from "lucide-react";

type PageProps = {
  params: Promise<{ id: string; entityId: string }>;
};

export default async function WikiEntityPage({ params }: PageProps) {
  const { id: campaignId, entityId } = await params;
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
  let permittedUserIds: string[] = [];
  if (isGmOrAdmin) {
    const playersResult = await getCampaignEligiblePlayers(campaignId);
    if (playersResult.success && playersResult.data) eligiblePlayers = playersResult.data;
    const vis = (entity as { visibility?: string }).visibility;
    if (vis === "selective") {
      const { data: perms } = await supabase
        .from("entity_permissions")
        .select("user_id")
        .eq("campaign_id", campaignId)
        .eq("entity_type", "wiki")
        .eq("entity_id", entityId);
      if (perms?.length) permittedUserIds = perms.map((p) => p.user_id as string);
    }
  }

  const contentBody =
    entity.content && typeof entity.content === "object" && "body" in entity.content
      ? String((entity.content as { body?: string }).body ?? "")
      : "";

  const entityWithDefaults = {
    ...entity,
    attributes: entity.attributes ?? {},
    sort_order: entity.sort_order ?? null,
  };

  const isLore = entity.type === "lore";
  const maxWidth = isLore ? "max-w-4xl" : "max-w-5xl";

  return (
    <div className="min-h-screen bg-barber-dark px-4 py-6 md:py-8 min-w-0 overflow-x-hidden">
      <div className={`mx-auto min-w-0 ${maxWidth}`}>
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
                initialVisibility={(entity as { visibility?: string }).visibility ?? (entity.is_secret ? "secret" : "public")}
                initialAllowedUserIds={permittedUserIds}
              />
              <WikiEntityDeleteButton
                campaignId={campaignId}
                entityId={entity.id}
                entityName={entity.name}
              />
            </>
          )}
        </div>
        <article className="rounded-xl border border-barber-gold/40 bg-barber-dark/90 p-4 shadow-[0_0_40px_rgba(251,191,36,0.1)] md:p-6 min-w-0 overflow-hidden">
          {entity.type !== "lore" && (
            <h1 className="mb-4 md:mb-6 text-2xl font-bold tracking-tight text-barber-paper break-words md:text-3xl lg:text-4xl">
              {entity.name}
            </h1>
          )}
          <WikiDetails entity={entityWithDefaults} contentBody={contentBody} isGmOrAdmin={isGmOrAdmin} />
        </article>
      </div>
    </div>
  );
}
