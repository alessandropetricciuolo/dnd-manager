import { redirect } from "next/navigation";
import { getVaultAuthContext } from "@/lib/vault/access";
import { VaultShell } from "@/components/vault/vault-shell";

export const dynamic = "force-dynamic";

export default async function VaultLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getVaultAuthContext();
  if (!ctx) redirect("/login");
  if (!ctx.hasVaultAccess) redirect("/dashboard?vault=denied");

  return <VaultShell isAdmin={ctx.isAdmin}>{children}</VaultShell>;
}
