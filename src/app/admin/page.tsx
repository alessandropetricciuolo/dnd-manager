import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreateUserDialog } from "@/components/admin/create-user-dialog";
import { AdminUserRow } from "@/components/admin/admin-user-row";
import { NotificationsPausedToggle } from "@/components/admin/notifications-paused-toggle";
import { Shield } from "lucide-react";

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
      <div className="px-4 py-10">
        <div className="mx-auto max-w-4xl">
          <p className="text-red-400">Errore nel caricamento degli utenti.</p>
        </div>
      </div>
    );
  }

  const list = profiles;

  return (
    <div className="min-w-0 p-4 py-10 md:p-8">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="flex min-w-0 items-center gap-2 break-words text-xl font-semibold text-barber-paper sm:text-2xl">
            <Shield className="h-6 w-6 text-barber-gold" />
            Utenti
          </h1>
          <CreateUserDialog />
        </header>

        <NotificationsPausedToggle />

        <div className="min-w-0 overflow-x-auto rounded-xl border border-barber-gold/40 bg-barber-dark/90">
          <Table className="min-w-[600px]">
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
