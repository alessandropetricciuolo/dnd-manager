import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/button";
import { GmProfilePublicForm } from "@/components/dashboard/gm-profile-public-form";
import { ArrowLeft, UserCog } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardSettingsProfilePage() {
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
      "role, username, bio, portrait_url, is_gm_public, stat_combat, stat_roleplay, stat_lethality"
    )
    .eq("id", user.id)
    .single();

  const isGmOrAdmin = profile?.role === "gm" || profile?.role === "admin";
  if (!isGmOrAdmin) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-full w-full bg-barber-dark p-4 md:p-8">
      <div className="mx-auto max-w-2xl space-y-6">
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
            <UserCog className="h-6 w-6 text-barber-gold" />
            Profilo pubblico Master
          </h1>
        </header>

        <p className="text-sm text-barber-paper/70">
          Compila il tuo dossier da narratore: ritratto, username, bio e statistiche.
          Se rendi il profilo pubblico, apparirai nell&apos;Albo dei Master e avrai una pagina
          /master/[username].
        </p>

        <div className="rounded-xl border border-barber-gold/30 bg-barber-dark/80 p-6">
          <GmProfilePublicForm
            defaultValues={{
              username: profile?.username ?? null,
              bio: profile?.bio ?? null,
              portrait_url: profile?.portrait_url ?? null,
              is_gm_public: profile?.is_gm_public ?? false,
              stat_combat: profile?.stat_combat ?? 50,
              stat_roleplay: profile?.stat_roleplay ?? 50,
              stat_lethality: profile?.stat_lethality ?? "Media",
            }}
          />
        </div>
      </div>
    </div>
  );
}
