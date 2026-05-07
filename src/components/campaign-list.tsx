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
      <p className="text-sm text-red-400">
        Errore nel caricamento delle campagne. Riprova più tardi.
      </p>
    );
  }

  if (!campaigns?.length) {
    return (
      <p className="rounded-xl border border-barber-gold/30 bg-barber-dark/80 px-6 py-8 text-center text-barber-paper/80">
        {getEmptyMessage(variant, isGmOrAdmin)}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 min-w-0">
      {campaigns.map((campaign, index) => (
        <Link key={campaign.id} href={`/campaigns/${campaign.id}`} className="min-w-0">
          <Card className="overflow-hidden border-barber-gold/40 bg-barber-dark/90 transition-colors hover:border-barber-gold/50 hover:bg-barber-dark min-w-0">
            <div className="relative aspect-[3/2] w-full min-w-0 bg-barber-dark">
              <Image
                src={campaign.image_url ?? PLACEHOLDER_IMAGE}
                alt={campaign.name}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                placeholder="blur"
                blurDataURL={IMAGE_BLUR_PLACEHOLDER}
              />
            </div>
            <CardHeader className="pb-2 min-w-0">
              <CardTitle className="line-clamp-1 break-words text-base text-barber-paper sm:text-lg">
                {campaign.name}
              </CardTitle>
              {campaign.description && (
                <CardDescription className="line-clamp-3 break-words text-barber-paper/70 sm:line-clamp-4 md:line-clamp-2">
                  {campaign.description}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="pt-0">
              <span className="text-xs text-barber-gold">
                Entra nella campagna →
              </span>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
