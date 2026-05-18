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
    <div className="flex h-[calc(100vh-theme(spacing.16))] flex-col overflow-hidden bg-[#09090b]">
      <header className="flex shrink-0 items-center gap-4 border-b border-[#282828] bg-[#141414] px-4 py-2.5 shadow-[inset_0_-1px_0_rgba(255,255,255,0.04)]">
        <Button variant="ghost" size="sm" asChild className="text-[#b3b3b3] hover:bg-[#1f1f1f] hover:text-[#e8e8e8]">
          <Link href={`/campaigns/${campaignId}`}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Campagna
          </Link>
        </Button>
        <h1 className="font-sans text-base font-semibold tracking-tight text-[#dcdcdc]">Mappa concettuale</h1>
        <span className="text-[13px] text-[#6f6f6f]">{campaign.name}</span>
      </header>
      <div className="min-h-0 flex-1">
        <EntityGraph campaignId={campaignId} />
      </div>
    </div>
  );
}
