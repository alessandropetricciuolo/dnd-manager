import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { BookText } from "lucide-react";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { ingestAllTxtManualsAction, ingestTxtManualAction } from "@/lib/actions/ingest-manuals";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type KnowledgePageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function AdminKnowledgePage({ searchParams }: KnowledgePageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createSupabaseAdminClient();
  const { data: myProfileRaw } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const myProfile = myProfileRaw as { role?: string } | null;
  if (myProfile?.role !== "admin") redirect("/dashboard");

  const status = typeof searchParams?.status === "string" ? searchParams.status : null;
  const message = typeof searchParams?.message === "string" ? searchParams.message : null;

  async function runManualIngest() {
    "use server";
    const result = await ingestTxtManualAction("manuale_base.txt", {
      source: "Manuale Giocatore",
    });
    revalidatePath("/admin/knowledge");
    const nextStatus = result.success ? "ok" : "error";
    const nextMessage = result.success
      ? `Ingestion completata: ${result.inserted} nuovi chunk, ${result.skipped} duplicati saltati, su ${result.chunks} chunk totali.`
      : result.message;
    redirect(`/admin/knowledge?status=${encodeURIComponent(nextStatus)}&message=${encodeURIComponent(nextMessage)}`);
  }

  async function runAllManualsIngest() {
    "use server";
    const result = await ingestAllTxtManualsAction({ source_type: "txt-manual" });
    revalidatePath("/admin/knowledge");
    const nextStatus = result.success ? "ok" : "error";
    const nextMessage = result.success
      ? `Ingestion completata: file ${result.files}, nuovi chunk ${result.inserted}, duplicati saltati ${result.skipped}, chunk processati ${result.chunks}.`
      : result.message;
    redirect(`/admin/knowledge?status=${encodeURIComponent(nextStatus)}&message=${encodeURIComponent(nextMessage)}`);
  }

  return (
    <div className="min-w-0 p-4 py-10 md:p-8">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <header className="space-y-2">
          <h1 className="flex items-center gap-2 text-xl font-semibold text-barber-paper sm:text-2xl">
            <BookText className="h-6 w-6 text-barber-gold" />
            Knowledge Base (RAG)
          </h1>
          <p className="text-sm text-barber-paper/70">
            Ingestion manuali `.txt` da `public/manuals/` con embeddings via runtime Hugging Face (allineati alla query) in `manuals_knowledge`.
          </p>
        </header>

        <div className="rounded-xl border border-barber-gold/30 bg-barber-dark/80 p-4">
          <div className="space-y-4">
            <form action={runManualIngest} className="space-y-3">
              <p className="text-sm text-barber-paper/80">
                File target: <code>manuale_base.txt</code> — metadata: <code>{`{ source: "Manuale Giocatore" }`}</code>
              </p>
              <Button type="submit" className="bg-barber-red text-barber-paper hover:bg-barber-red/90">
                Elabora Manuale di Base.txt
              </Button>
            </form>

            <form action={runAllManualsIngest} className="space-y-3 border-t border-barber-gold/20 pt-4">
              <p className="text-sm text-barber-paper/80">
                Esegue ingest v2 su tutti i file <code>.txt</code> presenti in <code>public/manuals</code> (o fallback <code>dnd-manager/public/manuals</code>).
              </p>
              <Button type="submit" variant="outline" className="border-barber-gold/40 text-barber-paper hover:bg-barber-gold/10">
                Elabora tutti i manuali .txt
              </Button>
            </form>
          </div>
        </div>

        {status && message && (
          <div
            className={`rounded-md border p-3 text-sm ${
              status === "ok"
                ? "border-green-500/30 bg-green-950/30 text-green-200"
                : "border-red-500/30 bg-red-950/30 text-red-200"
            }`}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
