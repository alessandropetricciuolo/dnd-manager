import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/button";
import { ProfileForm } from "@/components/profile/profile-form";
import { ProfileUnifiedForm } from "@/components/profile/profile-unified-form";
import { ChangePasswordForm } from "@/components/profile/change-password-form";
import { NotificationPreferenceForm } from "@/components/profile/notification-preference-form";
import { getAvatarGalleryData } from "@/lib/avatar-gallery";
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

  const isPlayer = profile?.role === "player";
  const avatarGalleryData = isPlayer ? await getAvatarGalleryData(user.id) : null;

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
