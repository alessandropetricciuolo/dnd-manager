import { createSupabaseServerClient } from "@/utils/supabase/server";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GamificationAchievementsTab } from "@/components/admin/gamification-achievements-tab";
import { GamificationAvatarsTab } from "@/components/admin/gamification-avatars-tab";
import { GamificationPlayerTab } from "@/components/admin/gamification-player-tab";
import type { Database } from "@/types/database.types";

export const dynamic = "force-dynamic";

type AchievementRow = Database["public"]["Tables"]["achievements"]["Row"];
type AvatarRow = Database["public"]["Tables"]["avatars"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export default async function GamificationAdminPage() {
  const supabase = await createSupabaseServerClient();

  const { data: achievementsRaw } = await supabase
    .from("achievements")
    .select("*")
    .order("created_at", { ascending: true });

  const { data: avatarsRaw } = await supabase
    .from("avatars")
    .select("*")
    .order("created_at", { ascending: true });

  const { data: playersRaw } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, display_name, nickname, role")
    .eq("role", "player")
    .order("created_at", { ascending: true });

  const achievements = (achievementsRaw ?? []) as AchievementRow[];
  const avatars = (avatarsRaw ?? []) as AvatarRow[];
  const players = (playersRaw ?? []) as Pick<
    ProfileRow,
    "id" | "first_name" | "last_name" | "display_name" | "nickname" | "role"
  >[];

  const playerOptions = players.map((p) => {
    const nameParts = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
    const nickname =
      p.nickname?.trim() ||
      p.display_name?.trim() ||
      nameParts ||
      `Giocatore ${p.id.slice(0, 8)}`;
    const fullName =
      nameParts && nickname !== nameParts ? nameParts : "";
    return { id: p.id, nickname, fullName };
  });

  return (
    <div className="min-w-0 p-4 py-10 md:p-8">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-barber-paper sm:text-3xl">
            Gamification
          </h1>
          <p className="text-sm text-barber-paper/70">
            Definisci achievement, avatar sbloccabili e assegna trofei ai giocatori. Queste
            impostazioni alimentano la Classifica Eroi e i profili pubblici.
          </p>
        </header>

        <Tabs defaultValue="achievements" className="w-full">
          <TabsList className="mb-4 inline-flex rounded-lg border border-barber-gold/30 bg-barber-dark/80 p-1 text-xs sm:text-sm">
            <TabsTrigger
              value="achievements"
              className="data-[state=active]:bg-barber-gold/20 data-[state=active]:text-barber-gold text-barber-paper/70"
            >
              Gestione Achievement
            </TabsTrigger>
            <TabsTrigger
              value="avatars"
              className="data-[state=active]:bg-barber-gold/20 data-[state=active]:text-barber-gold text-barber-paper/70"
            >
              Gestione Avatar
            </TabsTrigger>
            <TabsTrigger
              value="players"
              className="data-[state=active]:bg-barber-gold/20 data-[state=active]:text-barber-gold text-barber-paper/70"
            >
              Assegnazione Giocatori
            </TabsTrigger>
          </TabsList>

          <TabsContent value="achievements" className="focus-visible:outline-none">
            <GamificationAchievementsTab achievements={achievements} />
          </TabsContent>

          <TabsContent value="avatars" className="focus-visible:outline-none">
            <GamificationAvatarsTab avatars={avatars} achievements={achievements} />
          </TabsContent>

          <TabsContent value="players" className="focus-visible:outline-none">
            <GamificationPlayerTab players={playerOptions} achievements={achievements} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

