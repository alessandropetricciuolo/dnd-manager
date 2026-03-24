import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/button";
import { ProfileForm } from "@/components/profile/profile-form";
import { ProfileUnifiedForm } from "@/components/profile/profile-unified-form";
import { ChangePasswordForm } from "@/components/profile/change-password-form";
import { NotificationPreferenceForm } from "@/components/profile/notification-preference-form";
import { getAvatarGalleryData } from "@/lib/avatar-gallery";
import { getTrophyDataForPlayer } from "@/lib/trophy-data";
import { PlayerTrophyBoard } from "@/components/profile/player-trophy-board";
import { ArrowLeft, User, UserCheck, UserX } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "role, first_name, last_name, date_of_birth, phone, notifications_disabled, nickname, avatar_url, is_player_public"
    )
    .eq("id", user.id)
    .single();

  const { count: attendedCount } = await supabase
    .from("session_signups")
    .select("id", { count: "exact", head: true })
    .eq("player_id", user.id)
    .eq("status", "attended");
  const { count: absentCount } = await supabase
    .from("session_signups")
    .select("id", { count: "exact", head: true })
    .eq("player_id", user.id)
    .eq("status", "absent");

  const { data: memberRows } = await supabase
    .from("campaign_members")
    .select("campaign_id, joined_at")
    .eq("player_id", user.id)
    .order("joined_at", { ascending: false });
  const membershipRows = (memberRows ?? []) as { campaign_id: string; joined_at: string }[];
  const playedCampaignIds = [...new Set(membershipRows.map((r) => r.campaign_id))];
  let playedCampaigns: Array<{ id: string; name: string; type: "oneshot" | "quest" | "long" | null }> = [];
  if (playedCampaignIds.length > 0) {
    const { data: campaignsData } = await supabase
      .from("campaigns")
      .select("id, name, type")
      .in("id", playedCampaignIds);
    playedCampaigns = (campaignsData ?? []) as Array<{ id: string; name: string; type: "oneshot" | "quest" | "long" | null }>;
  }

  const isPlayer = profile?.role === "player";
  const avatarGalleryData = isPlayer ? await getAvatarGalleryData(user.id) : null;
  const trophyData = await getTrophyDataForPlayer(user.id);

  return (
    <div className="min-h-screen bg-barber-dark p-4 py-10 md:p-8">
      <div className="mx-auto w-full max-w-xl space-y-6">
        <header className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button
              variant="ghost"
              size="sm"
              className="text-barber-paper/80 hover:text-barber-paper"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
          </Link>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-barber-paper sm:text-2xl">
            <User className="h-6 w-6 text-barber-gold" />
            Il tuo profilo
          </h1>
        </header>

        <div className="rounded-xl border border-barber-gold/30 bg-barber-dark/80 p-4 mb-6">
          <h2 className="text-sm font-medium text-barber-paper/70 mb-2">Affidabilità</h2>
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="flex items-center gap-2 text-barber-gold">
              <UserCheck className="h-4 w-4" />
              Presente: {attendedCount ?? 0} sessioni
            </span>
            <span className="flex items-center gap-2 text-red-300/90">
              <UserX className="h-4 w-4" />
              Assente: {absentCount ?? 0} sessioni
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-barber-gold/30 bg-barber-dark/80 p-4 mb-6">
          <h2 className="text-sm font-medium text-barber-paper/70 mb-2">Campagne giocate</h2>
          {playedCampaigns.length === 0 ? (
            <p className="text-sm text-barber-paper/60">Nessuna campagna registrata al momento.</p>
          ) : (
            <ul className="space-y-2">
              {playedCampaigns.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-2">
                  <Link href={`/campaigns/${c.id}`} className="text-barber-gold hover:underline">
                    {c.name}
                  </Link>
                  <span className="rounded-full border border-barber-gold/30 px-2 py-0.5 text-xs text-barber-paper/70">
                    {c.type === "oneshot" ? "Oneshot" : c.type === "quest" ? "Quest" : c.type === "long" ? "Campagna Lunga" : "Campagna"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <section className="rounded-xl border border-barber-gold/30 bg-barber-dark/80 p-6">
          <h2 className="text-sm font-medium text-barber-paper/90 mb-4">Bacheca dei Trofei</h2>
          <PlayerTrophyBoard
            unlocked={trophyData.unlocked}
            inProgress={trophyData.inProgress}
            locked={trophyData.locked}
          />
        </section>

        {isPlayer ? (
          <div className="rounded-xl border border-barber-gold/30 bg-barber-dark/80 p-6">
            <ProfileUnifiedForm
              defaultValues={{
                first_name: profile?.first_name ?? "",
                last_name: profile?.last_name ?? "",
                date_of_birth: profile?.date_of_birth ?? "",
                phone: profile?.phone ?? "",
                nickname: profile?.nickname ?? null,
                avatar_url: profile?.avatar_url ?? null,
                is_player_public: profile?.is_player_public ?? true,
                notifications_disabled: profile?.notifications_disabled ?? false,
              }}
              avatarGallery={avatarGalleryData}
            />
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-barber-gold/30 bg-barber-dark/80 p-6">
              <ProfileForm
                defaultValues={{
                  first_name: profile?.first_name ?? "",
                  last_name: profile?.last_name ?? "",
                  date_of_birth: profile?.date_of_birth ?? "",
                  phone: profile?.phone ?? "",
                }}
              />
            </div>
            <div className="rounded-xl border border-barber-gold/30 bg-barber-dark/80 p-6">
              <h2 className="text-sm font-medium text-barber-paper/70 mb-3">Preferenze</h2>
              <NotificationPreferenceForm
                notificationsDisabled={profile?.notifications_disabled ?? false}
              />
            </div>
          </>
        )}

        <ChangePasswordForm />
      </div>
    </div>
  );
}
