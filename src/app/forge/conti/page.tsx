import { fetchForgeAccountsWithBalances, fetchForgeAccountMovements } from "@/lib/forge/actions";
import { ForgeAccountsClient } from "@/components/forge/forge-accounts-client";

export const dynamic = "force-dynamic";

export default async function ForgeAccountsPage() {
  const accounts = await fetchForgeAccountsWithBalances();
  const movementsByAccount: Record<string, Awaited<ReturnType<typeof fetchForgeAccountMovements>>> = {};

  await Promise.all(
    accounts.map(async (a) => {
      movementsByAccount[a.id] = await fetchForgeAccountMovements(a.id);
    })
  );

  return <ForgeAccountsClient accounts={accounts} movementsByAccount={movementsByAccount} />;
}
