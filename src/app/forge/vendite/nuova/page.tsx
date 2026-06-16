import { fetchForgeAccountsWithBalances, fetchForgeProductsWithStock } from "@/lib/forge/actions";
import { ForgeNewSaleClient } from "@/components/forge/forge-new-sale-client";

export const dynamic = "force-dynamic";

export default async function ForgeNewSalePage() {
  const [products, accounts] = await Promise.all([
    fetchForgeProductsWithStock(),
    fetchForgeAccountsWithBalances(true),
  ]);

  return <ForgeNewSaleClient products={products} accounts={accounts} />;
}
