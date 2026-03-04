import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/button";
import { ProfileForm } from "@/components/profile/profile-form";
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
    .select("first_name, last_name, date_of_birth, phone")
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-900 px-4 py-10">
      <div className="mx-auto max-w-xl space-y-6">
        <header className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-300 hover:text-slate-50"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
          </Link>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-50 sm:text-2xl">
            <User className="h-6 w-6 text-emerald-400" />
            Il tuo profilo
          </h1>
        </header>

        <div className="rounded-xl border border-slate-700/60 bg-slate-950/70 p-4 mb-6">
          <h2 className="text-sm font-medium text-slate-400 mb-2">Affidabilità</h2>
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="flex items-center gap-2 text-emerald-300">
              <UserCheck className="h-4 w-4" />
              Presente: {attendedCount ?? 0} sessioni
            </span>
            <span className="flex items-center gap-2 text-red-300/90">
              <UserX className="h-4 w-4" />
              Assente: {absentCount ?? 0} sessioni
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-emerald-700/50 bg-slate-950/70 p-6">
          <ProfileForm
            defaultValues={{
              first_name: profile?.first_name ?? "",
              last_name: profile?.last_name ?? "",
              date_of_birth: profile?.date_of_birth ?? "",
              phone: profile?.phone ?? "",
            }}
          />
        </div>
      </div>
    </div>
  );
}
