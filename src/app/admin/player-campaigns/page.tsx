import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { Swords } from "lucide-react";
import { PlayerCampaignsTable } from "./player-campaigns-table";

export const dynamic = "force-dynamic";

type PlayerRow = {
  id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  role: string;
};

type CampaignRow = {
  id: string;
  name: string;
  type: "oneshot" | "quest" | "long" | null;
};

type MembershipRow = {
  player_id: string;
  campaign_id: string;
  joined_at: string;
};

export default async function AdminPlayerCampaignsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createSupabaseAdminClient();
  const { data: profileRaw } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const profile = profileRaw as { role?: string } | null;
  if (profile?.role !== "admin") redirect("/dashboard");

  const [{ data: playersRaw }, { data: campaignsRaw }, { data: membershipsRaw }] = await Promise.all([
    admin
      .from("profiles")
      .select("id, display_name, first_name, last_name, nickname, role")
      .eq("role", "player")
      .order("display_name", { ascending: true }),
    admin
      .from("campaigns")
      .select("id, name, type")
      .order("name", { ascending: true }),
    admin
      .from("campaign_members")
      .select("player_id, campaign_id, joined_at"),
  ]);

  const players = (playersRaw ?? []) as PlayerRow[];
  const campaigns = (campaignsRaw ?? []) as CampaignRow[];
  const memberships = (membershipsRaw ?? []) as MembershipRow[];

  return (
    <div className="min-w-0 p-4 py-10 md:p-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <header className="space-y-2">
          <h1 className="flex items-center gap-2 text-xl font-semibold text-barber-paper sm:text-2xl">
            <Swords className="h-6 w-6 text-barber-gold" />
            Campagne Giocate dai Giocatori
          </h1>
          <p className="text-sm text-barber-paper/70">
            Vista unica per controllare e modificare manualmente le campagne giocate, senza entrare nel dossier di ogni giocatore.
          </p>
        </header>

        <PlayerCampaignsTable
          players={players}
          campaigns={campaigns}
          memberships={memberships}
        />
      </div>
    </div>
  );
}
