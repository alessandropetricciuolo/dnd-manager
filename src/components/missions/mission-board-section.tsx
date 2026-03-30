import { createSupabaseServerClient } from "@/utils/supabase/server";
import { MissionBoard } from "./mission-board";

export type MissionBoardMission = {
  id: string;
  grade: string;
  title: string;
  committente: string;
  ubicazione: string;
  paga: string;
  urgenza: string;
  description: string;
};

export type MissionBoardGuild = {
  id: string;
  name: string;
  grade: number;
  score: number;
};

type MissionBoardSectionProps = {
  campaignId: string;
  isGmOrAdmin: boolean;
};

export async function MissionBoardSection({
  campaignId,
  isGmOrAdmin,
}: MissionBoardSectionProps) {
  const supabase = await createSupabaseServerClient();

  const [{ data: missionsRaw }, { data: guildsRaw }] = await Promise.all([
    supabase
      .from("campaign_missions")
      .select(
        "id, grade, title, committente, ubicazione, paga, urgenza, description"
      )
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false }),
    supabase
      .from("campaign_guilds")
      .select("id, name, grade, score")
      .eq("campaign_id", campaignId)
      .order("score", { ascending: false })
      .order("grade", { ascending: false }),
  ]);

  const missions = (missionsRaw ?? []) as MissionBoardMission[];
  const guilds = (guildsRaw ?? []) as MissionBoardGuild[];

  return (
    <MissionBoard
      campaignId={campaignId}
      missions={missions}
      guilds={guilds}
      isGmOrAdmin={isGmOrAdmin}
    />
  );
}

