import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { CampaignMiniCarouselClient } from "./campaign-mini-carousel-client";

type PublicCampaignPreview = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
};

export async function CampaignMiniCarousel() {
  const supabase = createSupabaseAdminClient();

  const { data: campaigns, error } = await supabase
    .from("campaigns")
    .select("id, name, description, image_url")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) {
    console.error("[CampaignMiniCarousel]", error);
    return null;
  }

  const list = ((campaigns ?? []) as PublicCampaignPreview[]).map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description ?? null,
    image_url: c.image_url ?? null,
  }));

  if (!list.length) return null;

  return <CampaignMiniCarouselClient campaigns={list} />;
}
