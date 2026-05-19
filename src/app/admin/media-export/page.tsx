import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { DownloadAllImagesButton } from "@/components/media/download-all-images-button";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ImageDown } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminMediaExportPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin" && profile?.role !== "gm") {
    redirect("/dashboard");
  }

  return (
    <div className="min-w-0 p-4 py-10 md:p-8">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <Button asChild variant="ghost" size="sm" className="text-barber-paper/70">
          <Link href={profile?.role === "admin" ? "/admin" : "/dashboard"}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Indietro
          </Link>
        </Button>

        <header className="space-y-2">
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-barber-paper">
            <ImageDown className="h-7 w-7 text-barber-gold" />
            Export immagini
          </h1>
          <p className="text-sm text-barber-paper/70">
            Scarica un archivio ZIP con le immagini salvate nel sito: copertine campagne, wiki, mappe,
            personaggi, note GM, avatar, catalogo e allegati immagine. Solo GM e Admin.
          </p>
        </header>

        <div className="rounded-xl border border-barber-gold/30 bg-barber-dark/80 p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-barber-gold">Intero sito</h2>
            <p className="mt-1 text-sm text-barber-paper/65">
              Tutte le immagini presenti nel database (può richiedere alcuni minuti).
            </p>
          </div>
          <DownloadAllImagesButton size="default" className="border-barber-gold/40" />
        </div>

        <p className="text-xs text-barber-paper/50">
          Per esportare solo una campagna, apri la campagna e usa il pulsante nella Regia Immagini o
          negli strumenti GM.
        </p>
      </div>
    </div>
  );
}
