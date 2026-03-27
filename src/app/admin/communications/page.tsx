import { redirect } from "next/navigation";
import { Mail } from "lucide-react";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { AdminCommunicationsClient } from "./communications-client";

export const dynamic = "force-dynamic";

export type AdminCommunicationRow = {
  id: string;
  subject: string;
  body_html: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  stats: {
    total: number;
    pending: number;
    sent: number;
    failed: number;
    skipped_no_email: number;
  };
};

export default async function AdminCommunicationsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createSupabaseAdminClient();
  const { data: profileRaw } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const profile = profileRaw as { role?: string } | null;
  if (profile?.role !== "admin") redirect("/dashboard");

  const [{ data: communicationsRaw }, { data: recipientsRaw }] = await Promise.all([
    admin
      .from("admin_communications")
      .select("id, subject, body_html, created_by, created_at, updated_at")
      .order("created_at", { ascending: false }),
    admin
      .from("admin_communication_recipients")
      .select("communication_id, status"),
  ]);

  const recipients = (recipientsRaw ?? []) as Array<{
    communication_id: string;
    status: "pending" | "sent" | "failed" | "skipped_no_email";
  }>;

  const statsByCommunication = new Map<
    string,
    { total: number; pending: number; sent: number; failed: number; skipped_no_email: number }
  >();
  for (const r of recipients) {
    const stats = statsByCommunication.get(r.communication_id) ?? {
      total: 0,
      pending: 0,
      sent: 0,
      failed: 0,
      skipped_no_email: 0,
    };
    stats.total += 1;
    if (r.status === "pending") stats.pending += 1;
    if (r.status === "sent") stats.sent += 1;
    if (r.status === "failed") stats.failed += 1;
    if (r.status === "skipped_no_email") stats.skipped_no_email += 1;
    statsByCommunication.set(r.communication_id, stats);
  }

  const communications = ((communicationsRaw ?? []) as Array<{
    id: string;
    subject: string;
    body_html: string;
    created_by: string;
    created_at: string;
    updated_at: string;
  }>).map((c) => ({
    ...c,
    stats: statsByCommunication.get(c.id) ?? {
      total: 0,
      pending: 0,
      sent: 0,
      failed: 0,
      skipped_no_email: 0,
    },
  })) as AdminCommunicationRow[];

  return (
    <div className="min-w-0 p-4 py-10 md:p-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <header className="space-y-2">
          <h1 className="flex items-center gap-2 text-xl font-semibold text-barber-paper sm:text-2xl">
            <Mail className="h-6 w-6 text-barber-gold" />
            Comunicazioni Email ai Giocatori
          </h1>
          <p className="text-sm text-barber-paper/70">
            Crea comunicazioni HTML, inviale ai giocatori registrati, traccia chi ha ricevuto e reinoltra ai non inviati.
          </p>
        </header>

        <AdminCommunicationsClient initialCommunications={communications} />
      </div>
    </div>
  );
}
