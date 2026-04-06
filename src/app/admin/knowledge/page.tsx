import { redirect } from "next/navigation";
import { BookText } from "lucide-react";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { ManualSemanticSearch } from "@/components/admin/manual-semantic-search";
import { ManualV4IngestControls } from "@/components/admin/manual-v4-ingest-controls";

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

  return (
    <div className="min-w-0 p-4 py-10 md:p-8">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <header className="space-y-2">
          <h1 className="flex items-center gap-2 text-xl font-semibold text-barber-paper sm:text-2xl">
            <BookText className="h-6 w-6 text-barber-gold" />
            Knowledge Base (RAG)
          </h1>
          <p className="text-sm text-barber-paper/70">
            Ricerca sui chunk in <code className="text-barber-paper/80">manuals_knowledge</code> e ingest v4 da{" "}
            <code className="text-barber-paper/80">public/manuals/</code>.
          </p>
        </header>

        <ManualSemanticSearch />

        <ManualV4IngestControls />

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
