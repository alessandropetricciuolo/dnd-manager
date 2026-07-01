import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getForgeAuthContext } from "@/lib/forge/access";
import { getVaultAuthContext } from "@/lib/vault/access";
import { getTenantAdapter } from "@/modules/command-center/adapters";

export const dynamic = "force-dynamic";

export default async function CommandCenterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const forgeCtx = await getForgeAuthContext();
  const vaultCtx = await getVaultAuthContext();
  if (!forgeCtx) redirect("/login");

  const supabase = await createSupabaseServerClient();
  const adapter = getTenantAdapter();
  const access = await adapter.assertCanAccessCommandCenter(supabase);
  if (!access.ok) redirect("/dashboard");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", forgeCtx.userId)
    .single();

  const isAdmin = profile?.role === "admin";
  const isGmOrAdmin = profile?.role === "gm" || profile?.role === "admin";

  return (
    <DashboardShell
      isAdmin={isAdmin}
      isGmOrAdmin={isGmOrAdmin}
      hasForgeAccess={forgeCtx.hasForgeAccess}
      hasVaultAccess={vaultCtx?.hasVaultAccess ?? false}
    >
      {children}
    </DashboardShell>
  );
}
