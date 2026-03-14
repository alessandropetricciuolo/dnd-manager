import { createSupabaseServerClient } from "@/utils/supabase/server";
import { CampaignCarouselClient } from "./campaign-carousel-client";

const LIMIT = 10;

/**
 * Carosello campagne in evidenza (Server Component).
 * Recupera le ultime campagne pubbliche ordinate per data di creazione.
 */
export async function CampaignCarousel() {
  const supabase = await createSupabaseServerClient();

  const { data: campaigns, error } = await supabase
    .from("campaigns")
    .select("id, name, description, image_url")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(LIMIT);

  if (error) {
    console.error("[CampaignCarousel]", error);
    return null;
  }

  const list = (campaigns ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description ?? null,
    image_url: c.image_url ?? null,
  }));

  if (list.length === 0) return null;

  return (
    <section className="border-t border-barber-gold/20 bg-barber-dark/98 py-8 sm:py-12 md:py-16">
      <div className="mx-auto max-w-6xl p-4 sm:px-6 md:p-8">
        <h2 className="font-serif text-xl font-semibold text-barber-gold sm:text-2xl md:text-3xl">
          Campagne in evidenza
        </h2>
        <p className="mt-2 text-sm text-barber-paper/70 break-words">
          Le ultime campagne pubbliche. Entra e scopri le avventure in programma.
        </p>
        <div className="mt-6 md:mt-8 lg:px-12">
          <CampaignCarouselClient campaigns={list} />
        </div>
      </div>
    </section>
  );
}
