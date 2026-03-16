import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { PrimerView } from "./primer-view";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function CampaignPrimerPage({ params }: Props) {
  const { id } = await params;
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
      ? {
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
        }
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
