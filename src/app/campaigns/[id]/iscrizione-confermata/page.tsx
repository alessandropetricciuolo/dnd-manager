import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/button";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function IscrizioneConfermataPage({ params }: PageProps) {
  const { id: campaignId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(`/campaigns/${campaignId}/iscrizione-confermata`)}`);
  }

  const { data: campaign, error: cErr } = await supabase
    .from("campaigns")
    .select("id, name, type")
    .eq("id", campaignId)
    .maybeSingle();

  if (cErr || !campaign) {
    notFound();
  }

  const { data: member } = await supabase
    .from("campaign_members")
    .select("id")
    .eq("campaign_id", campaignId)
    .eq("player_id", user.id)
    .maybeSingle();

  if (!member) {
    redirect(`/campaigns/${campaignId}`);
  }

  return (
    <div className="flex min-h-[calc(100vh-theme(spacing.16))] flex-col items-center justify-center bg-barber-dark px-4 py-12">
      <div className="w-full max-w-lg rounded-xl border border-barber-gold/35 bg-barber-dark/90 px-6 py-10 text-center shadow-lg">
        <h1 className="text-xl font-semibold text-barber-gold md:text-2xl">
          La tua iscrizione è confermata!
        </h1>
        <p className="mt-4 text-base leading-relaxed text-barber-paper/90">
          Controlla la mail perché c&apos;è qualcosa di importante da vedere!
        </p>
        {campaign.name ? (
          <p className="mt-2 text-sm text-barber-paper/60">{campaign.name}</p>
        ) : null}
        <Button
          asChild
          className="mt-8 bg-barber-gold text-barber-dark hover:bg-barber-gold/90"
          size="lg"
        >
          <Link href={`/campaigns/${campaignId}`}>Continua</Link>
        </Button>
      </div>
    </div>
  );
}
