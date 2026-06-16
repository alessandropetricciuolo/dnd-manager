import { fetchVaultAccountsWithBalances, fetchVaultAccountMovements } from "@/lib/vault/actions";
import { VaultAccountsClient } from "@/components/vault/vault-accounts-client";

export const dynamic = "force-dynamic";

export default async function VaultAccountsPage() {
  const accounts = await fetchVaultAccountsWithBalances();
  const movementsByAccount: Record<string, Awaited<ReturnType<typeof fetchVaultAccountMovements>>> = {};

  await Promise.all(
    accounts.map(async (a) => {
      movementsByAccount[a.id] = await fetchVaultAccountMovements(a.id);
    })
  );

  return <VaultAccountsClient accounts={accounts} movementsByAccount={movementsByAccount} />;
}
