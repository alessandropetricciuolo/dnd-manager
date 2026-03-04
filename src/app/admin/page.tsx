import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreateUserDialog } from "@/components/admin/create-user-dialog";
import { AdminUserRow } from "@/components/admin/admin-user-row";
import { ArrowLeft, Shield } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Uso client admin per ruolo e lista profili: evita ricorsione RLS su profiles
  const admin = createSupabaseAdminClient();
  const { data: myProfileRaw } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const myProfile = myProfileRaw as { role?: string } | null;

  if (myProfile?.role !== "admin") {
    redirect("/dashboard");
  }

  const { data: profilesRaw, error } = await admin
    .from("profiles")
    .select("id, display_name, first_name, last_name, role, created_at")
    .order("created_at", { ascending: false });

  type ProfileRow = {
    id: string;
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
    role: string;
    created_at: string;
  };
  const profiles = (profilesRaw ?? []) as ProfileRow[];

  if (error) {
    return (
      <div className="min-h-screen bg-barber-dark px-4 py-10">
        <div className="mx-auto max-w-4xl">
          <p className="text-red-400">Errore nel caricamento degli utenti.</p>
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="mt-4 text-barber-paper/80">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const list = profiles;

  return (
    <div className="min-h-screen bg-barber-dark px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
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
              <Shield className="h-6 w-6 text-barber-gold" />
              Admin Panel
            </h1>
          </div>
          <CreateUserDialog />
        </header>

        <div className="rounded-xl border border-barber-gold/40 bg-barber-dark/90 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-barber-gold/30 hover:bg-transparent">
                <TableHead className="text-barber-paper/80">Email / Nome</TableHead>
                <TableHead className="text-barber-paper/80">Nome</TableHead>
                <TableHead className="text-barber-paper/80">Cognome</TableHead>
                <TableHead className="text-barber-paper/80">Ruolo attuale</TableHead>
                <TableHead className="text-barber-paper/80">Data iscrizione</TableHead>
                <TableHead className="text-barber-paper/80 text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((p) => (
                <AdminUserRow key={p.id} profile={p} />
              ))}
            </TableBody>
          </Table>
        </div>

        {list.length === 0 && (
          <p className="text-center text-barber-paper/60">Nessun utente trovato.</p>
        )}
      </div>
    </div>
  );
}
