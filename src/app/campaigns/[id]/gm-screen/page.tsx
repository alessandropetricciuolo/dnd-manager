import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { InitiativeTracker } from "@/components/gm/initiative-tracker";
import { GmNotesGrid } from "@/components/gm/gm-notes-grid";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function GmScreenPage({ params }: PageProps) {
  const { id: campaignId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isGmOrAdmin = profile?.role === "gm" || profile?.role === "admin";

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id")
    .eq("id", campaignId)
    .single();

  if (!campaign || !isGmOrAdmin) notFound();

  return (
    <div className="min-h-screen w-screen overflow-auto bg-zinc-950">
      <div className="flex flex-col lg:flex-row lg:h-screen">
        <section className="shrink-0 lg:h-full lg:w-[420px] xl:w-[480px] lg:border-r lg:border-amber-600/20 lg:overflow-hidden">
          <InitiativeTracker campaignId={campaignId} />
        </section>
        <section className="min-h-0 flex-1 p-6 lg:overflow-auto">
          <GmNotesGrid campaignId={campaignId} />
        </section>
      </div>
    </div>
  );
}
