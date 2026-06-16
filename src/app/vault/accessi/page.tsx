import { redirect } from "next/navigation";
import { getVaultAuthContext, listGmUsersForVaultAccess } from "@/lib/vault/access";
import { VaultAccessClient } from "@/components/vault/vault-access-client";

export const dynamic = "force-dynamic";

export default async function VaultAccessPage() {
  const ctx = await getVaultAuthContext();
  if (!ctx?.isAdmin) redirect("/vault");

  const gms = await listGmUsersForVaultAccess();
  return <VaultAccessClient gms={gms} />;
}
