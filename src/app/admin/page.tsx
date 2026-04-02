import { redirect } from "next/navigation";
import Link from "next/link";
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
import { BackupDriveImagesButton } from "@/components/admin/backup-drive-images-button";
import { Palette, Shield, BarChart3, Mail, BookText } from "lucide-react";
import { Button } from "@/components/ui/button";

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
        <BackupDriveImagesButton />
        <div className="rounded-xl border border-barber-gold/30 bg-barber-dark/80 p-4">
          <h2 className="mb-2 text-base font-semibold text-barber-gold">Manuali D&D (RAG)</h2>
          <p className="mb-3 text-sm text-barber-paper/70">
            Ingest dei testi e ricerca semantica sui manuali italiani (es. incantesimi e regole).
          </p>
          <Button asChild variant="outline" className="border-barber-gold/40 text-barber-paper/90">
            <Link href="/admin/knowledge">
              <BookText className="mr-2 h-4 w-4" />
              Apri Knowledge manuali
            </Link>
          </Button>
        </div>
        <div className="rounded-xl border border-barber-gold/30 bg-barber-dark/80 p-4">
          <h2 className="mb-2 text-base font-semibold text-barber-gold">Stili Immagini AI Globali</h2>
          <p className="mb-3 text-sm text-barber-paper/70">
            Gestisci i 5/6 stili globali da riutilizzare in tutte le campagne.
          </p>
          <Button asChild variant="outline" className="border-barber-gold/40 text-barber-paper/90">
            <Link href="/admin/ai-image-styles">
              <Palette className="mr-2 h-4 w-4" />
              Apri Stili AI
            </Link>
          </Button>
        </div>
        <div className="rounded-xl border border-barber-gold/30 bg-barber-dark/80 p-4">
          <h2 className="mb-2 text-base font-semibold text-barber-gold">Statistiche e Feedback</h2>
          <p className="mb-3 text-sm text-barber-paper/70">
            Visualizza medie stelle per campagna, media globale e feedback testuali ricevuti dai giocatori.
          </p>
          <Button asChild variant="outline" className="border-barber-gold/40 text-barber-paper/90">
            <Link href="/admin/feedback-statistics">
              <BarChart3 className="mr-2 h-4 w-4" />
              Apri Statistiche Feedback
            </Link>
          </Button>
        </div>
        <div className="rounded-xl border border-barber-gold/30 bg-barber-dark/80 p-4">
          <h2 className="mb-2 text-base font-semibold text-barber-gold">Comunicazioni Email ai Giocatori</h2>
          <p className="mb-3 text-sm text-barber-paper/70">
            Crea newsletter/eventi in HTML, traccia invii per giocatore e reinoltra solo ai non inviati.
          </p>
          <Button asChild variant="outline" className="border-barber-gold/40 text-barber-paper/90">
            <Link href="/admin/communications">
              <Mail className="mr-2 h-4 w-4" />
              Apri Comunicazioni
            </Link>
          </Button>
        </div>

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
