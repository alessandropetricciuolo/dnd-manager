import { createSupabaseServerClient } from "@/utils/supabase/server";
import { CampaignMiniCarouselClient } from "./campaign-mini-carousel-client";

type CampaignMiniCarouselProps = {
  isAuthenticated: boolean;
};

export async function CampaignMiniCarousel({ isAuthenticated }: CampaignMiniCarouselProps) {
  const supabase = await createSupabaseServerClient();

  const { data: campaigns, error } = await supabase
    .from("campaigns")
    .select("id, name, description, image_url")
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[CampaignMiniCarousel]", error);
    return null;
  }

  const list = (campaigns ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description ?? null,
    image_url: c.image_url ?? null,
  }));

  if (!list.length) return null;

  return <CampaignMiniCarouselClient campaigns={list} isAuthenticated={isAuthenticated} />;
}
