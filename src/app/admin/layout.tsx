import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, FileJson, Trophy, BookOpen, Palette, Swords, BarChart3 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const admin = createSupabaseAdminClient();
  const { data: profileRaw } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const profile = profileRaw as { role?: string } | null;

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-barber-dark">
      <nav className="sticky top-0 z-10 border-b border-barber-gold/30 bg-barber-dark/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-4 py-3">
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
          <Link href="/admin">
            <Button
              variant="ghost"
              size="sm"
              className="text-barber-paper/80 hover:text-barber-paper"
            >
              <Shield className="mr-2 h-4 w-4" />
              Utenti
            </Button>
          </Link>
          <Link href="/admin/crm">
            <Button
              variant="ghost"
              size="sm"
              className="text-barber-paper/80 hover:text-barber-paper"
            >
              <BookOpen className="mr-2 h-4 w-4" />
              Reclute
            </Button>
          </Link>
          <Link href="/admin/player-campaigns">
            <Button
              variant="ghost"
              size="sm"
              className="text-barber-paper/80 hover:text-barber-paper"
            >
              <Swords className="mr-2 h-4 w-4" />
              Campagne Giocate
            </Button>
          </Link>
          <Link href="/admin/feedback-statistics">
            <Button
              variant="ghost"
              size="sm"
              className="text-barber-paper/80 hover:text-barber-paper"
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              Statistiche Feedback
            </Button>
          </Link>
          <Link href="/admin/gamification">
            <Button
              variant="ghost"
              size="sm"
              className="text-barber-paper/80 hover:text-barber-paper"
            >
              <Trophy className="mr-2 h-4 w-4" />
              Gamification
            </Button>
          </Link>
          <Link href="/admin/import">
            <Button
              variant="ghost"
              size="sm"
              className="text-barber-paper/80 hover:text-barber-paper"
            >
              <FileJson className="mr-2 h-4 w-4" />
              Importa Campagna
            </Button>
          </Link>
          <Link href="/admin/ai-image-styles">
            <Button
              variant="ghost"
              size="sm"
              className="text-barber-paper/80 hover:text-barber-paper"
            >
              <Palette className="mr-2 h-4 w-4" />
              Stili AI
            </Button>
          </Link>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
}
