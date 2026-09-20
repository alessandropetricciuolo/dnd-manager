import Link from "next/link";
import Image from "next/image";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { IMAGE_BLUR_PLACEHOLDER } from "@/lib/utils";

const PLACEHOLDER_IMAGE = "https://placehold.co/600x400/1c1917/fbbf24/png?text=Campagna";

type CampaignListVariant = "yours" | "all";

type CampaignListProps = {
  /** "yours" = campagne dove hai partecipato (GM: create da te, Player: almeno una sessione giocata). "all" = tutte quelle disponibili. */
  variant?: CampaignListVariant;
};

function getEmptyMessage(variant: CampaignListVariant, isGmOrAdmin: boolean): string {
  if (variant === "all") return "Nessuna campagna trovata. Crea la tua prima campagna o cerca campagne pubbliche.";
  return isGmOrAdmin
    ? "Non hai ancora creato nessuna campagna."
    : "Nessuna campagna a cui hai ancora partecipato. Iscriviti a una sessione per iniziare.";
}

export async function CampaignList({ variant = "all" }: CampaignListProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <p className="text-sm text-barber-paper/70">
        Accedi per vedere le campagne.
      </p>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isGmOrAdmin = profile?.role === "gm" || profile?.role === "admin";

  let campaigns: { id: string; name: string; description: string | null; image_url: string | null; created_at: string }[] = [];
  let error: { message: string } | null = null;

  if (variant === "yours") {
    /** Le tue campagne: GM = create da te, Player = almeno una sessione con status attended */
    if (isGmOrAdmin) {
      const res = await supabase
        .from("campaigns")
        .select("id, name, description, image_url, created_at")
        .eq("gm_id", user.id)
        .order("created_at", { ascending: false });
      campaigns = res.data ?? [];
      error = res.error;
    } else {
      const { data: signups } = await supabase
        .from("session_signups")
        .select("session_id")
        .eq("player_id", user.id)
        .eq("status", "attended");
      const sessionIds = [...new Set((signups ?? []).map((s) => s.session_id).filter(Boolean))];
      if (sessionIds.length === 0) {
        campaigns = [];
      } else {
        const { data: sessions } = await supabase
          .from("sessions")
          .select("campaign_id")
          .in("id", sessionIds);
        const campaignIds = [...new Set((sessions ?? []).map((s) => s.campaign_id).filter(Boolean))];
        if (campaignIds.length === 0) {
          campaigns = [];
        } else {
          const res = await supabase
            .from("campaigns")
            .select("id, name, description, image_url, created_at")
            .in("id", campaignIds)
            .order("created_at", { ascending: false });
          campaigns = res.data ?? [];
          error = res.error;
        }
      }
    }
  } else {
    /** Tutte le campagne disponibili: GM = tutte, Player = pubbliche o dove è membro */
    if (isGmOrAdmin) {
      const res = await supabase
        .from("campaigns")
        .select("id, name, description, image_url, created_at")
        .order("created_at", { ascending: false });
      campaigns = res.data ?? [];
      error = res.error;
    } else {
      const { data: memberRows } = await supabase
        .from("campaign_members")
        .select("campaign_id")
        .eq("player_id", user.id);
      const myCampaignIds = (memberRows ?? []).map((r) => r.campaign_id);
      const query = supabase
        .from("campaigns")
        .select("id, name, description, image_url, created_at")
        .order("created_at", { ascending: false });
      const res = myCampaignIds.length > 0
        ? await query.or(`is_public.eq.true,id.in.(${myCampaignIds.join(",")})`)
        : await query.eq("is_public", true);
      campaigns = res.data ?? [];
      error = res.error;
    }
  }

  if (error) {
    return (
      <p className="text-sm text-crimson-light font-serif">
        Errore nel caricamento delle campagne. Riprova più tardi.
      </p>
    );
  }

  if (!campaigns?.length) {
    return (
      <div className="card-guild-stone relative rounded-2xl p-8 text-center max-w-md mx-auto shadow-xl">
        <div className="corner-ornament-tl" />
        <div className="corner-ornament-tr" />
        <div className="corner-ornament-bl" />
        <div className="corner-ornament-br" />
        <p className="font-serif text-sm text-parchment-300 leading-relaxed">
          {getEmptyMessage(variant, isGmOrAdmin)}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 min-w-0">
      {campaigns.map((campaign) => (
        <Link
          key={campaign.id}
          href={`/campaigns/${campaign.id}`}
          prefetch={false}
          className="group min-w-0 block"
        >
          <article className="card-guild-stone relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border-2 border-brass-base/30 shadow-xl transition-all duration-300 group-hover:-translate-y-1.5 group-hover:border-brass-base/70 group-hover:shadow-[0_12px_30px_rgba(200,157,73,0.15)] min-w-0">
            <div className="corner-ornament-tl" />
            <div className="corner-ornament-tr" />
            <div className="corner-ornament-bl" />
            <div className="corner-ornament-br" />

            <div>
              {/* Immagine con cornice araldica e gradienti */}
              <div className="relative aspect-[16/9] w-full min-w-0 overflow-hidden bg-guild-void border-b border-brass-base/20">
                <Image
                  src={campaign.image_url ?? PLACEHOLDER_IMAGE}
                  alt={campaign.name}
                  fill
                  className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  placeholder="blur"
                  blurDataURL={IMAGE_BLUR_PLACEHOLDER}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-guild-void via-transparent to-transparent opacity-80" />
              </div>

              <div className="p-5">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-brass-base/30 bg-guild-oak/90 px-2.5 py-0.5 text-[10px] font-serif uppercase tracking-wider text-brass-light">
                  <span>✦ Campagna Ufficiale</span>
                </span>

                <h3 className="mt-3 line-clamp-1 font-serif text-lg font-bold text-parchment-100 group-hover:text-brass-light transition-colors">
                  {campaign.name}
                </h3>

                {campaign.description && (
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-parchment-300">
                    {campaign.description}
                  </p>
                )}
              </div>
            </div>

            <div className="border-t border-guild-border/80 px-5 py-3.5 bg-guild-oak/40 flex items-center justify-between">
              <span className="text-xs font-serif uppercase tracking-wider text-brass-light group-hover:text-brass-light font-semibold">
                Esplora Campagna
              </span>
              <span className="text-sm text-brass-base group-hover:translate-x-1 transition-transform">
                →
              </span>
            </div>
          </article>
        </Link>
      ))}
    </div>
  );
}
