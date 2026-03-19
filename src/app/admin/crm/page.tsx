import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { BookOpen } from "lucide-react";
import { LeadsCrmTable } from "@/components/admin/leads-crm-table";
import { ExportCsvButton } from "@/components/admin/export-csv-button";

export const dynamic = "force-dynamic";

export type LeadRow = {
  id: string;
  name: string;
  email: string;
  experience_level: string | null;
  source: string | null;
  marketing_opt_in: boolean;
  status: "new" | "contacted" | "converted" | "archived";
  created_at: string;
};

export default async function AdminCrmPage() {
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

  const { data: leadsRaw, error } = await admin
    .from("leads")
    .select("id, name, email, experience_level, source, marketing_opt_in, status, created_at")
    .order("created_at", { ascending: false });

  const leads = (leadsRaw ?? []) as LeadRow[];

  if (error) {
    return (
      <div className="p-4 py-10">
        <div className="mx-auto max-w-5xl">
          <p className="text-red-400">Errore nel caricamento delle reclute.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 p-4 py-10 md:p-8">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="flex min-w-0 items-center gap-2 break-words text-xl font-semibold text-barber-paper sm:text-2xl">
            <BookOpen className="h-6 w-6 text-barber-gold" />
            Libro Mastro delle Reclute
          </h1>
          <div className="flex items-center gap-3">
            <p className="text-sm text-barber-paper/70">
              {leads.length} {leads.length === 1 ? "contatto" : "contatti"}
            </p>
            <ExportCsvButton data={leads} />
          </div>
        </header>

        <LeadsCrmTable leads={leads} />
      </div>
    </div>
  );
}
