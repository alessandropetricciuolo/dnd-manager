import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { EntityGraph } from "@/components/gm/entity-graph";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ConceptMapPage({ params }: PageProps) {
  const { id: campaignId } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) redirect("/dashboard");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isGmOrAdmin = profile?.role === "gm" || profile?.role === "admin";
  if (!isGmOrAdmin) notFound();

  const { data: campaign, error } = await supabase
    .from("campaigns")
    .select("id, name")
    .eq("id", campaignId)
    .single();

  if (error || !campaign) notFound();

  return (
    <div className="flex h-[calc(100vh-theme(spacing.16))] flex-col overflow-hidden bg-zinc-950">
      <header className="flex shrink-0 items-center gap-4 border-b border-amber-600/20 bg-zinc-900/80 px-4 py-3">
        <Button variant="ghost" size="sm" asChild className="text-amber-400 hover:bg-amber-600/20">
          <Link href={`/campaigns/${campaignId}`}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Campagna
          </Link>
        </Button>
        <h1 className="text-lg font-semibold text-amber-400/90">Mappa Concettuale</h1>
        <span className="text-sm text-zinc-500">{campaign.name}</span>
      </header>
      <div className="min-h-0 flex-1">
        <EntityGraph campaignId={campaignId} />
      </div>
    </div>
  );
}
