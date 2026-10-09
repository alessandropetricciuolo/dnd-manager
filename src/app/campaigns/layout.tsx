import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getForgeAuthContext } from "@/lib/forge/access";
import { getVaultAuthContext } from "@/lib/vault/access";

export const dynamic = "force-dynamic";

export default async function CampaignsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [forgeCtx, vaultCtx] = await Promise.all([
    getForgeAuthContext(),
    getVaultAuthContext(),
  ]);
  if (!forgeCtx) redirect("/login");

  const isAdmin = forgeCtx.isAdmin;
  const isGmOrAdmin = forgeCtx.isGmOrAdmin;

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
