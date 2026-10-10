import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { MissionBoardSection } from "@/components/missions/mission-board-section";
import { MissionProjectionShell } from "@/components/missions/mission-projection-shell";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function MissionProjectionPage({ params }: PageProps) {
  const { id: campaignId } = await params;
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/dashboard");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const isGmOrAdmin = profile?.role === "gm" || profile?.role === "admin";
  if (!isGmOrAdmin) notFound();

  return (
    <MissionProjectionShell>
      <MissionBoardSection
        campaignId={campaignId}
        isGmOrAdmin={false}
        isAdmin={false}
        isProjection={true}
      />
    </MissionProjectionShell>
  );
}
