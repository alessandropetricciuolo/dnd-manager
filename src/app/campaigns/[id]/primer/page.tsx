import { EldariaGuide } from "./eldaria-guide";
import { ELDARIA_CAMPAIGN_ID, ELDARIA_GUIDE_PATH, ELDARIA_STARTER_WIKI_IDS, getEldariaGuideSections } from "@/lib/eldaria-welcome";
import { getWikiContentBody, getWikiContentDescription } from "@/lib/wiki/content";
import { getRequestAuthContext } from "@/utils/supabase/request-auth-context";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { PrimerView } from "./primer-view";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function CampaignPrimerPage({ params }: Props) {
  const { id } = await params;
  const isEldaria = id === ELDARIA_CAMPAIGN_ID;
  if (isEldaria) {
    const { supabase, user, profile } = await getRequestAuthContext();
    if (!user) redirect(`/login?redirect=${encodeURIComponent(ELDARIA_GUIDE_PATH)}`);

    const [campaign, membership] = await Promise.all([
      supabase.from("campaigns").select("id, name, image_url, player_primer").eq("id", id).maybeSingle(),
      supabase.from("campaign_members").select("id").eq("campaign_id", id).eq("player_id", user.id).maybeSingle(),
    ]);
    if (!campaign.data?.player_primer?.trim()) notFound();
    if (!membership.data && profile?.role !== "gm" && profile?.role !== "admin") notFound();

    const [guideRead, wiki] = await Promise.all([
      membership.data
        ? supabase.from("campaign_guide_reads").select("confirmed_at").eq("campaign_id", id).eq("player_id", user.id).maybeSingle()
        : Promise.resolve(null),
      supabase.from("wiki_entities").select("id, name, content")
        .eq("campaign_id", id)
        .eq("visibility", "public")
        .eq("is_secret", false)
        .eq("admin_only", false)
        .eq("is_campaign_document", false)
        .is("archived_at", null)
        .in("id", ELDARIA_STARTER_WIKI_IDS),
    ]);

    const entries = new Map((wiki.data ?? []).map((entry) => [entry.id, entry]));
    const articles = ELDARIA_STARTER_WIKI_IDS.flatMap((id) => {
      const entry = entries.get(id);
      if (!entry) return [];
      return [{
        id,
        name: entry.name,
        markdown: getWikiContentBody(entry.content) || getWikiContentDescription(entry.content),
      }];
    });

    return (
      <EldariaGuide
        campaignName={campaign.data.name}
        coverUrl={campaign.data.image_url}
        sections={getEldariaGuideSections(campaign.data.player_primer)}
        articles={articles}
        canConfirm={Boolean(membership.data)}
        confirmed={Boolean(guideRead?.data)}
      />
    );
  }

  const supabase = await createSupabaseServerClient();

  const { data: campaign, error } = await supabase
    .from("campaigns")
    .select("id, name, gm_id, is_public, player_primer, primer_typography")
    .eq("id", id)
    .single();

  if (error || !campaign) {
    notFound();
  }

  if (!campaign.player_primer?.trim()) {
    notFound();
  }

  /** Accesso: come per la campagna (GM, pubblico, o membro / ha giocato). */
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const isGm = campaign.gm_id === user.id;
  if (!isGm && !campaign.is_public) {
    const [memberRes, playedRes] = await Promise.all([
      supabase.from("campaign_members").select("id").eq("campaign_id", id).eq("player_id", user.id).limit(1).maybeSingle(),
      supabase.rpc("has_played_campaign", { p_user_id: user.id, p_campaign_id: id }).then((r) => r.data === true),
    ]);
    if (!memberRes.data && !playedRes) notFound();
  }

  const rawTypography = campaign.primer_typography as { fontSize?: string; fontFamily?: string } | null;
  const typography =
    rawTypography && typeof rawTypography === "object"
      ? ({
          fontSize:
            rawTypography.fontSize === "small" ||
            rawTypography.fontSize === "medium" ||
            rawTypography.fontSize === "large"
              ? rawTypography.fontSize
              : undefined,
          fontFamily:
            rawTypography.fontFamily === "serif" || rawTypography.fontFamily === "sans"
              ? rawTypography.fontFamily
              : undefined,
        } as import("./primer-view").PrimerTypographyProp)
      : undefined;

  return (
    <PrimerView
      campaignId={campaign.id}
      campaignName={campaign.name}
      markdown={campaign.player_primer}
      typography={typography}
    />
  );
}
