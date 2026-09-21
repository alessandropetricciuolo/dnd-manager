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
      "role, first_name, last_name, date_of_birth, phone, whatsapp_opt_in, notifications_disabled, nickname, avatar_url, is_player_public"
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
    <div className="min-h-screen bg-guild-void text-parchment-100 font-sans p-4 py-10 md:p-8">
      <div className="mx-auto w-full max-w-xl space-y-6">
        <header className="flex items-center justify-between border-b border-guild-border/80 pb-4">
          <Link href="/dashboard">
            <Button
              variant="stone"
              size="sm"
              className="text-xs font-serif uppercase tracking-wider text-brass-light"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
          </Link>
          <div className="text-right">
            <span className="text-[10px] font-serif uppercase tracking-widest text-brass-base">
              ✦ Scheda Personale ✦
            </span>
            <h1 className="font-serif text-2xl font-bold leading-tight text-gold-relief">
              Dossier dell&apos;Eroe
            </h1>
          </div>
        </header>

        {/* Affidabilità al Tavolo */}
        <div className="card-guild-stone relative rounded-2xl p-5 shadow-lg">
          <div className="corner-ornament-tl" />
          <div className="corner-ornament-tr" />
          <div className="corner-ornament-bl" />
          <div className="corner-ornament-br" />

          <h2 className="font-serif text-xs font-bold uppercase tracking-wider text-brass-light mb-3">
            ✦ Affidabilità al Tavolo
          </h2>
          <div className="flex flex-wrap gap-4 text-xs font-mono">
            <span className="inline-flex items-center gap-2 rounded-lg border border-brass-base/30 bg-guild-oak/80 px-3 py-1.5 text-brass-light">
              <UserCheck className="h-4 w-4 text-brass-base" />
              <span>Presente: <strong className="text-brass-light font-bold">{attendedCount ?? 0}</strong> sessioni</span>
            </span>
            <span className="inline-flex items-center gap-2 rounded-lg border border-crimson-base/40 bg-crimson-base/15 px-3 py-1.5 text-crimson-light">
              <UserX className="h-4 w-4 text-crimson-light" />
              <span>Assente: <strong className="font-bold">{absentCount ?? 0}</strong> sessioni</span>
            </span>
          </div>
        </div>

        {/* Campagne Giocate */}
        <div className="card-guild-stone relative rounded-2xl p-5 shadow-lg">
          <div className="corner-ornament-tl" />
          <div className="corner-ornament-tr" />
          <div className="corner-ornament-bl" />
          <div className="corner-ornament-br" />

          <h2 className="font-serif text-xs font-bold uppercase tracking-wider text-brass-light mb-3">
            ✦ Cronache e Campagne Giocate
          </h2>
          {playedCampaigns.length === 0 ? (
            <p className="text-xs text-parchment-400 italic">Nessuna saga registrata al momento.</p>
          ) : (
            <ul className="space-y-2">
              {playedCampaigns.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-guild-border/60 bg-guild-oak/40 p-2.5">
                  <Link href={`/campaigns/${c.id}`} className="font-serif text-sm font-semibold text-parchment-100 hover:text-brass-light transition-colors">
                    {c.name}
                  </Link>
                  <span className="rounded-full border border-brass-base/30 bg-guild-void px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wider text-brass-light">
                    {c.type === "oneshot" ? "Oneshot" : c.type === "quest" ? "Quest" : c.type === "long" ? "Campagna Lunga" : "Campagna"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Bacheca dei Trofei */}
        <section className="card-guild-stone relative rounded-2xl p-6 shadow-lg">
          <div className="corner-ornament-tl" />
          <div className="corner-ornament-tr" />
          <div className="corner-ornament-bl" />
          <div className="corner-ornament-br" />

          <h2 className="font-serif text-xs font-bold uppercase tracking-wider text-brass-light mb-4">
            ✦ Bacheca dei Trofei di Gilda
          </h2>
          <PlayerTrophyBoard
            unlocked={trophyData.unlocked}
            inProgress={trophyData.inProgress}
            locked={trophyData.locked}
          />
        </section>

        {isPlayer ? (
          <div className="card-guild-stone relative rounded-2xl p-6 shadow-lg">
            <div className="corner-ornament-tl" />
            <div className="corner-ornament-tr" />
            <div className="corner-ornament-bl" />
            <div className="corner-ornament-br" />

            <ProfileUnifiedForm
              defaultValues={{
                first_name: profile?.first_name ?? "",
                last_name: profile?.last_name ?? "",
                date_of_birth: profile?.date_of_birth ?? "",
                phone: profile?.phone ?? "",
                whatsapp_opt_in: profile?.whatsapp_opt_in ?? false,
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
            <div className="card-guild-stone relative rounded-2xl p-6 shadow-lg">
              <div className="corner-ornament-tl" />
              <div className="corner-ornament-tr" />
              <div className="corner-ornament-bl" />
              <div className="corner-ornament-br" />

              <ProfileForm
                defaultValues={{
                  first_name: profile?.first_name ?? "",
                  last_name: profile?.last_name ?? "",
                  date_of_birth: profile?.date_of_birth ?? "",
                  phone: profile?.phone ?? "",
                  whatsapp_opt_in: profile?.whatsapp_opt_in ?? false,
                }}
              />
            </div>
            <div className="card-guild-stone relative rounded-2xl p-6 shadow-lg">
              <div className="corner-ornament-tl" />
              <div className="corner-ornament-tr" />
              <div className="corner-ornament-bl" />
              <div className="corner-ornament-br" />

              <h2 className="font-serif text-xs font-bold uppercase tracking-wider text-brass-light mb-3">✦ Preferenze Missive</h2>
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
